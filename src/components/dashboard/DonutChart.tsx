'use client';

import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector } from 'recharts';
import { ChartTooltip } from './ChartTooltip';
import { colorForIndex } from '@/src/lib/dashboardColors';

interface Slice {
  name: string;
  value: number;
}

interface Props {
  data: Slice[];
  height?: number;
  colorFor?: (name: string, index: number) => string;
  centerLabel?: string;
  valueLabel?: string;
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />;
};

/**
 * Dona interactiva estilo Power BI: leyenda clicable para ocultar/mostrar
 * series, resaltado al pasar el mouse y total centrado que se recalcula
 * según lo que quede visible.
 */
export const DonutChart: React.FC<Props> = ({ data, height = 220, colorFor, centerLabel = 'Total', valueLabel = 'registro(s)' }) => {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visible = useMemo(() => data.filter(d => !hidden.has(d.name)), [data, hidden]);
  const total = useMemo(() => visible.reduce((s, d) => s + d.value, 0), [visible]);

  const toggle = (name: string) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={visible}
            dataKey="value"
            nameKey="name"
            innerRadius="60%"
            outerRadius="88%"
            paddingAngle={2}
            activeShape={renderActiveShape}
          >
            {visible.map((entry, idx) => (
              <Cell key={entry.name} fill={colorFor ? colorFor(entry.name, idx) : colorForIndex(idx)} cursor="pointer" />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip valueSuffix={` ${valueLabel}`} />} />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value: string) => <span className={hidden.has(value) ? 'text-slate-300 line-through' : 'text-slate-600'}>{value}</span>}
            onClick={(entry: any) => toggle(entry.value)}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingBottom: 28 }}>
        <span className="text-2xl font-black text-slate-900 tabular-nums">{total}</span>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{centerLabel}</span>
      </div>
    </div>
  );
};
