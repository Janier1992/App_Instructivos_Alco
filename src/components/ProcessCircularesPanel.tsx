'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, Paperclip } from 'lucide-react';

interface PublicCircular {
  id: string;
  title: string;
  bodyText: string | null;
  attachmentFileName: string | null;
  publishedAt: string | null;
  createdAt: string;
}

interface ProcessCircularesPanelProps {
  processSlug: string;
}

/**
 * Circulares informativas publicadas para este proceso (o para todas las
 * áreas). Solo lectura — se crean y publican desde /crm/circulares.
 */
export const ProcessCircularesPanel: React.FC<ProcessCircularesPanelProps> = ({ processSlug }) => {
  const [circulares, setCirculares] = useState<PublicCircular[]>([]);

  const loadCirculares = useCallback(async () => {
    try {
      const res = await fetch(`/api/circulares?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (data.success) setCirculares(data.circulares || []);
    } catch (err) {
      console.error('Error cargando circulares:', err);
    }
  }, [processSlug]);

  useEffect(() => {
    loadCirculares();
  }, [loadCirculares]);

  if (circulares.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
          <Megaphone className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">Circulares Informativas</h3>
          <p className="text-xs text-slate-500 mt-0.5">Comunicados vigentes para este proceso.</p>
        </div>
      </div>

      <div className="space-y-3">
        {circulares.map(c => (
          <div key={c.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-bold text-slate-900 text-sm">{c.title}</h4>
              <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">
                {new Date(c.publishedAt || c.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
            {c.bodyText && <p className="text-xs text-slate-700 whitespace-pre-line">{c.bodyText}</p>}
            {c.attachmentFileName && (
              <a
                href={`/api/circulares/${c.id}/attachment`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 hover:text-amber-950 bg-white px-2.5 py-1 rounded-lg border border-amber-200 transition"
              >
                <Paperclip className="w-3.5 h-3.5" />
                {c.attachmentFileName}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
