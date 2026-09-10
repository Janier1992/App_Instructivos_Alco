import React from 'react';

interface Props {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Chrome consistente para cada tarjeta de gráfico del Dashboard operativo. */
export const ChartCard: React.FC<Props> = ({ title, subtitle, icon, action, className, children }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 ${className || ''}`}>
    <div className="flex items-start justify-between gap-2 mb-3">
      <div>
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          {icon}
          {title}
        </h3>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

export const EmptyChartState: React.FC<{ label?: string }> = ({ label = 'Aún no hay registros suficientes para esta métrica.' }) => (
  <div className="flex items-center justify-center text-center text-xs text-slate-400 py-12">{label}</div>
);
