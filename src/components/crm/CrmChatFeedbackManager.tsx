'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ThumbsUp, ThumbsDown, AlertCircle, ShieldAlert } from 'lucide-react';
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
  createdAt: string;
}

interface FeedbackSummaryRow {
  processSlug: string;
  up: number;
  down: number;
}

/**
 * Revisión de la retroalimentación 👍/👎 que deja el colaborador de planta
 * sobre cada respuesta del Agente de IA. Los 👎 aparecen primero — son las
 * respuestas que no sirvieron y probablemente señalan un criterio faltante
 * o mal fundamentado que Calidad debería revisar y documentar.
 */
export const CrmChatFeedbackManager: React.FC = () => {
  const [processSlug, setProcessSlug] = useState('');
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [summary, setSummary] = useState<FeedbackSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);

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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
