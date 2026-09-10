'use client';

import React from 'react';

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

interface Props {
  active?: boolean;
  label?: string | number;
  payload?: TooltipEntry[];
  /** Oculta series auxiliares (p. ej. la media móvil) de la lista, mostrando solo su efecto visual en la línea. */
  hideKeys?: string[];
  valueSuffix?: string;
}

/** Tooltip con estilo de tarjeta (sombra, bordes redondeados) — reemplaza el tooltip plano por defecto de recharts en todos los gráficos del Dashboard. */
export const ChartTooltip: React.FC<Props> = ({ active, label, payload, hideKeys = [], valueSuffix = '' }) => {
  if (!active || !payload || payload.length === 0) return null;

  const visible = payload.filter(p => !hideKeys.includes(String(p.dataKey)));
  if (visible.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs min-w-[120px]">
      {label !== undefined && <p className="font-bold text-slate-700 mb-1">{label}</p>}
      <div className="space-y-1">
        {visible.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="font-bold text-slate-900 tabular-nums">
              {entry.value}
              {valueSuffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
