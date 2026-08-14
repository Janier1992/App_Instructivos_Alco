'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Megaphone,
  Paperclip,
  Trash2,
  Send,
  Undo2,
  AlertCircle,
  CheckCircle2,
  FileClock
} from 'lucide-react';
import { ProcessItem } from '@/src/types';
import { useCrmSession } from './CrmSessionContext';

interface CircularAdmin {
  id: string;
  title: string;
  bodyText: string | null;
  attachmentFileName: string | null;
  processSlugs: string[];
  status: 'draft' | 'published';
  createdAt: string;
}

export const CrmCircularesManager: React.FC = () => {
  const { role } = useCrmSession();
  const [circulares, setCirculares] = useState<CircularAdmin[]>([]);
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [applyToAll, setApplyToAll] = useState(true);
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
      console.error('Error cargando circulares:', err);
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

  const handleCreate = async () => {
    if (!title.trim()) {
      setSaveMsg('⚠️ El título es obligatorio.');
      return;
    }

    setIsSaving(true);
    setSaveMsg(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('bodyText', bodyText);
      formData.append('processSlugs', JSON.stringify(applyToAll ? [] : selectedSlugs));
      if (attachment) formData.append('attachment', attachment);

      const res = await fetch('/api/crm/circulares', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok && data.success) {
        setSaveMsg('✅ Circular creada como borrador. Publícala cuando esté lista.');
        setTitle('');
        setBodyText('');
        setSelectedSlugs([]);
        setApplyToAll(true);
        setAttachment(null);
        await loadCirculares();
      } else {
        setSaveMsg(`❌ Error: ${data.error || 'No se pudo crear la circular.'}`);
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
        alert(data.error || 'No se pudo actualizar la circular.');
      }
    } catch (err) {
      console.error('Error actualizando estado de circular:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta circular definitivamente?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/crm/circulares/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await loadCirculares();
      } else {
        alert(data.error || 'No se pudo eliminar la circular.');
      }
    } catch (err) {
      console.error('Error eliminando circular:', err);
    } finally {
      setBusyId(null);
    }
  };

  const processName = (slug: string) => processes.find(p => p.slug === slug)?.name || slug;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Administración de Circulares</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Crea circulares informativas y publícalas cuando estén listas. Solo las publicadas se ven en la app principal.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* FORMULARIO */}
          <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b border-slate-200 pb-2">
              <Megaphone className="w-4 h-4 text-amber-600" />
              <span>Nueva Circular</span>
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
                  placeholder="Contenido de la circular..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Adjunto (opcional, PDF/imagen):</label>
                <input
                  type="file"
                  accept=".pdf,application/pdf,image/*"
                  onChange={e => setAttachment(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-100 file:text-amber-800 file:text-xs file:font-bold"
                />
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
                onClick={handleCreate}
                disabled={isSaving || !title.trim()}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                <span>{isSaving ? 'Guardando...' : 'Crear como Borrador'}</span>
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
              <span className="font-bold text-sm text-slate-800">Circulares ({circulares.length})</span>
              <button onClick={loadCirculares} className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                Actualizar
              </button>
            </div>

            {circulares.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">Aún no hay circulares creadas.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {circulares.map(c => (
                  <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{c.title}</h4>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase flex items-center gap-1 ${
                            c.status === 'published' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {c.status === 'published' ? <CheckCircle2 className="w-3 h-3" /> : <FileClock className="w-3 h-3" />}
                            {c.status === 'published' ? 'Publicada' : 'Borrador'}
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
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
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
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
