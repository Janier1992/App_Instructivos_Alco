'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClipboardList, ArrowDownAZ, ArrowUpZA, Eye, Loader2, Folder, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { ProcessItem } from '@/src/types';
import { CustomRagDocument, GENERAL_DOCS_SLUG } from '../lib/ragDocumentTypes';
import { PdfPreviewModal } from './PdfPreviewModal';

type TitleSort = 'asc' | 'desc';

// Orden natural por título: "2." antes de "10." y sin distinguir mayúsculas ni
// tildes, para que los instructivos sigan la numeración que lleven en el nombre.
const sortByTitle = (docs: CustomRagDocument[], dir: TitleSort) =>
  [...docs].sort((a, b) => {
    const cmp = a.title.localeCompare(b.title, 'es', { numeric: true, sensitivity: 'base' });
    return dir === 'asc' ? cmp : -cmp;
  });

const isMobileDevice = () =>
  typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

interface FolderProps {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  /** 'main' = carpeta principal, 'sub' = subcarpeta de un área. */
  level: 'main' | 'sub';
  children: React.ReactNode;
}

const InstructivoFolder: React.FC<FolderProps> = ({ title, count, open, onToggle, level, children }) => (
  <div className={`border border-slate-200 rounded-xl overflow-hidden bg-white ${level === 'main' ? 'shadow-sm' : ''}`}>
    <button
      onClick={onToggle}
      className={`w-full flex items-center justify-between gap-2 px-4 text-left transition hover:bg-slate-100 ${
        level === 'main' ? 'py-3.5 bg-slate-100' : 'py-2.5 bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {open ? (
          <FolderOpen className="w-4 h-4 text-purple-600 shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-purple-600 shrink-0" />
        )}
        <span className={`font-bold text-slate-800 truncate ${level === 'main' ? 'text-sm' : 'text-xs'}`}>{title}</span>
        <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">{count}</span>
      </div>
      {open ? (
        <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
      ) : (
        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
      )}
    </button>
    {open && <div className="border-t border-slate-200">{children}</div>}
  </div>
);

const DocList: React.FC<{ docs: CustomRagDocument[]; onView: (doc: CustomRagDocument) => void }> = ({ docs, onView }) => (
  <ul className="divide-y divide-slate-100 bg-white">
    {docs.map(doc => (
      <li key={doc.id} className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-bold text-sm text-slate-900 truncate">{doc.title}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {doc.code} • {doc.pageCount} pág. •{' '}
            {new Date(doc.uploadedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => onView(doc)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition"
        >
          <Eye className="w-3.5 h-3.5" />
          Ver instructivo
        </button>
      </li>
    ))}
  </ul>
);

/**
 * Tercer módulo de la barra principal. Dos carpetas:
 *  1. Instructivos Generales — los instructivos principales (cargados al
 *     destino "general" desde el Portal de Administración).
 *  2. Instructivos de Control por Área — una subcarpeta por proceso con los
 *     instructivos cargados a esa sección.
 * Si se llega desde el QR de un proceso (?proceso=slug) esa subcarpeta se abre sola.
 */
export const InstructivosView: React.FC = () => {
  const focusSlug = useSearchParams().get('proceso');

  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [docs, setDocs] = useState<CustomRagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewingDoc, setPreviewingDoc] = useState<CustomRagDocument | null>(null);
  const [sortDir, setSortDir] = useState<TitleSort>('asc');
  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () => new Set(['general', 'areas', ...(focusSlug ? [`area:${focusSlug}`] : [])])
  );

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

  const toggle = (key: string) =>
    setOpenKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const generalDocs = useMemo(
    () => sortByTitle(docs.filter(d => d.processSlug === GENERAL_DOCS_SLUG), sortDir),
    [docs, sortDir]
  );
  const areaGroups = useMemo(
    () =>
      processes
        .map(p => ({ process: p, docs: sortByTitle(docs.filter(d => d.processSlug === p.slug), sortDir) }))
        .filter(g => g.docs.length > 0),
    [processes, docs, sortDir]
  );
  const areaTotal = areaGroups.reduce((sum, g) => sum + g.docs.length, 0);

  const handleView = (doc: CustomRagDocument) => {
    // En móvil el visor embebido no es confiable: se abre el archivo directo.
    if (isMobileDevice() && doc.storagePath) {
      window.open(`/api/rag/documents/${doc.id}/file`, '_blank', 'noopener,noreferrer');
      return;
    }
    setPreviewingDoc(doc);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Instructivos de Control</h2>
            <p className="text-xs text-slate-500 mt-0.5">Instructivos de control de procesos, organizados por carpetas.</p>
          </div>
        </div>

        <button
          onClick={() => setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))}
          className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
          title="Cambiar orden alfabético / numérico"
        >
          {sortDir === 'asc' ? <ArrowDownAZ className="w-3.5 h-3.5" /> : <ArrowUpZA className="w-3.5 h-3.5" />}
          <span>{sortDir === 'asc' ? 'Orden A-Z' : 'Orden Z-A'}</span>
        </button>
      </div>

      {loading ? (
        <div className="p-10 flex justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <InstructivoFolder
            level="main"
            title="1. Instructivos Generales"
            count={generalDocs.length}
            open={openKeys.has('general')}
            onToggle={() => toggle('general')}
          >
            {generalDocs.length === 0 ? (
              <p className="px-4 py-5 text-xs text-slate-500 bg-white">Próximamente: aquí estarán los instructivos principales.</p>
            ) : (
              <DocList docs={generalDocs} onView={handleView} />
            )}
          </InstructivoFolder>

          <InstructivoFolder
            level="main"
            title="2. Instructivos de Control por Áreas"
            count={areaTotal}
            open={openKeys.has('areas')}
            onToggle={() => toggle('areas')}
          >
            {areaGroups.length === 0 ? (
              <p className="px-4 py-5 text-xs text-slate-500 bg-white">Aún no hay instructivos cargados en las áreas.</p>
            ) : (
              <div className="p-3 space-y-2 bg-white">
                {areaGroups.map(({ process, docs: processDocs }) => (
                  <InstructivoFolder
                    key={process.slug}
                    level="sub"
                    title={process.name}
                    count={processDocs.length}
                    open={openKeys.has(`area:${process.slug}`)}
                    onToggle={() => toggle(`area:${process.slug}`)}
                  >
                    <DocList docs={processDocs} onView={handleView} />
                  </InstructivoFolder>
                ))}
              </div>
            )}
          </InstructivoFolder>
        </div>
      )}

      {previewingDoc && <PdfPreviewModal doc={previewingDoc} onClose={() => setPreviewingDoc(null)} />}
    </div>
  );
};
