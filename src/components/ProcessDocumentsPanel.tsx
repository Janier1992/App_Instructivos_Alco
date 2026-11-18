'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, FileCheck, BookOpen, AlertCircle } from 'lucide-react';
import { CustomRagDocument } from '../lib/ragDocumentTypes';
import { RagDocumentFolders } from './RagDocumentFolders';
import { PdfPreviewModal } from './PdfPreviewModal';

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
          <RagDocumentFolders documents={ragDocs} onView={handleViewDoc} />
        )}
      </div>

      {previewingDoc && <PdfPreviewModal doc={previewingDoc} onClose={() => setPreviewingDoc(null)} />}
    </div>
  );
};
