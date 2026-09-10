'use client';

import React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';

interface Props {
  /** 0-100 */
  value: number;
  label: string;
  color?: string;
  formatValue?: (v: number) => string;
}

/** Velocímetro (semicírculo) — usado para tasas/porcentajes: aprobación, vigencia de calibración, etc. */
export const GaugeChart: React.FC<Props> = ({ value, label, color = '#2563eb', formatValue }) => {
  const clamped = Math.max(0, Math.min(100, value));
  const data = [{ value: clamped, fill: color }];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={160}>
        <RadialBarChart innerRadius="75%" outerRadius="100%" data={data} startAngle={180} endAngle={0} barSize={18}>
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={9} isAnimationActive />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* Marcas de escala 0 / 50 / 100 */}
      <div className="absolute inset-x-4 top-[64px] flex justify-between text-[9px] font-bold text-slate-300 pointer-events-none">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-end pb-2 pointer-events-none">
        <span className="text-3xl font-black tabular-nums leading-none" style={{ color }}>
          {formatValue ? formatValue(clamped) : `${clamped.toFixed(0)}%`}
        </span>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-1">{label}</span>
      </div>
    </div>
  );
};
