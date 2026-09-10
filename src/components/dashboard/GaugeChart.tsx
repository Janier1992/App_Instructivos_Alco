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
export const GaugeChart: React.FC<Props> = ({ value, label, color = '#003366', formatValue }) => {
  const clamped = Math.max(0, Math.min(100, value));
  const data = [{ value: clamped, fill: color }];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={150}>
        <RadialBarChart
          innerRadius="72%"
          outerRadius="100%"
          data={data}
          startAngle={180}
          endAngle={0}
          barSize={16}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={8} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
        <span className="text-2xl font-black tabular-nums" style={{ color }}>
          {formatValue ? formatValue(clamped) : `${clamped.toFixed(0)}%`}
        </span>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
      </div>
    </div>
  );
};
