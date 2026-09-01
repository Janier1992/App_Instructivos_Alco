'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, AlertTriangle, TrendingDown, MessageCircleWarning } from 'lucide-react';

interface BottleneckRow {
  processSlug: string;
  processName: string;
  total: number;
  escalated: number;
  resolvedPct: number | null;
  topEscalatedQuestions: { question: string; count: number }[];
}

const THRESHOLD_GREEN = 85;
const THRESHOLD_AMBER = 60;

function levelFor(resolvedPct: number | null): 'green' | 'amber' | 'red' | 'gray' {
  if (resolvedPct === null) return 'gray';
  if (resolvedPct >= THRESHOLD_GREEN) return 'green';
  if (resolvedPct >= THRESHOLD_AMBER) return 'amber';
  return 'red';
}

const LEVEL_META = {
  green: { dot: '🟢', className: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
  amber: { dot: '🟡', className: 'text-amber-800 bg-amber-50 border-amber-200' },
  red: { dot: '🔴', className: 'text-rose-800 bg-rose-50 border-rose-200' },
  gray: { dot: '⚪', className: 'text-slate-500 bg-slate-100 border-slate-200' }
};

/**
 * "¿Dónde sigue Calidad siendo cuello de botella?" — rankea los 8 procesos
 * por qué tan seguido escalan (peor primero) y, para cada uno, muestra las
 * preguntas que más se repitieron entre las que escalaron: la señal más
 * directa de qué criterio conviene documentar (o "cerrar el ciclo" desde
 * Retroalimentación IA) primero, en vez de adivinar.
 */
export const CrmBottlenecksPanel: React.FC = () => {
  const [rows, setRows] = useState<BottleneckRow[]>([]);
  const [minSample, setMinSample] = useState(5);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/bottlenecks');
      const data = await res.json();
      if (data.success) {
        setRows(data.rows || []);
        setMinSample(data.minSample || 5);
      }
    } catch (err) {
      console.error('Error cargando panel de cuellos de botella:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">¿Dónde sigue Calidad siendo cuello de botella?</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Últimos 30 días, peor primero. Un proceso necesita al menos {minSample} consultas en la ventana para mostrar un % confiable.
          </p>
        </div>
        <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1 shrink-0">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="p-10 text-center text-slate-400 text-sm flex items-center justify-center gap-2 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Cargando...
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(row => {
            const level = levelFor(row.resolvedPct);
            const meta = LEVEL_META[level];
            return (
              <div key={row.processSlug} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="font-bold text-sm text-slate-900">{row.processName}</span>
                  <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${meta.className}`}>
                    {meta.dot} {row.resolvedPct !== null ? `${row.resolvedPct}% resuelto sin escalar` : 'Sin datos suficientes'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" />
                    {row.total} consulta{row.total === 1 ? '' : 's'} · {row.escalated} escaló{row.escalated === 1 ? '' : 'aron'}
                  </span>
                </div>

                {row.topEscalatedQuestions.length > 0 ? (
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                      <MessageCircleWarning className="w-3.5 h-3.5" />
                      Preguntas que se repiten sin criterio documentado
                    </span>
                    <ul className="space-y-1">
                      {row.topEscalatedQuestions.map((q, idx) => (
                        <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                          <span className="shrink-0 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full mt-0.5">×{q.count}</span>
                          <span>"{q.question}"</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : row.escalated > 0 ? (
                  <p className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 italic">
                    Escaló, pero ninguna pregunta se repitió todavía — nada urgente que documentar por volumen.
                  </p>
                ) : null}
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <AlertTriangle className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">Todavía no hay procesos configurados.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
