'use client';

import React, { useMemo } from 'react';
import {
  Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  ComposedChart, Area, Line
} from 'recharts';
import { ClipboardCheck, PackageX, ShieldAlert, Layers } from 'lucide-react';
import { FieldInspectionsDashboardStats } from '@/src/lib/fieldInspectionsStore';
import { ChartCard, EmptyChartState } from './ChartCard';
import { StatCard } from './StatCard';
import { GaugeChart } from './GaugeChart';
import { DonutChart } from './DonutChart';
import { ChartTooltip } from './ChartTooltip';
import { ESTADO_COLORS } from '@/src/lib/dashboardColors';
import { withMovingAverage } from '@/src/lib/dashboardTrend';

interface Props {
  stats: FieldInspectionsDashboardStats;
  days: number;
}

/**
 * Recibe métricas ya agregadas en el servidor (ver
 * getFieldInspectionsDashboardStats / /api/field-inspections/stats) en vez
 * de la lista cruda de inspecciones — con decenas de miles de filas por
 * carga masiva, calcular estos totales en el navegador sobre un recorte
 * arbitrario de filas daba métricas incorrectas.
 */
export const FieldInspectionsAnalytics: React.FC<Props> = ({ stats, days }) => {
  const { total, byEstado, byDefecto, byArea, approvedCount, criticalCount, cantTotalSum, cantRetenidaSum, periodComparison } = stats;

  const approvalRate = total === 0 ? 0 : (approvedCount / total) * 100;
  const deltaPct = periodComparison.previous === 0 ? null : ((periodComparison.current - periodComparison.previous) / periodComparison.previous) * 100;

  const trend = useMemo(() => {
    const base = stats.trend.map(row => ({
      date: new Date(`${row.date}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
      total: row.total,
      rechazadas: row.rechazadas
    }));
    return withMovingAverage(base, 'total', 7);
  }, [stats.trend]);
  const sparkline = useMemo(() => trend.map(row => Number(row.total)), [trend]);

  if (total === 0) {
    return (
      <ChartCard title="Inspecciones en Campo" icon={<ClipboardCheck className="w-4 h-4 text-[#003366]" />}>
        <EmptyChartState label="Aún no hay inspecciones registradas. Las métricas aparecerán automáticamente en cuanto se registre la primera." />
      </ChartCard>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Inspecciones registradas"
          value={total}
          icon={<ClipboardCheck className="w-3.5 h-3.5" />}
          deltaPct={deltaPct}
          sparkline={sparkline}
        />
        <StatCard label="Unidades inspeccionadas" value={cantTotalSum} icon={<Layers className="w-3.5 h-3.5" />} />
        <StatCard label="Unidades retenidas" value={cantRetenidaSum} icon={<PackageX className="w-3.5 h-3.5" />} tone={cantRetenidaSum > 0 ? 'warning' : 'default'} />
        <StatCard label="Alertas críticas (IA)" value={criticalCount} icon={<ShieldAlert className="w-3.5 h-3.5" />} tone={criticalCount > 0 ? 'danger' : 'default'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Tasa de aprobación" subtitle="Aprobado + Aprobado (Condicionado) / total">
          <GaugeChart value={approvalRate} label="Aprobación" color={approvalRate >= 90 ? '#059669' : approvalRate >= 70 ? '#d97706' : '#dc2626'} />
        </ChartCard>

        <ChartCard title="Distribución por estado SGC" className="lg:col-span-2" subtitle="Clic en la leyenda para ocultar/mostrar un estado">
          <DonutChart data={byEstado} colorFor={name => ESTADO_COLORS[name] || '#64748b'} centerLabel="Inspecciones" valueLabel="inspección(es)" />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Defectos técnicos más frecuentes" subtitle="Excluye 'NINGUNO'">
          {byDefecto.length === 0 ? (
            <EmptyChartState label="Sin defectos registrados — buena señal." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byDefecto} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                <Tooltip content={<ChartTooltip valueSuffix=" ocurrencia(s)" />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" name="Ocurrencias" fill="#dc2626" radius={[0, 6, 6, 0]}>
                  <LabelList dataKey="value" position="right" fontSize={11} fontWeight={700} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Inspecciones por área de proceso">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byArea} margin={{ top: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<ChartTooltip valueSuffix=" inspección(es)" />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" name="Inspecciones" fill="#2563eb" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="value" position="top" fontSize={11} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title={`Tendencia de inspecciones (últimos ${days} días)`} subtitle="Total y rechazadas por día, con media móvil de 7 días">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={trend}>
            <defs>
              <linearGradient id="fiTotalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fiRejectGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.ceil(days / 7)} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip hideKeys={['totalAvg']} />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="total" name="Total" stroke="#2563eb" fill="url(#fiTotalGradient)" strokeWidth={2} />
            <Area type="monotone" dataKey="rechazadas" name="Rechazadas" stroke="#dc2626" fill="url(#fiRejectGradient)" strokeWidth={2} />
            <Line type="monotone" dataKey="totalAvg" name="Tendencia (media móvil 7d)" stroke="#0f172a" strokeWidth={2} strokeDasharray="4 3" dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};
