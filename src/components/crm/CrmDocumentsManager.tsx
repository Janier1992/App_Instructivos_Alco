'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  UploadCloud,
  FileCheck,
  Trash2,
  BookOpen,
  Sparkles,
  FilePlus,
  AlertCircle
} from 'lucide-react';
import {
  CustomRagDocument,
  RagDocumentType,
  RAG_DOCUMENT_TYPE_LABELS,
  RAG_DOCUMENT_TYPE_ORDER,
  GENERAL_DOCS_SLUG
} from '@/src/lib/ragDocumentTypes';
import { getSupabaseBrowserClient } from '@/src/lib/supabaseBrowserClient';
import { ProcessPicker } from './ProcessPicker';
import { useCrmSession } from './CrmSessionContext';
import { RagDocumentFolders } from '../RagDocumentFolders';
import { PdfPreviewModal } from '../PdfPreviewModal';

// Por encima de esto, el PDF se sube directo a Supabase Storage desde el
// navegador en vez de mandarlo en el body del POST — las funciones
// serverless de Vercel rechazan requests de más de 4.5 MB antes de que
// lleguen al código de la ruta (límite de la plataforma, no configurable).
const DIRECT_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024;

interface CrmDocumentsManagerProps {
  /** Si se indica, el módulo solo gestiona ese tipo de documento: oculta el
   * selector de tipo, sube siempre con ese tipo y solo lista los de ese tipo
   * (ej. 'instructivo' para el módulo Instructivos de Control). */
  fixedType?: RagDocumentType;
}

export const CrmDocumentsManager: React.FC<CrmDocumentsManagerProps> = ({ fixedType }) => {
  const { role } = useCrmSession();
  const [processSlug, setProcessSlug] = useState('');
  const [ragDocs, setRagDocs] = useState<CustomRagDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitleInput, setUploadTitleInput] = useState('');
  const [selectedType, setSelectedType] = useState<RagDocumentType | ''>('');
  const documentType = fixedType ?? selectedType;
  const isFixed = !!fixedType;
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [previewingDoc, setPreviewingDoc] = useState<CustomRagDocument | null>(null);
  const isUploadingRef = useRef(false);

  const loadRagDocs = useCallback(async () => {
    if (!processSlug) return;
    try {
      const typeQuery = fixedType ? `&type=${fixedType}` : '';
      const res = await fetch(`/api/rag/documents?processSlug=${encodeURIComponent(processSlug)}${typeQuery}`);
      const data = await res.json();
      if (data.success) {
        setRagDocs(data.documents || []);
      }
    } catch (err) {
      console.error('Error cargando documentos RAG:', err);
    }
  }, [processSlug, fixedType]);

  useEffect(() => {
    loadRagDocs();
  }, [loadRagDocs]);

  const handleUploadPdf = async () => {
    if (isUploadingRef.current) return;

    if (!selectedFile) {
      setUploadMsg('⚠️ Por favor selecciona un archivo PDF válido.');
      return;
    }
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setUploadMsg('⚠️ El archivo seleccionado debe estar en formato PDF.');
      return;
    }
    if (!documentType) {
      setUploadMsg('⚠️ Selecciona el tipo de documento (instructivo, manual, ficha técnica o ficha de troquelado).');
      return;
    }

    isUploadingRef.current = true;
    setIsUploading(true);

    try {
      const title = uploadTitleInput || selectedFile.name.replace(/\.pdf$/i, '');
      let data: any;
      let res: Response;

      if (selectedFile.size > DIRECT_UPLOAD_THRESHOLD_BYTES) {
        // Archivo grande: se sube directo a Supabase Storage desde el
        // navegador (bypass del límite de 4.5 MB de Vercel) y luego se le
        // pide al servidor que lo procese (extraer texto + embeddings).
        setUploadMsg('⏳ Subiendo archivo grande directo a almacenamiento...');
        const urlRes = await fetch('/api/crm/documents/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: selectedFile.name, processSlug })
        });
        const urlData = await urlRes.json();
        if (!urlRes.ok || !urlData.success) {
          throw new Error(urlData.error || 'No se pudo iniciar la carga del archivo.');
        }

        const supabase = getSupabaseBrowserClient();
        if (!supabase) {
          throw new Error('La carga de archivos grandes no está disponible: falta configuración del servidor (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY).');
        }
        const { error: uploadError } = await supabase.storage
          .from('rag-pdfs')
          .uploadToSignedUrl(urlData.storagePath, urlData.token, selectedFile, { contentType: 'application/pdf' });
        if (uploadError) {
          throw new Error(uploadError.message);
        }

        setUploadMsg('⏳ Extrayendo texto e indexando el PDF para el motor RAG...');
        res = await fetch('/api/crm/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            docId: urlData.docId,
            storagePath: urlData.storagePath,
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            processSlug,
            title,
            documentType
          })
        });
      } else {
        setUploadMsg('⏳ Subiendo y extrayendo texto del PDF para el motor RAG...');
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('processSlug', processSlug);
        formData.append('title', title);
        formData.append('documentType', documentType);
        res = await fetch('/api/crm/documents', { method: 'POST', body: formData });
      }

      const resContentType = res.headers.get('content-type') || '';
      data = resContentType.includes('application/json')
        ? await res.json()
        : { error: `Respuesta inesperada del servidor (${res.status}).` };

      if (res.ok && data.success) {
        if (data.isDuplicate) {
          setUploadMsg(`⚠️ El documento "${selectedFile.name}" ya existe en la lista de documentos de este proceso. No se cargó una copia duplicada.`);
        } else if (data.persistedToSupabase === false) {
          setUploadMsg(`⚠️ PDF "${selectedFile.name}" procesado, pero no se pudo guardar en Supabase — se perderá si el servidor se reinicia.`);
        } else {
          setUploadMsg(`✅ ¡Éxito! PDF "${selectedFile.name}" procesado e indexado en el motor RAG.`);
        }
        setSelectedFile(null);
        setUploadTitleInput('');
        setSelectedType('');
        await loadRagDocs();
      } else {
        setUploadMsg(`❌ Error: ${data.error || 'No se pudo procesar el PDF.'}`);
      }
    } catch (err: any) {
      setUploadMsg(`❌ Error al subir archivo: ${err.message}`);
    } finally {
      isUploadingRef.current = false;
      setIsUploading(false);
    }
  };

  const handleDeletePdfDoc = async (docId: string) => {
    if (!confirm('¿Estás seguro de eliminar este PDF del motor RAG? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`/api/crm/documents/${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadRagDocs();
      } else {
        alert(data.error || 'No se pudo eliminar el documento.');
      }
    } catch (err) {
      console.error('Error al eliminar PDF:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            {isFixed ? 'Instructivos de Control' : 'Administración de Documentos'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isFixed
              ? 'Sube o elimina el instructivo de control de cada proceso. Se publica en el módulo "Instructivos de Control" de la app.'
              : 'Sube o elimina PDFs indexados por el motor RAG, por proceso.'}
          </p>
        </div>
        <ProcessPicker value={processSlug} onChange={setProcessSlug} includeGeneral={isFixed} defaultSlug={isFixed ? GENERAL_DOCS_SLUG : undefined} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  {isFixed ? 'Instructivos de esta carpeta' : 'Documentación PDF de este Proceso'}
                </h3>
                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  Indexación Automática
                </span>
              </div>
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
            📚 Documentos: <strong className="text-purple-700">{ragDocs.length}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* FORMULARIO DE SUBIDA */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">
              <UploadCloud className="w-4 h-4 text-purple-600" />
              <span>{isFixed ? 'Subir Instructivo de Control (PDF)' : 'Subir Nuevo Documento PDF'}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">{isFixed ? 'Carpeta de destino:' : 'Sección / Proceso de destino:'}</label>
                <ProcessPicker
                  value={processSlug}
                  onChange={setProcessSlug}
                  includeGeneral={isFixed}
                  defaultSlug={isFixed ? GENERAL_DOCS_SLUG : undefined}
                  className="w-full bg-white border border-purple-300 rounded-xl px-3 py-2 text-sm font-bold text-[#003366] focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  {isFixed
                    ? 'Elige "Instructivos Generales" para los instructivos principales, o un área para su carpeta en el módulo Instructivos de Control.'
                    : 'Este documento solo se mostrará y será consultado por el agente IA en esta sección — no en las demás.'}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Título Personalizado (Opcional):</label>
                <input
                  type="text"
                  placeholder="Ej: Manual Técnico de Tronzadoras Alco 2026"
                  value={uploadTitleInput}
                  onChange={(e) => setUploadTitleInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {!isFixed && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tipo de Documento:</label>
                  <select
                    value={documentType}
                    onChange={(e) => setSelectedType(e.target.value as RagDocumentType)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Selecciona un tipo...</option>
                    {RAG_DOCUMENT_TYPE_ORDER.map(type => (
                      <option key={type} value={type}>{RAG_DOCUMENT_TYPE_LABELS[type]}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Define en qué carpeta aparecerá este documento dentro de la Documentación del Proceso.
                  </p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Seleccionar Archivo PDF:</label>
                <div className="border-2 border-dashed border-purple-300 bg-purple-50/50 hover:bg-purple-50 rounded-xl p-4 text-center cursor-pointer transition relative">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <FilePlus className="w-8 h-8 text-purple-600 mx-auto mb-1" />
                  {selectedFile ? (
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-purple-900 truncate">{selectedFile.name}</p>
                      <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-semibold text-purple-800">Haz clic o arrastra un archivo PDF aquí</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Máximo 60MB</p>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleUploadPdf}
                disabled={isUploading || !selectedFile || !processSlug || !documentType}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isUploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span>{isUploading ? 'Procesando e Indexando PDF...' : 'Indexar PDF en Motor RAG'}</span>
              </button>

              {uploadMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${
                  uploadMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
                  uploadMsg.startsWith('⏳') ? 'bg-purple-50 text-purple-900 border-purple-200' : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  {uploadMsg}
                </div>
              )}
            </div>
          </div>

          {/* LISTA DE DOCUMENTOS */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>{isFixed ? 'Instructivos Publicados' : 'Documentos PDF Indexados'}</span>
              </div>
              <button
                onClick={loadRagDocs}
                className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Actualizar
              </button>
            </div>

            {ragDocs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">{isFixed ? 'No hay instructivos cargados todavía en esta carpeta.' : 'No hay archivos PDF cargados todavía para este proceso.'}</p>
              </div>
            ) : (
              <RagDocumentFolders
                documents={ragDocs}
                onView={setPreviewingDoc}
                renderExtraActions={(doc) => role === 'administrador' ? (
                  <button
                    onClick={() => handleDeletePdfDoc(doc.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                    title="Eliminar PDF"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              />
            )}
          </div>
        </div>
      </div>

      {previewingDoc && <PdfPreviewModal doc={previewingDoc} onClose={() => setPreviewingDoc(null)} />}
    </div>
  );
};
