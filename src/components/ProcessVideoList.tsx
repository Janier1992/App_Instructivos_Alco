'use client';

import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import { ProcessVideo } from '../lib/processVideosStore';
import { SortDateToggle, SortDirection } from './SortDateToggle';

interface ProcessVideoListProps {
  videos: ProcessVideo[];
  onView: (video: ProcessVideo) => void;
  /** Slot opcional para acciones adicionales por fila (ej. botón eliminar en el CRM). */
  renderExtraActions?: (video: ProcessVideo) => React.ReactNode;
}

/**
 * Tabla de videos de proceso con orden por fecha alternable — compartida
 * entre la vista pública (ProcessVideosPanel) y el Portal de Administración
 * (CrmVideosManager) para no duplicar el marcado ni la lógica de orden.
 */
export const ProcessVideoList: React.FC<ProcessVideoListProps> = ({ videos, onView, renderExtraActions }) => {
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  const sortedVideos = [...videos].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortDir === 'desc' ? -diff : diff;
  });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <SortDateToggle direction={sortDir} onToggle={() => setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'))} />
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
              <th className="py-2 px-3 font-bold whitespace-nowrap">Fecha</th>
              <th className="py-2 px-3 font-bold">Video</th>
              <th className="py-2 px-3 font-bold text-right whitespace-nowrap">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedVideos.map((video) => (
              <tr key={video.id} className="align-top hover:bg-slate-50/60">
                <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-medium">
                  {new Date(video.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="py-3 px-3 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 truncate">{video.title}</span>
                    {video.sourceType === 'upload' ? (
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                        📁 Archivo{video.fileSize ? ` (${(video.fileSize / (1024 * 1024)).toFixed(1)} MB)` : ''}
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                        🔗 Enlace externo
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onView(video)}
                      className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold transition flex items-center gap-1"
                      title="Ver video"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver</span>
                    </button>
                    {renderExtraActions?.(video)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
