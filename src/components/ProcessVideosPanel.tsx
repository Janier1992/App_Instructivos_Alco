'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Video, PlayCircle, Eye, AlertCircle, X, ExternalLink } from 'lucide-react';
import { ProcessVideo } from '../lib/processVideosStore';

interface ProcessVideosPanelProps {
  processSlug: string;
}

/**
 * Vista de solo consulta de los videos de este proceso. Agregar o eliminar
 * videos se hace desde el Portal de Administración (/crm/videos).
 */
export const ProcessVideosPanel: React.FC<ProcessVideosPanelProps> = ({ processSlug }) => {
  const [videos, setVideos] = useState<ProcessVideo[]>([]);
  const [playingVideo, setPlayingVideo] = useState<ProcessVideo | null>(null);

  const loadVideos = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (data.success) {
        setVideos(data.videos || []);
      }
    } catch (err) {
      console.error('Error cargando videos de proceso:', err);
    }
  }, [processSlug]);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Instrucciones de Procesos en Video</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Videos explicativos de operaciones de este proceso.
            </p>
          </div>
        </div>

        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
          🎬 Videos: <strong className="text-indigo-700">{videos.length}</strong>
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
            <PlayCircle className="w-4 h-4 text-emerald-600" />
            <span>Videos Cargados</span>
          </div>
          <button
            onClick={loadVideos}
            className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Actualizar
          </button>
        </div>

        {videos.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">No hay videos cargados todavía para este proceso.</p>
          </div>
        ) : (
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
                {videos.map((video) => (
                  <tr key={video.id} className="align-top hover:bg-slate-50/60">
                    <td className="py-3 px-3 whitespace-nowrap text-slate-600 font-medium">
                      {new Date(video.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-3 min-w-0">
                      <span className="font-bold text-slate-900 truncate block">{video.title}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPlayingVideo(video)}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold transition flex items-center gap-1"
                          title="Ver video"
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

      {/* MODAL DE REPRODUCCIÓN DEL VIDEO */}
      {playingVideo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm truncate">{playingVideo.title}</h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={playingVideo.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 px-2 py-1 rounded-lg hover:bg-indigo-50 transition whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Abrir en pestaña nueva
                </a>
                <button
                  onClick={() => setPlayingVideo(null)}
                  className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden bg-slate-900 flex flex-col">
              <div className="sm:hidden p-2.5 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900 text-center shrink-0">
                ¿No se reproduce? Usa <strong>&quot;Abrir en pestaña nueva&quot;</strong> arriba.
              </div>
              <iframe
                src={playingVideo.videoUrl}
                title={playingVideo.title}
                allow="autoplay; fullscreen"
                allowFullScreen
                className="w-full flex-1 border-0"
              />
            </div>

            <div className="p-3.5 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-end shrink-0">
              <button
                onClick={() => setPlayingVideo(null)}
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
