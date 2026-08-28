'use client';

import React from 'react';
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react';

export type SortDirection = 'desc' | 'asc';

interface SortDateToggleProps {
  direction: SortDirection;
  onToggle: () => void;
  className?: string;
}

/**
 * Alterna el orden por fecha (más reciente primero / más antiguo primero)
 * de una lista — usado en Documentación del Proceso, Publicaciones y Videos
 * para que el usuario elija cómo recorrerlas, en vez de quedar fijo al
 * orden de carga.
 */
export const SortDateToggle: React.FC<SortDateToggleProps> = ({ direction, onToggle, className = '' }) => {
  const isDesc = direction === 'desc';
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition ${className}`}
      title="Cambiar orden por fecha"
    >
      {isDesc ? <ArrowDownWideNarrow className="w-3.5 h-3.5" /> : <ArrowUpWideNarrow className="w-3.5 h-3.5" />}
      <span>{isDesc ? 'Más recientes primero' : 'Más antiguos primero'}</span>
    </button>
  );
};
