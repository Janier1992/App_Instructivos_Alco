import React from 'react';

interface Props {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
}

const TONE_CLASSES: Record<NonNullable<Props['tone']>, string> = {
  default: 'text-slate-900',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600'
};

/** Tarjeta KPI compacta, reutilizada en todas las franjas de métricas del Dashboard operativo. */
export const StatCard: React.FC<Props> = ({ label, value, icon, tone = 'default' }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
    <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
      {icon}
      {label}
    </span>
    <span className={`text-2xl font-extrabold block mt-1 tabular-nums ${TONE_CLASSES[tone]}`}>{value}</span>
  </div>
);
