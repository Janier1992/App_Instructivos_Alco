'use client';

import React, { useState } from 'react';
import { FileText, AlertCircle, X, ExternalLink } from 'lucide-react';
import { CustomRagDocument } from '../lib/ragDocumentTypes';

interface PdfPreviewModalProps {
  doc: CustomRagDocument;
  onClose: () => void;
}

/**
 * Visor modal de un PDF indexado (archivo original + texto extraído). Lo
 * comparten el panel de documentación de cada proceso y la vista de
 * Instructivos de Control.
 */
export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ doc, onClose }) => {
  const [showExtractedText, setShowExtractedText] = useState(false);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 text-sm truncate">{doc.title}</h3>
              <p className="text-[11px] text-slate-500 truncate">
                Archivo: {doc.fileName} • {doc.pageCount} págs
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {doc.storagePath && (
              <>
                {/* En varios navegadores móviles el iframe no renderiza PDFs — este
                    enlace abre el archivo directo, que el sistema operativo del
                    celular sí sabe manejar (visor nativo o descarga). */}
                <a
                  href={`/api/rag/documents/${doc.id}/file`}
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
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-slate-100">
          {!doc.storagePath ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <p className="text-sm font-semibold text-slate-700">Este documento no tiene el archivo original guardado.</p>
            </div>
          ) : showExtractedText ? (
            <div className="p-5 overflow-y-auto h-full font-mono text-xs text-slate-200 bg-slate-900 whitespace-pre-wrap leading-relaxed">
              {doc.extractedText}
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="sm:hidden p-2.5 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900 text-center shrink-0">
                ¿No se ve el PDF? Usa <strong>&quot;Abrir en pestaña nueva&quot;</strong> arriba — varios navegadores de celular no muestran el PDF incrustado aquí.
              </div>
              <iframe
                src={`/api/rag/documents/${doc.id}/file`}
                title={doc.title}
                className="w-full flex-1 border-0"
              />
            </div>
          )}
        </div>

        <div className="p-3.5 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
