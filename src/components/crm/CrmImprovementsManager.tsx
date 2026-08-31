'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Lightbulb, Clock, Eye, CheckCircle2, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { ProcessPicker } from './ProcessPicker';
import { useCrmSession } from './CrmSessionContext';

type ImprovementStatus = 'proposed' | 'in_review' | 'implemented' | 'rejected';

interface Improvement {
  id: string;
  processSlug: string;
  title: string;
  description: string;
  relatedCriterion: string | null;
  authorName: string | null;
  status: ImprovementStatus;
  adminNote: string | null;
  createdAt: string;
}

const STATUS_OPTIONS: { value: ImprovementStatus; label: string; icon: React.ElementType; className: string }[] = [
  { value: 'proposed', label: 'Propuesta', icon: Clock, className: 'bg-slate-100 text-slate-700 border-slate-300' },
  { value: 'in_review', label: 'En revisión', icon: Eye, className: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'implemented', label: 'Implementada', icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'rejected', label: 'No procede', icon: XCircle, className: 'bg-rose-100 text-rose-700 border-rose-300' }
];

/**
 * Buzón de mejora digital ("Kaizen"): revisión de las propuestas que el
 * colaborador de planta manda desde cada proceso. Cambiar el estado aquí es
 * lo que el colaborador ve reflejado en la vista pública — es el mecanismo
 * completo que sostiene el compromiso: la gente ve que su idea sí avanza.
 */
export const CrmImprovementsManager: React.FC = () => {
  const { role } = useCrmSession();
  const [processSlug, setProcessSlug] = useState('');
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [publishDrafts, setPublishDrafts] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/improvements${processSlug ? `?processSlug=${encodeURIComponent(processSlug)}` : ''}`);
      const data = await res.json();
      if (data.success) setImprovements(data.improvements || []);
    } catch (err) {
      console.error('Error cargando propuestas de mejora:', err);
    } finally {
      setLoading(false);
    }
  }, [processSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (id: string, status: ImprovementStatus) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/crm/improvements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote: noteDrafts[id], publishRecognition: publishDrafts[id] !== false })
      });
      const data = await res.json();
      if (data.success) {
        await load();
      } else {
        alert(data.error || 'No se pudo actualizar la propuesta.');
      }
    } catch (err) {
      console.error('Error actualizando propuesta:', err);
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta propuesta definitivamente?')) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/crm/improvements/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await load();
      } else {
        alert(data.error || 'No se pudo eliminar la propuesta.');
      }
    } catch (err) {
      console.error('Error eliminando propuesta:', err);
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = improvements.filter(i => i.status === 'proposed' || i.status === 'in_review').length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Buzón de Mejoras</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Propuestas de mejora que el colaborador envía desde cada proceso — {pendingCount} por revisar.
          </p>
        </div>
        <ProcessPicker value={processSlug} onChange={setProcessSlug} allowAll />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            Propuestas
          </span>
          <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {improvements.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">
              {loading ? 'Cargando...' : 'Todavía no hay propuestas de mejora para este filtro.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {improvements.map((imp) => (
              <div key={imp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">{imp.title}</p>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{imp.processSlug}</span>
                    </div>
                    {imp.relatedCriterion && (
                      <p className="text-[11px] text-slate-500 mt-0.5">Sobre: {imp.relatedCriterion}</p>
                    )}
                  </div>
                  {role === 'administrador' && (
                    <button
                      onClick={() => handleDelete(imp.id)}
                      disabled={busyId === imp.id}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition shrink-0"
                      title="Eliminar propuesta"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-700 whitespace-pre-wrap">{imp.description}</p>

                <p className="text-[10px] text-slate-400">
                  {imp.authorName || 'Anónimo'} · {new Date(imp.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {STATUS_OPTIONS.map(({ value, label, icon: Icon, className }) => (
                    <button
                      key={value}
                      onClick={() => handleStatusChange(imp.id, value)}
                      disabled={busyId === imp.id}
                      className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border transition disabled:opacity-50 ${
                        imp.status === value ? className : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  defaultValue={imp.adminNote || ''}
                  onChange={(e) => setNoteDrafts(prev => ({ ...prev, [imp.id]: e.target.value }))}
                  placeholder="Nota para el colaborador (opcional) — se guarda al cambiar el estado"
                  className="w-full text-xs px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />

                {imp.status !== 'implemented' && (
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={publishDrafts[imp.id] !== false}
                      onChange={(e) => setPublishDrafts(prev => ({ ...prev, [imp.id]: e.target.checked }))}
                      className="accent-amber-500"
                    />
                    Publicar reconocimiento en Principal al marcar como Implementada
                  </label>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
