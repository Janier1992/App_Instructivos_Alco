'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClipboardList, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { ProcessItem } from '@/src/types';
import { CustomRagDocument } from '../lib/ragDocumentTypes';
import { PdfPreviewModal } from './PdfPreviewModal';

const isMobileDevice = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

/**
 * Tercer módulo de la barra principal: reúne los Instructivos de Control de
 * Procesos (PDFs de tipo "instructivo" cargados desde el Portal de
 * Administración), agrupados por proceso. Cuando se llega desde el QR de un
 * proceso (?proceso=slug) arranca filtrado en el instructivo de ese proceso.
 */
export const InstructivosView: React.FC = () => {
  const searchParams = useSearchParams();
  const initialSlug = searchParams.get('proceso') || 'all';

  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [docs, setDocs] = useState<CustomRagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [previewingDoc, setPreviewingDoc] = useState<CustomRagDocument | null>(null);

  useEffect(() => {
    setSelectedSlug(initialSlug);
  }, [initialSlug]);

  useEffect(() => {
    Promise.all([
      fetch('/api/processes').then(r => r.json()),
      fetch('/api/rag/documents?type=instructivo').then(r => r.json())
    ])
      .then(([procData, docData]) => {
        setProcesses(procData.processes || []);
        setDocs(docData.documents || []);
      })
      .catch(err => console.error('Error cargando instructivos:', err))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(
    () =>
      processes
        .map(p => ({ process: p, docs: docs.filter(d => d.processSlug === p.slug) }))
        .filter(g => g.docs.length > 0)
        .filter(g => selectedSlug === 'all' || g.process.slug === selectedSlug),
    [processes, docs, selectedSlug]
  );

  const handleView = (doc: CustomRagDocument) => {
    // En móvil el visor embebido no es confiable: se abre el archivo directo.
    if (isMobileDevice() && doc.storagePath) {
      window.open(`/api/rag/documents/${doc.id}/file`, '_blank', 'noopener,noreferrer');
      return;
    }
    setPreviewingDoc(doc);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Instructivos de Control</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Instructivo de control de procesos de cada área de la planta.
            </p>
          </div>
        </div>

        <select
          value={selectedSlug}
          onChange={e => setSelectedSlug(e.target.value)}
          className="text-xs font-semibold bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
          aria-label="Filtrar por proceso"
        >
          <option value="all">Todos los procesos</option>
          {processes.map(p => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-xs font-semibold text-slate-600">
            Aún no hay instructivo de control cargado para {selectedSlug === 'all' ? 'ningún proceso' : 'este proceso'}.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(({ process, docs: processDocs }) => (
            <section key={process.slug} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <h3 className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-bold text-sm text-slate-800">
                {process.name}
              </h3>
              <ul className="divide-y divide-slate-100">
                {processDocs.map(doc => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{doc.title}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {doc.code} • {doc.pageCount} pág. •{' '}
                        {new Date(doc.uploadedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleView(doc)}
                      className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver instructivo
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {previewingDoc && <PdfPreviewModal doc={previewingDoc} onClose={() => setPreviewingDoc(null)} />}
    </div>
  );
};
