'use client';

import React from 'react';

export interface ProcessHealthStats {
  processSlug: string;
  total: number;
  escalated: number;
  resolvedPct: number | null;
}

interface ProcessHealthBadgeProps {
  stats?: ProcessHealthStats;
  /** Versión reducida (solo el punto + %) para las tarjetas del dashboard; la versión completa muestra la etiqueta de texto. */
  compact?: boolean;
}

const THRESHOLD_GREEN = 85;
const THRESHOLD_AMBER = 60;

/**
 * "Andon" digital: semáforo público de qué tan seguido este proceso
 * resuelve solo vs. escala a Calidad, en los últimos 30 días — el mismo
 * principio de manejo visual que un cordón andon de planta, aplicado a
 * criterios en vez de a una línea de ensamble. El equipo ve su propio
 * desempeño, lo que sostiene el orgullo de área mucho más que un reporte
 * que solo ve Calidad.
 */
export const ProcessHealthBadge: React.FC<ProcessHealthBadgeProps> = ({ stats, compact = false }) => {
  if (!stats || stats.resolvedPct === null) {
    return (
      <span
        title="Todavía no hay suficientes consultas en los últimos 30 días para mostrar un resultado confiable."
        className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full whitespace-nowrap"
      >
        ⚪ {compact ? 'Sin datos' : 'Aún sin datos suficientes'}
      </span>
    );
  }

  const { resolvedPct, total, escalated } = stats;
  const level = resolvedPct >= THRESHOLD_GREEN ? 'green' : resolvedPct >= THRESHOLD_AMBER ? 'amber' : 'red';
  const meta = {
    green: { dot: '🟢', label: 'Resuelve solo', className: 'text-emerald-800 bg-emerald-50 border-emerald-200' },
    amber: { dot: '🟡', label: 'Escala a veces', className: 'text-amber-800 bg-amber-50 border-amber-200' },
    red: { dot: '🔴', label: 'Escala seguido', className: 'text-rose-800 bg-rose-50 border-rose-200' }
  }[level];

  return (
    <span
      title={`${resolvedPct}% de las consultas se resolvieron sin escalar a Calidad (${total - escalated} de ${total}, últimos 30 días).`}
      className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${meta.className}`}
    >
      {meta.dot} {resolvedPct}%{!compact && ` · ${meta.label}`}
    </span>
  );
};
