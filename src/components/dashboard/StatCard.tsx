import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface Props {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  /** % de cambio vs. el periodo anterior equivalente. null = sin datos previos para comparar. undefined = no se muestra. */
  deltaPct?: number | null;
  /** Serie corta para el mini-gráfico de tendencia embebido en la tarjeta. */
  sparkline?: number[];
}

const TONE_CLASSES: Record<NonNullable<Props['tone']>, string> = {
  default: 'text-slate-900',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600'
};

const TONE_ACCENT: Record<NonNullable<Props['tone']>, string> = {
  default: '#2563eb',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626'
};

/** Tarjeta KPI — con delta de tendencia y sparkline opcionales, estilo panel ejecutivo. */
export const StatCard: React.FC<Props> = ({ label, value, icon, tone = 'default', deltaPct, sparkline }) => {
  const accent = TONE_ACCENT[tone];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 relative overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
            {icon}
            {label}
          </span>
          <span className={`text-2xl font-extrabold block mt-1 tabular-nums ${TONE_CLASSES[tone]}`}>{value}</span>
          {deltaPct !== undefined && <DeltaBadge deltaPct={deltaPct} />}
        </div>

        {sparkline && sparkline.length > 1 && (
          <div className="w-16 h-8 shrink-0 mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkline.map(v => ({ v }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`spark-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={accent} strokeWidth={1.5} fill={`url(#spark-${label.replace(/\s+/g, '')})`} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

const DeltaBadge: React.FC<{ deltaPct: number | null }> = ({ deltaPct }) => {
  if (deltaPct === null) {
    return <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-400 mt-1">Sin periodo previo</span>;
  }
  const rounded = Math.round(deltaPct);
  if (rounded === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-400 mt-1">
        <Minus className="w-3 h-3" /> Igual que el periodo anterior
      </span>
    );
  }
  const isUp = rounded > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold mt-1 ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}
      {rounded}% vs. periodo anterior
    </span>
  );
};
