'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Newspaper,
  Paperclip,
  Trash2,
  Send,
  Undo2,
  Pencil,
  X,
  AlertCircle,
  CheckCircle2,
  FileClock,
  Link2
} from 'lucide-react';
import { ProcessItem } from '@/src/types';
import { useCrmSession } from './CrmSessionContext';
import { getSupabaseBrowserClient } from '@/src/lib/supabaseBrowserClient';

const DIRECT_UPLOAD_THRESHOLD_BYTES = 4 * 1024 * 1024;

/**
 * Ante un error de infraestructura (ej. Vercel rechazando un request de más
 * de 4.5 MB) la respuesta no es JSON sino texto plano ("Request Entity Too
 * Large..."), y un res.json() directo revienta con un error de parseo
 * confuso ("Unexpected token 'R'..."). Se valida el content-type antes de
 * parsear para mostrar siempre un mensaje entendible.
 */
async function parseJsonResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return { error: `Respuesta inesperada del servidor (${res.status}).` };
  }
  return res.json();
}

interface CircularAdmin {
  id: string;
  title: string;
  bodyText: string | null;
  attachmentFileName: string | null;
  embedUrl: string | null;
  processSlugs: string[];
  status: 'draft' | 'published';
  displayOrder: number;
  publishedAt: string | null;
  createdAt: string;
}

/**
 * Administra el contenido de la pestaña pública "Principal" de cada
 * proceso. Internamente sigue siendo la tabla/API "circulares" — solo la
 * presentación (aquí y en la app pública) se renombró a "Principal".
 */
export const CrmCircularesManager: React.FC = () => {
  const { role } = useCrmSession();
  const [circulares, setCirculares] = useState<CircularAdmin[]>([]);
  const [processes, setProcesses] = useState<ProcessItem[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [applyToAll, setApplyToAll] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(0);
  const [embedUrl, setEmbedUrl] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadCirculares = useCallback(async () => {
    try {
      const res = await fetch('/api/crm/circulares');
      const data = await res.json();
      if (data.success) setCirculares(data.circulares || []);
    } catch (err) {
      console.error('Error cargando contenido Principal:', err);
    }
  }, []);

  useEffect(() => {
    loadCirculares();
    fetch('/api/processes')
      .then(res => res.json())
      .then(data => setProcesses(data.processes || []))
      .catch(err => console.error('Error cargando procesos:', err));
  }, [loadCirculares]);

  const toggleSlug = (slug: string) => {
    setSelectedSlugs(prev => (prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]));
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setBodyText('');
    setSelectedSlugs([]);
    setApplyToAll(true);
    setDisplayOrder(0);
    setEmbedUrl('');
    setAttachment(null);
  };

  const handleEditClick = (c: CircularAdmin) => {
    setEditingId(c.id);
    setTitle(c.title);
    setBodyText(c.bodyText || '');
    setApplyToAll(c.processSlugs.length === 0);
    setSelectedSlugs(c.processSlugs);
    setDisplayOrder(c.displayOrder);
    setEmbedUrl(c.embedUrl || '');
    setAttachment(null);
    setSaveMsg(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setSaveMsg('⚠️ El título es obligatorio.');
      return;
    }

    setIsSaving(true);
    setSaveMsg(null);

    try {
      if (editingId) {
        const res = await fetch(`/api/crm/circulares/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            bodyText,
            processSlugs: applyToAll ? [] : selectedSlugs,
            displayOrder,
            embedUrl: embedUrl.trim() || null
          })
        });
        const data = await parseJsonResponse(res);
        if (res.ok && data.success) {
          setSaveMsg('✅ Cambios guardados.');
          resetForm();
          await loadCirculares();
        } else {
          setSaveMsg(`❌ Error: ${data.error || 'No se pudo guardar.'}`);
        }
      } else {
        let res: Response;

        if (attachment && attachment.size > DIRECT_UPLOAD_THRESHOLD_BYTES) {
          // Adjunto grande: se sube directo a Supabase Storage desde el
          // navegador (bypass del límite de 4.5 MB de Vercel) y luego se le
          // pide al servidor que solo registre la referencia.
          setSaveMsg('⏳ Subiendo adjunto grande directo a almacenamiento...');
          const urlRes = await fetch('/api/crm/circulares/upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: attachment.name })
          });
          const urlData = await parseJsonResponse(urlRes);
          if (!urlRes.ok || !urlData.success) {
            throw new Error(urlData.error || 'No se pudo iniciar la carga del adjunto.');
          }

          const supabase = getSupabaseBrowserClient();
          if (!supabase) {
            throw new Error('La carga de adjuntos grandes no está disponible: falta configuración del servidor (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY).');
          }
          const { error: uploadError } = await supabase.storage
            .from('circular-attachments')
            .uploadToSignedUrl(urlData.storagePath, urlData.token, attachment, { contentType: attachment.type || 'application/octet-stream' });
          if (uploadError) {
            throw new Error(uploadError.message);
          }

          res = await fetch('/api/crm/circulares', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              bodyText,
              processSlugs: applyToAll ? [] : selectedSlugs,
              displayOrder,
              embedUrl: embedUrl.trim() || undefined,
              attachmentStoragePath: urlData.storagePath,
              attachmentFileName: attachment.name,
              attachmentContentType: attachment.type || 'application/octet-stream'
            })
          });
        } else {
          const formData = new FormData();
          formData.append('title', title);
          formData.append('bodyText', bodyText);
          formData.append('processSlugs', JSON.stringify(applyToAll ? [] : selectedSlugs));
          formData.append('displayOrder', String(displayOrder));
          if (embedUrl.trim()) formData.append('embedUrl', embedUrl.trim());
          if (attachment) formData.append('attachment', attachment);

          res = await fetch('/api/crm/circulares', { method: 'POST', body: formData });
        }

        const data = await parseJsonResponse(res);

        if (res.ok && data.success) {
          setSaveMsg('✅ Publicación creada como borrador. Publícala cuando esté lista.');
          resetForm();
          await loadCirculares();
        } else {
          setSaveMsg(`❌ Error: ${data.error || 'No se pudo crear la publicación.'}`);
        }
      }
    } catch (err: any) {
      setSaveMsg(`❌ Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (circular: CircularAdmin) => {
    setBusyId(circular.id);
    try {
      const nextStatus = circular.status === 'published' ? 'draft' : 'published';
      const res = await fetch(`/api/crm/circulares/${circular.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        await loadCirculares();
      } else {
        alert(data.error || 'No se pudo actualizar la publicación.');
      }
    } catch (err) {
      console.error('Error actualizando estado:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta publicación definitivamente?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/crm/circulares/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (editingId === id) resetForm();
        await loadCirculares();
      } else {
        alert(data.error || 'No se pudo eliminar la publicación.');
      }
    } catch (err) {
      console.error('Error eliminando:', err);
    } finally {
      setBusyId(null);
    }
  };

  const processName = (slug: string) => processes.find(p => p.slug === slug)?.name || slug;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Contenido Principal</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Información contextual que ven los usuarios al entrar a cada sección. Solo lo publicado se ve en la app.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* FORMULARIO */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">
              <span className="flex items-center gap-2">
                {editingId ? <Pencil className="w-4 h-4 text-amber-600" /> : <Newspaper className="w-4 h-4 text-amber-600" />}
                {editingId ? 'Editar Publicación' : 'Nueva Publicación'}
              </span>
              {editingId && (
                <button onClick={resetForm} className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1">
                  <X className="w-3.5 h-3.5" />
                  Cancelar
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Título:</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ej: Cambio en criterio de inspección de vidrio templado"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Texto (opcional):</label>
                <textarea
                  value={bodyText}
                  onChange={e => setBodyText(e.target.value)}
                  rows={4}
                  placeholder="Contenido informativo..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              {editingId ? (
                <p className="text-[10px] text-slate-400 italic">
                  Para cambiar la imagen/adjunto, elimina esta publicación y crea una nueva.
                </p>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Imagen o adjunto (opcional):</label>
                  <input
                    type="file"
                    accept=".pdf,application/pdf,image/*"
                    onChange={e => setAttachment(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-800 file:text-xs file:font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Recomendado: una imagen — se muestra como imagen principal de la publicación.</p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Enlace embebible (opcional):</label>
                <input
                  type="text"
                  value={embedUrl}
                  onChange={e => setEmbedUrl(e.target.value)}
                  placeholder="Ej: link de Power BI 'Publicar en la Web', o de YouTube"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Si lo llenas, se muestra embebido e interactivo en vez de la imagen (indicador de Power BI, video de YouTube, etc.). En Power BI usa el enlace de &quot;Publicar en la Web&quot;.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Orden de visualización:</label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={e => setDisplayOrder(Number(e.target.value) || 0)}
                  className="w-24 bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">Con varias publicaciones activas, el número más bajo aparece primero en el carrusel.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 flex items-center gap-2 mb-1.5">
                  <input type="checkbox" checked={applyToAll} onChange={e => setApplyToAll(e.target.checked)} />
                  Aplica a todas las áreas
                </label>
                {!applyToAll && (
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2.5 bg-white">
                    {processes.map(p => (
                      <label key={p.slug} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                        <input type="checkbox" checked={selectedSlugs.includes(p.slug)} onChange={() => toggleSlug(p.slug)} />
                        {p.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSaving || !title.trim()}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : editingId ? <Pencil className="w-4 h-4" /> : <Newspaper className="w-4 h-4" />}
                <span>{isSaving ? 'Guardando...' : editingId ? 'Guardar Cambios' : 'Crear como Borrador'}</span>
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

          {/* LISTA */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-sm text-slate-800">Publicaciones ({circulares.length})</span>
              <button onClick={loadCirculares} className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Actualizar
              </button>
            </div>

            {circulares.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">Aún no hay publicaciones creadas.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {circulares.map(c => {
                  const wasEverPublished = !!c.publishedAt;
                  const statusLabel = c.status === 'published' ? 'Publicado' : wasEverPublished ? 'Despublicado' : 'Borrador';
                  return (
                    <div key={c.id} className={`p-4 rounded-xl border bg-white space-y-2 ${editingId === c.id ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-slate-900 text-sm truncate">{c.title}</h4>
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase flex items-center gap-1 ${
                              c.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {c.status === 'published' ? <CheckCircle2 className="w-3 h-3" /> : <FileClock className="w-3 h-3" />}
                              {statusLabel}
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-500">
                              Orden: {c.displayOrder}
                            </span>
                          </div>
                          {c.bodyText && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{c.bodyText}</p>}
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1 flex-wrap">
                            <span>{c.processSlugs.length === 0 ? 'Todas las áreas' : c.processSlugs.map(processName).join(', ')}</span>
                            {c.attachmentFileName && (
                              <span className="flex items-center gap-1">
                                <Paperclip className="w-3 h-3" />
                                {c.attachmentFileName}
                              </span>
                            )}
                            {c.embedUrl && (
                              <span className="flex items-center gap-1 text-blue-500">
                                <Link2 className="w-3 h-3" />
                                Enlace embebido
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleEditClick(c)}
                            title="Editar"
                            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(c)}
                            disabled={busyId === c.id}
                            title={c.status === 'published' ? 'Despublicar' : 'Publicar'}
                            className={`p-2 rounded-lg transition disabled:opacity-50 ${
                              c.status === 'published'
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {c.status === 'published' ? <Undo2 className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                          </button>
                          {role === 'administrador' && (
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={busyId === c.id}
                              title="Eliminar"
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
