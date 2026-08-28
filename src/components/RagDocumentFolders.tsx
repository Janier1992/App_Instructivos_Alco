'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Eye, Folder, FolderOpen } from 'lucide-react';
import { CustomRagDocument, RAG_DOCUMENT_TYPE_LABELS, RAG_DOCUMENT_TYPE_ORDER } from '../lib/ragDocumentTypes';
import { SortDateToggle, SortDirection } from './SortDateToggle';

interface RagDocumentFoldersProps {
  documents: CustomRagDocument[];
  onView: (doc: CustomRagDocument) => void;
  /** Slot opcional para acciones adicionales por fila (ej. botón eliminar en el CRM). */
  renderExtraActions?: (doc: CustomRagDocument) => React.ReactNode;
}

/**
 * Agrupa los documentos PDF indexados en carpetas por tipo (Instructivo,
 * Manual, Ficha Técnica, Ficha de Troquelado, Otros) en vez de una tabla
 * plana — la categoría se asigna al subir el archivo desde el Portal de
 * Administración (ver CrmDocumentsManager). Solo se muestran las carpetas
 * que tienen al menos un documento.
 */
export const RagDocumentFolders: React.FC<RagDocumentFoldersProps> = ({ documents, onView, renderExtraActions }) => {
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const groups = RAG_DOCUMENT_TYPE_ORDER.map(type => ({
    type,
    docs: documents
      .filter(d => d.documentType === type)
      .sort((a, b) => {
        const diff = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        return sortDir === 'desc' ? -diff : diff;
      })
  })).filter(g => g.docs.length > 0);

  // La primera carpeta con documentos arranca abierta para que la vista no
  // se sienta vacía al entrar; el resto arrancan colapsadas.
  const [openTypes, setOpenTypes] = useState<Set<string>>(() => new Set(groups[0] ? [groups[0].type] : []));

  const toggle = (type: string) => {
    setOpenTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <SortDateToggle direction={sortDir} onToggle={() => setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'))} />
      </div>

      {groups.map(({ type, docs }) => {
        const isOpen = openTypes.has(type);
        return (
          <div key={type} className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(type)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition text-left"
            >
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <FolderOpen className="w-4 h-4 text-purple-600 shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-purple-600 shrink-0" />
                )}
                <span className="font-bold text-sm text-slate-800">{RAG_DOCUMENT_TYPE_LABELS[type]}</span>
                <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {docs.length}
                </span>
              </div>
              {isOpen ? (
                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              )}
            </button>

            {isOpen && (
              <div className="overflow-x-auto border-t border-slate-200">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="text-left text-[10px] uppercase text-slate-500 bg-white border-b border-slate-100">
                      <th className="py-2 px-3 font-bold whitespace-nowrap">Fecha</th>
                      <th className="py-2 px-3 font-bold">Documento</th>
                      <th className="py-2 px-3 font-bold text-right whitespace-nowrap">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {docs.map(doc => (
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
                              <span
                                className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap"
                                title="Conecta Supabase para indexación semántica; por ahora se usa el texto completo del PDF."
                              >
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
                              onClick={() => onView(doc)}
                              className="p-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-semibold transition flex items-center gap-1"
                              title="Ver contenido extraído"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {renderExtraActions?.(doc)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
