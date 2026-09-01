'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, ThumbsUp, ThumbsDown, AlertCircle, ShieldAlert, Wrench, Check, X } from 'lucide-react';
import { ProcessPicker } from './ProcessPicker';

interface FeedbackEntry {
  id: string;
  processSlug: string;
  question: string;
  reply: string;
  classification?: string;
  escalationRequired: boolean;
  rating: 'up' | 'down';
  comment?: string;
  rootCause?: string;
  createdAt: string;
}

interface FeedbackSummaryRow {
  processSlug: string;
  up: number;
  down: number;
}

const ROOT_CAUSE_OPTIONS: { value: string; label: string }[] = [
  { value: 'falta_criterio', label: 'Falta de criterio documentado' },
  { value: 'criterio_ambiguo', label: 'Criterio ambiguo o incompleto' },
  { value: 'falta_capacitacion', label: 'Falta de capacitación' },
  { value: 'material_no_conforme', label: 'Material o insumo no conforme' },
  { value: 'error_manipulacion', label: 'Error de manipulación/procedimiento' },
  { value: 'otro', label: 'Otro' }
];

const rootCauseLabel = (value: string) => ROOT_CAUSE_OPTIONS.find(o => o.value === value)?.label || value;

const EMPTY_CRITERION_DRAFT = { parameter: '', acceptance: '', rejection: '', requiredAction: '' };

/**
 * Revisión de la retroalimentación 👍/👎 que deja el colaborador de planta
 * sobre cada respuesta del Agente de IA. Los 👎 aparecen primero — son las
 * respuestas que no sirvieron y probablemente señalan un criterio faltante
 * o mal fundamentado que Calidad debería revisar y documentar.
 *
 * Dos acciones cierran el ciclo real:
 * 1) Clasificar la causa raíz (para saber si el problema de fondo es falta
 *    de documentación, de capacitación, material no conforme, etc.).
 * 2) "Convertir en criterio": cuando la escalación ya se resolvió, Calidad
 *    documenta esa resolución como un criterio nuevo, visible de inmediato
 *    en la Documentación del Proceso y citado por el propio Agente de IA —
 *    así la misma pregunta no vuelve a escalar.
 */
export const CrmChatFeedbackManager: React.FC = () => {
  const [processSlug, setProcessSlug] = useState('');
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [summary, setSummary] = useState<FeedbackSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRootCauseId, setSavingRootCauseId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [criterionDraft, setCriterionDraft] = useState(EMPTY_CRITERION_DRAFT);
  const [savingCriterion, setSavingCriterion] = useState(false);
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/chat-feedback${processSlug ? `?processSlug=${encodeURIComponent(processSlug)}` : ''}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.entries || []);
        setSummary(data.summary || []);
      }
    } catch (err) {
      console.error('Error cargando retroalimentación del chat:', err);
    } finally {
      setLoading(false);
    }
  }, [processSlug]);

  useEffect(() => {
    load();
  }, [load]);

  const totalUp = summary.reduce((sum, s) => sum + s.up, 0);
  const totalDown = summary.reduce((sum, s) => sum + s.down, 0);
  const total = totalUp + totalDown;
  const satisfactionPct = total > 0 ? Math.round((totalUp / total) * 100) : null;

  const rootCauseCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) {
      if (!entry.rootCause) continue;
      counts.set(entry.rootCause, (counts.get(entry.rootCause) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const handleSaveRootCause = async (id: string, rootCause: string) => {
    setSavingRootCauseId(id);
    try {
      const res = await fetch(`/api/crm/chat-feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootCause })
      });
      const data = await res.json();
      if (data.success) {
        setEntries(prev => prev.map(e => (e.id === id ? { ...e, rootCause } : e)));
      } else {
        alert(data.error || 'No se pudo guardar la causa raíz.');
      }
    } catch (err) {
      console.error('Error guardando causa raíz:', err);
    } finally {
      setSavingRootCauseId(null);
    }
  };

  const openConvertForm = (entry: FeedbackEntry) => {
    setConvertingId(entry.id);
    setCriterionDraft(EMPTY_CRITERION_DRAFT);
  };

  const handleSaveCriterion = async (entry: FeedbackEntry) => {
    if (!criterionDraft.parameter.trim() || !criterionDraft.acceptance.trim() || !criterionDraft.rejection.trim() || !criterionDraft.requiredAction.trim()) {
      alert('Completa los cuatro campos del criterio.');
      return;
    }
    setSavingCriterion(true);
    try {
      const res = await fetch('/api/crm/dynamic-criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processSlug: entry.processSlug,
          ...criterionDraft,
          sourceQuestion: entry.question,
          sourceFeedbackId: entry.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setConvertedIds(prev => new Set(prev).add(entry.id));
        setConvertingId(null);
        setCriterionDraft(EMPTY_CRITERION_DRAFT);
      } else {
        alert(data.error || 'No se pudo crear el criterio.');
      }
    } catch (err) {
      console.error('Error creando criterio dinámico:', err);
      alert('No se pudo crear el criterio.');
    } finally {
      setSavingCriterion(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Retroalimentación del Agente de IA</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Lo que el colaborador de planta calificó con 👍/👎 sobre cada respuesta — los 👎 son la señal más directa de qué criterio falta documentar.
          </p>
        </div>
        <ProcessPicker value={processSlug} onChange={setProcessSlug} allowAll />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Satisfacción</span>
          <span className="text-2xl font-extrabold text-[#003366]">{satisfactionPct !== null ? `${satisfactionPct}%` : '—'}</span>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <ThumbsUp className="w-3 h-3" /> Útiles
          </span>
          <span className="text-2xl font-extrabold text-emerald-700">{totalUp}</span>
        </div>
        <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
          <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <ThumbsDown className="w-3 h-3" /> No útiles
          </span>
          <span className="text-2xl font-extrabold text-rose-700">{totalDown}</span>
        </div>
      </div>

      {rootCauseCounts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Causa raíz más frecuente (filtro actual)</span>
          <div className="flex flex-wrap gap-2">
            {rootCauseCounts.map(([cause, count]) => (
              <span key={cause} className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                {rootCauseLabel(cause)} · {count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="font-bold text-sm text-slate-800">Respuestas calificadas</span>
          <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {entries.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">
              {loading ? 'Cargando...' : 'Todavía no hay retroalimentación registrada para este filtro.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => (
              <div
                key={entry.id}
                className={`p-4 rounded-xl border ${entry.rating === 'down' ? 'border-rose-200 bg-rose-50/40' : 'border-slate-200 bg-slate-50/40'}`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {entry.rating === 'down' ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                        <ThumbsDown className="w-3 h-3" /> No útil
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <ThumbsUp className="w-3 h-3" /> Útil
                      </span>
                    )}
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{entry.processSlug}</span>
                    {entry.escalationRequired && (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        <ShieldAlert className="w-3 h-3" /> Escaló
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                    {new Date(entry.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                <p className="text-xs font-bold text-slate-800 mb-1">"{entry.question}"</p>
                <p className="text-xs text-slate-600 whitespace-pre-line line-clamp-3">{entry.reply}</p>

                {entry.comment && (
                  <div className="mt-2 p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700">
                    <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wider mb-0.5">Comentario del colaborador</span>
                    {entry.comment}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Causa raíz:</span>
                  <select
                    value={entry.rootCause || ''}
                    onChange={e => handleSaveRootCause(entry.id, e.target.value)}
                    disabled={savingRootCauseId === entry.id}
                    className="text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#003366] disabled:opacity-50"
                  >
                    <option value="">Sin clasificar</option>
                    {ROOT_CAUSE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  {convertedIds.has(entry.id) ? (
                    <span className="ml-auto flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                      <Check className="w-3.5 h-3.5" /> Criterio creado
                    </span>
                  ) : convertingId !== entry.id ? (
                    <button
                      onClick={() => openConvertForm(entry)}
                      className="ml-auto flex items-center gap-1.5 text-[11px] font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-full transition"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Convertir en criterio
                    </button>
                  ) : null}
                </div>

                {convertingId === entry.id && (
                  <div className="mt-3 p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                    <p className="text-[11px] font-bold text-[#003366]">
                      Documenta cómo se resolvió esta pregunta — quedará disponible de inmediato en la Documentación del Proceso y el Agente de IA la citará en la próxima consulta similar.
                    </p>
                    <input
                      type="text"
                      placeholder="Parámetro (ej. Tolerancia de holgura en marco tipo X)"
                      value={criterionDraft.parameter}
                      onChange={e => setCriterionDraft(prev => ({ ...prev, parameter: e.target.value }))}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <textarea
                      placeholder="Criterio de Aceptación"
                      value={criterionDraft.acceptance}
                      onChange={e => setCriterionDraft(prev => ({ ...prev, acceptance: e.target.value }))}
                      rows={2}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                    <textarea
                      placeholder="Criterio de Rechazo"
                      value={criterionDraft.rejection}
                      onChange={e => setCriterionDraft(prev => ({ ...prev, rejection: e.target.value }))}
                      rows={2}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                    <textarea
                      placeholder="Acción Requerida"
                      value={criterionDraft.requiredAction}
                      onChange={e => setCriterionDraft(prev => ({ ...prev, requiredAction: e.target.value }))}
                      rows={2}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleSaveCriterion(entry)}
                        disabled={savingCriterion}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Guardar criterio
                      </button>
                      <button
                        onClick={() => setConvertingId(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-lg transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
