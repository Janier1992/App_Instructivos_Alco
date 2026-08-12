'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  FileText,
  UploadCloud,
  FileCheck,
  Trash2,
  Eye,
  BookOpen,
  Sparkles,
  FilePlus,
  AlertCircle,
  X
} from 'lucide-react';
import { CustomRagDocument } from '../lib/customRagStore';

interface ProcessDocumentsPanelProps {
  processSlug: string;
}

export const ProcessDocumentsPanel: React.FC<ProcessDocumentsPanelProps> = ({ processSlug }) => {
  const [ragDocs, setRagDocs] = useState<CustomRagDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitleInput, setUploadTitleInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [previewingDoc, setPreviewingDoc] = useState<CustomRagDocument | null>(null);
  const [showExtractedText, setShowExtractedText] = useState(false);

  const loadRagDocs = useCallback(async () => {
    try {
      const res = await fetch(`/api/rag/documents?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (data.success) {
        setRagDocs(data.documents || []);
      }
    } catch (err) {
      console.error('Error cargando documentos RAG:', err);
    }
  }, [processSlug]);

  useEffect(() => {
    loadRagDocs();
  }, [loadRagDocs]);

  const handleUploadPdf = async () => {
    if (!selectedFile) {
      setUploadMsg('⚠️ Por favor selecciona un archivo PDF válido.');
      return;
    }

    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setUploadMsg('⚠️ El archivo seleccionado debe estar en formato PDF.');
      return;
    }

    setIsUploading(true);
    setUploadMsg('⏳ Subiendo y extrayendo texto del PDF para el motor RAG...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('processSlug', processSlug);
      formData.append('title', uploadTitleInput || selectedFile.name.replace(/\.pdf$/i, ''));

      const res = await fetch('/api/rag/upload-pdf', {
        method: 'POST',
        body: formData
      });

      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json')
        ? await res.json()
        : { error: `Respuesta inesperada del servidor (${res.status}). Intenta con un archivo más pequeño.` };

      if (res.ok && data.success) {
        if (data.persistedToSupabase === false) {
          setUploadMsg(`⚠️ PDF "${selectedFile.name}" procesado, pero no se pudo guardar en Supabase — se perderá si el servidor se reinicia. Revisa que el script db/schema.sql esté actualizado.`);
        } else {
          setUploadMsg(`✅ ¡Éxito! PDF "${selectedFile.name}" procesado e indexado en el motor RAG.`);
        }
        setSelectedFile(null);
        setUploadTitleInput('');
        await loadRagDocs();
      } else {
        setUploadMsg(`❌ Error: ${data.error || 'No se pudo procesar el PDF.'}`);
      }
    } catch (err: any) {
      setUploadMsg(`❌ Error al subir archivo: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePdfDoc = async (docId: string) => {
    if (!confirm('¿Estás seguro de eliminar este PDF del motor RAG?')) return;
    try {
      const res = await fetch(`/api/rag/documents/${docId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadRagDocs();
      }
    } catch (err) {
      console.error('Error al eliminar PDF:', err);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">Documentación PDF de este Proceso</h3>
              <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-600" />
                Indexación Automática
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sube manuales técnicos, normas o fichas de este proceso en PDF. Se indexan automáticamente para que el
              agente IA responda con base en su contenido.
            </p>
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
            <span>Subir Nuevo Documento PDF</span>
          </div>

          <div className="space-y-3">
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
              disabled={isUploading || !selectedFile}
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
              <span>Documentos PDF Indexados</span>
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
              <p className="text-xs font-semibold text-slate-600">No hay archivos PDF cargados todavía para este proceso.</p>
              <p className="text-[11px] text-slate-400">Sube un documento técnico a la izquierda para incorporarlo al agente IA.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
                    <th className="py-2 px-3 font-bold whitespace-nowrap">Fecha</th>
                    <th className="py-2 px-3 font-bold">Documento</th>
                    <th className="py-2 px-3 font-bold text-right whitespace-nowrap">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ragDocs.map((doc) => (
                    <tr key={doc.id} className="align-top hover:bg-slate-50/60">
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-medium">
                        {new Date(doc.uploadedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        <span className="block text-[10px] text-slate-400">
                          {new Date(doc.uploadedAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-3 px-3 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 truncate">{doc.title}</span>
                          <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            {doc.code}
                          </span>
                          {doc.chunkCount > 0 ? (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                              🔎 Indexado ({doc.chunkCount})
                            </span>
                          ) : (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap" title="Conecta Supabase para indexación semántica; por ahora se usa el texto completo del PDF.">
                              ⚠️ Solo texto completo
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap mt-1">
                          <span>📄 {doc.fileName}</span>
                          <span>• {(doc.fileSize / 1024).toFixed(1)} KB</span>
                          <span>• {doc.pageCount} pág.</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setPreviewingDoc(doc); setShowExtractedText(false); }}
                            className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-semibold transition flex items-center gap-1"
                            title="Ver contenido extraído"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>
                          <button
                            onClick={() => handleDeletePdfDoc(doc.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                            title="Eliminar PDF"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE VISUALIZACIÓN DEL PDF */}
      {previewingDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 text-sm truncate">{previewingDoc.title}</h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    Archivo: {previewingDoc.fileName} • {previewingDoc.pageCount} págs
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {previewingDoc.storagePath && (
                  <button
                    onClick={() => setShowExtractedText(!showExtractedText)}
                    className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 px-2 py-1 rounded-lg hover:bg-purple-50 transition whitespace-nowrap"
                  >
                    {showExtractedText ? 'Ver PDF' : 'Ver texto indexado'}
                  </button>
                )}
                <button
                  onClick={() => setPreviewingDoc(null)}
                  className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-slate-100">
              {!previewingDoc.storagePath ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <p className="text-sm font-semibold text-slate-700">Este documento no tiene el archivo original guardado.</p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Se subió antes de esta funcionalidad. Elimínalo y vuelve a subirlo para poder visualizarlo en PDF.
                  </p>
                </div>
              ) : showExtractedText ? (
                <div className="p-5 overflow-y-auto h-full font-mono text-xs text-slate-200 bg-slate-900 whitespace-pre-wrap leading-relaxed">
                  {previewingDoc.extractedText}
                </div>
              ) : (
                <iframe
                  src={`/api/rag/documents/${previewingDoc.id}/file`}
                  title={previewingDoc.title}
                  className="w-full h-full border-0"
                />
              )}
            </div>

            <div className="p-3.5 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-end shrink-0">
              <button
                onClick={() => setPreviewingDoc(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
