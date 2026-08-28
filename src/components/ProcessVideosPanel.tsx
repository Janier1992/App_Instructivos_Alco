'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Video, PlayCircle, AlertCircle } from 'lucide-react';
import { ProcessVideo } from '../lib/processVideosStore';
import { ProcessVideoList } from './ProcessVideoList';
import { VideoPlayerModal } from './VideoPlayerModal';

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
          <ProcessVideoList videos={videos} onView={setPlayingVideo} />
        )}
      </div>

      {playingVideo && <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />}
    </div>
  );
};
