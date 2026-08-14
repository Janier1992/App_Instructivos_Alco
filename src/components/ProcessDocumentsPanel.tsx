'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  FileText,
  FileCheck,
  Eye,
  BookOpen,
  AlertCircle,
  X,
  ExternalLink
} from 'lucide-react';
import { CustomRagDocument } from '../lib/customRagStore';

interface ProcessDocumentsPanelProps {
  processSlug: string;
}

/**
 * Vista de solo consulta de los PDFs indexados para este proceso. Subir o
 * eliminar documentos se hace desde el Portal de Administración (/crm/documentos)
 * — esta vista pública ya no tiene esas acciones.
 */
export const ProcessDocumentsPanel: React.FC<ProcessDocumentsPanelProps> = ({ processSlug }) => {
  const [ragDocs, setRagDocs] = useState<CustomRagDocument[]>([]);
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

  const isMobileDevice = () =>
    typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleViewDoc = (doc: CustomRagDocument) => {
    // En móvil, el visor de PDF embebido en iframe no es confiable (Chrome/Safari
    // móvil suelen dejarlo en blanco o forzar descarga). Se navega directo al
    // archivo: el sistema operativo lo abre con su visor nativo de PDF.
    if (isMobileDevice() && doc.storagePath) {
      window.open(`/api/rag/documents/${doc.id}/file`, '_blank', 'noopener,noreferrer');
      return;
    }
    setPreviewingDoc(doc);
    setShowExtractedText(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Documentación PDF de este Proceso</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manuales técnicos, normas y fichas indexadas para el agente IA de este proceso.
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
          📚 Documentos: <strong className="text-purple-700">{ragDocs.length}</strong>
        </span>
      </div>

      <div className="space-y-3">
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
                          onClick={() => handleViewDoc(doc)}
                          className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-semibold transition flex items-center gap-1"
                          title="Ver contenido extraído"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
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
                  <>
                    {/* En varios navegadores móviles el iframe no renderiza PDFs — este
                        enlace abre el archivo directo, que el sistema operativo del
                        celular sí sabe manejar (visor nativo o descarga). */}
                    <a
                      href={`/api/rag/documents/${previewingDoc.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-semibold text-purple-700 hover:text-purple-900 px-2 py-1 rounded-lg hover:bg-purple-50 transition whitespace-nowrap"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir en pestaña nueva
                    </a>
                    <button
                      onClick={() => setShowExtractedText(!showExtractedText)}
                      className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 px-2 py-1 rounded-lg hover:bg-purple-50 transition whitespace-nowrap"
                    >
                      {showExtractedText ? 'Ver PDF' : 'Ver texto indexado'}
                    </button>
                  </>
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
                </div>
              ) : showExtractedText ? (
                <div className="p-5 overflow-y-auto h-full font-mono text-xs text-slate-200 bg-slate-900 whitespace-pre-wrap leading-relaxed">
                  {previewingDoc.extractedText}
                </div>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="sm:hidden p-2.5 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900 text-center shrink-0">
                    ¿No se ve el PDF? Usa <strong>&quot;Abrir en pestaña nueva&quot;</strong> arriba — varios navegadores de celular no muestran el PDF incrustado aquí.
                  </div>
                  <iframe
                    src={`/api/rag/documents/${previewingDoc.id}/file`}
                    title={previewingDoc.title}
                    className="w-full flex-1 border-0"
                  />
                </div>
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
