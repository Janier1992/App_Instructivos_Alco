'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Video,
  PlayCircle,
  Trash2,
  Eye,
  Link as LinkIcon,
  AlertCircle,
  X,
  ExternalLink
} from 'lucide-react';
import { ProcessVideo } from '@/src/lib/processVideosStore';
import { ProcessPicker } from './ProcessPicker';
import { useCrmSession } from './CrmSessionContext';

export const CrmVideosManager: React.FC = () => {
  const { role } = useCrmSession();
  const [processSlug, setProcessSlug] = useState('');
  const [videos, setVideos] = useState<ProcessVideo[]>([]);
  const [titleInput, setTitleInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState<ProcessVideo | null>(null);

  const loadVideos = useCallback(async () => {
    if (!processSlug) return;
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

  const handleAddVideo = async () => {
    if (!titleInput.trim() || !urlInput.trim()) {
      setSaveMsg('⚠️ Completa el título y el enlace del video.');
      return;
    }

    setIsSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch('/api/crm/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processSlug, title: titleInput, videoUrl: urlInput })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.persistedToSupabase === false) {
          setSaveMsg('⚠️ Video agregado, pero no se pudo guardar en Supabase — se perderá si el servidor se reinicia.');
        } else {
          setSaveMsg('✅ Video agregado correctamente.');
        }
        setTitleInput('');
        setUrlInput('');
        await loadVideos();
      } else {
        setSaveMsg(`❌ Error: ${data.error || 'No se pudo agregar el video.'}`);
      }
    } catch (err: any) {
      setSaveMsg(`❌ Error al agregar el video: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este video?')) return;
    try {
      const res = await fetch(`/api/crm/videos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadVideos();
      } else {
        alert(data.error || 'No se pudo eliminar el video.');
      }
    } catch (err) {
      console.error('Error al eliminar video:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Administración de Videos</h1>
          <p className="text-xs text-slate-500 mt-0.5">Instrucciones de proceso en video, por proceso.</p>
        </div>
        <ProcessPicker value={processSlug} onChange={setProcessSlug} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Instrucciones de Procesos en Video</h3>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
            🎬 Videos: <strong className="text-indigo-700">{videos.length}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">
              <LinkIcon className="w-4 h-4 text-indigo-600" />
              <span>Agregar Enlace de Video</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Sección / Proceso de destino:</label>
                <ProcessPicker
                  value={processSlug}
                  onChange={setProcessSlug}
                  className="w-full bg-white border border-indigo-300 rounded-xl px-3 py-2 text-sm font-bold text-[#003366] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Este video solo se mostrará en esta sección — no en las demás.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Título del Video:</label>
                <input
                  type="text"
                  placeholder="Ej: Ajuste de Tope Micrométrico en Tronzadora"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Enlace del Video:</label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Recomendado: sube el video a YouTube como &quot;no listado&quot; y pega aquí el link normal de compartir (lo convertimos automáticamente).
                </p>
              </div>

              <button
                onClick={handleAddVideo}
                disabled={isSaving || !titleInput.trim() || !urlInput.trim() || !processSlug}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                <span>{isSaving ? 'Guardando...' : 'Agregar Video'}</span>
              </button>

              {saveMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${
                  saveMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  {saveMsg}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                <PlayCircle className="w-4 h-4 text-emerald-600" />
                <span>Videos Cargados</span>
              </div>
              <button onClick={loadVideos} className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1">
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
                          <span className="text-[10px] text-slate-400 truncate block">{video.videoUrl}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPlayingVideo(video)}
                              className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold transition flex items-center gap-1"
                              title="Ver video"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {role === 'administrador' && (
                              <button
                                onClick={() => handleDeleteVideo(video.id)}
                                className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                                title="Eliminar video"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {playingVideo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200">
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
                <button onClick={() => setPlayingVideo(null)} className="p-1.5 hover:bg-slate-200 text-slate-500 rounded-lg transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden bg-slate-900 flex flex-col">
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
