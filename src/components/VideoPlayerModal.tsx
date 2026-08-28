'use client';

import React from 'react';
import { Video, X, ExternalLink } from 'lucide-react';
import { ProcessVideo } from '../lib/processVideosStore';

interface VideoPlayerModalProps {
  video: ProcessVideo;
  onClose: () => void;
}

/**
 * Reproductor modal compartido entre la vista pública (ProcessVideosPanel)
 * y el Portal de Administración (CrmVideosManager). Un enlace externo
 * (YouTube, OneDrive, etc.) se embebe en iframe; un archivo subido directo a
 * la app se reproduce con <video>, apuntando a /api/videos/[id]/file — esa
 * ruta redirige a una URL firmada de Supabase Storage con soporte real de
 * "Range" para poder adelantar/retroceder.
 */
export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  const isUpload = video.sourceType === 'upload';
  const fileUrl = `/api/videos/${video.id}/file`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm truncate">{video.title}</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={isUpload ? fileUrl : video.videoUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 px-2 py-1 rounded-lg hover:bg-indigo-50 transition whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir en pestaña nueva
            </a>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-slate-900 flex flex-col">
          {isUpload ? (
            <video src={fileUrl} title={video.title} controls autoPlay className="w-full flex-1 bg-black" />
          ) : (
            <>
              <div className="sm:hidden p-2.5 bg-amber-50 border-b border-amber-200 text-[11px] text-amber-900 text-center shrink-0">
                ¿No se reproduce? Usa <strong>&quot;Abrir en pestaña nueva&quot;</strong> arriba.
              </div>
              <iframe
                src={video.videoUrl || ''}
                title={video.title}
                allow="autoplay; fullscreen"
                allowFullScreen
                className="w-full flex-1 border-0"
              />
            </>
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
