'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Video,
  PlayCircle,
  Trash2,
  Link as LinkIcon,
  UploadCloud,
  FilePlus,
  AlertCircle
} from 'lucide-react';
import { ProcessVideo, MAX_UPLOADED_VIDEO_BYTES } from '@/src/lib/processVideosStore';
import { getSupabaseBrowserClient } from '@/src/lib/supabaseBrowserClient';
import { ProcessPicker } from './ProcessPicker';
import { useCrmSession } from './CrmSessionContext';
import { ProcessVideoList } from '../ProcessVideoList';
import { VideoPlayerModal } from '../VideoPlayerModal';

const MAX_UPLOADED_VIDEO_MB = Math.round(MAX_UPLOADED_VIDEO_BYTES / (1024 * 1024));

export const CrmVideosManager: React.FC = () => {
  const { role } = useCrmSession();
  const [processSlug, setProcessSlug] = useState('');
  const [videos, setVideos] = useState<ProcessVideo[]>([]);
  const [uploadMode, setUploadMode] = useState<'link' | 'upload'>('link');
  const [titleInput, setTitleInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  const handleUploadVideoFile = async () => {
    if (!titleInput.trim()) {
      setSaveMsg('⚠️ Completa el título del video.');
      return;
    }
    if (!selectedFile) {
      setSaveMsg('⚠️ Selecciona un archivo de video.');
      return;
    }
    if (selectedFile.size > MAX_UPLOADED_VIDEO_BYTES) {
      setSaveMsg(`⚠️ El video pesa ${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB — el máximo permitido es ${MAX_UPLOADED_VIDEO_MB} MB. Comprime o reduce la resolución antes de subirlo.`);
      return;
    }

    setIsSaving(true);
    setSaveMsg('⏳ Subiendo archivo de video directo a almacenamiento...');

    try {
      const urlRes = await fetch('/api/crm/videos/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: selectedFile.name, processSlug })
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok || !urlData.success) {
        throw new Error(urlData.error || 'No se pudo iniciar la carga del archivo.');
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error('La carga de videos no está disponible: falta configuración del servidor (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY).');
      }
      const { error: uploadError } = await supabase.storage
        .from('process-videos')
        .uploadToSignedUrl(urlData.storagePath, urlData.token, selectedFile, { contentType: selectedFile.type || 'video/mp4' });
      if (uploadError) {
        throw new Error(uploadError.message);
      }

      setSaveMsg('⏳ Registrando el video...');
      const res = await fetch('/api/crm/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: urlData.docId,
          storagePath: urlData.storagePath,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          processSlug,
          title: titleInput
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.persistedToSupabase === false) {
          setSaveMsg('⚠️ Video subido, pero no se pudo registrar en Supabase — se perderá si el servidor se reinicia.');
        } else {
          setSaveMsg('✅ ¡Éxito! Video subido y publicado en este proceso.');
        }
        setTitleInput('');
        setSelectedFile(null);
        await loadVideos();
      } else {
        setSaveMsg(`❌ Error: ${data.error || 'No se pudo registrar el video.'}`);
      }
    } catch (err: any) {
      setSaveMsg(`❌ Error al subir el video: ${err.message}`);
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
              <PlayCircle className="w-4 h-4 text-indigo-600" />
              <span>Agregar Video</span>
            </div>

            <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1">
              <button
                onClick={() => { setUploadMode('link'); setSaveMsg(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  uploadMode === 'link' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LinkIcon className="w-3.5 h-3.5" />
                Enlace
              </button>
              <button
                onClick={() => { setUploadMode('upload'); setSaveMsg(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  uploadMode === 'upload' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                Subir archivo
              </button>
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

              {uploadMode === 'link' ? (
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
                    Recomendado: sube el video a YouTube como &quot;no listado&quot; y pega aquí el link normal de compartir (lo convertimos automáticamente). Al quedar alojado en YouTube, no ocupa nada del almacenamiento de la app.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Archivo de Video:</label>
                  <div className="border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl p-4 text-center cursor-pointer transition relative">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <FilePlus className="w-8 h-8 text-indigo-600 mx-auto mb-1" />
                    {selectedFile ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-indigo-900 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-indigo-800">Haz clic o arrastra un archivo de video aquí</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Máximo {MAX_UPLOADED_VIDEO_MB} MB</p>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Para mantener liviano el almacenamiento, comprime el video y usa una resolución razonable (720p es suficiente para instructivos de planta) antes de subirlo.
                  </p>
                </div>
              )}

              <button
                onClick={uploadMode === 'link' ? handleAddVideo : handleUploadVideoFile}
                disabled={
                  isSaving ||
                  !titleInput.trim() ||
                  !processSlug ||
                  (uploadMode === 'link' ? !urlInput.trim() : !selectedFile)
                }
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                <span>{isSaving ? 'Procesando...' : uploadMode === 'link' ? 'Agregar Video' : 'Subir y Publicar Video'}</span>
              </button>

              {saveMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium border ${
                  saveMsg.startsWith('✅') ? 'bg-emerald-50 text-emerald-900 border-emerald-200' :
                  saveMsg.startsWith('⏳') ? 'bg-indigo-50 text-indigo-900 border-indigo-200' : 'bg-amber-50 text-amber-900 border-amber-200'
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
              <ProcessVideoList
                videos={videos}
                onView={setPlayingVideo}
                renderExtraActions={(video) => role === 'administrador' ? (
                  <button
                    onClick={() => handleDeleteVideo(video.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition"
                    title="Eliminar video"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              />
            )}
          </div>
        </div>
      </div>

      {playingVideo && <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)} />}
    </div>
  );
};
