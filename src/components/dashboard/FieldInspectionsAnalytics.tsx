'use client';

import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
  AreaChart, Area
} from 'recharts';
import { ClipboardCheck, PackageX, ShieldAlert, Layers } from 'lucide-react';
import { FieldInspection } from '@/src/lib/fieldInspectionsStore';
import { ChartCard, EmptyChartState } from './ChartCard';
import { StatCard } from './StatCard';
import { GaugeChart } from './GaugeChart';
import { ESTADO_COLORS, colorForIndex } from '@/src/lib/dashboardColors';
import { buildDailyTrend, countBy } from '@/src/lib/dashboardTrend';

interface Props {
  inspections: FieldInspection[];
}

export const FieldInspectionsAnalytics: React.FC<Props> = ({ inspections }) => {
  const total = inspections.length;

  const byEstado = useMemo(() => countBy(inspections, i => i.estado), [inspections]);
  const byDefecto = useMemo(
    () => countBy(inspections.filter(i => i.defecto && i.defecto !== 'NINGUNO'), i => i.defecto).slice(0, 8),
    [inspections]
  );
  const byArea = useMemo(() => countBy(inspections, i => i.areaProceso).slice(0, 10), [inspections]);

  const approvalRate = useMemo(() => {
    if (total === 0) return 0;
    const approved = inspections.filter(i => i.estado.startsWith('Aprobado')).length;
    return (approved / total) * 100;
  }, [inspections, total]);

  const criticalCount = useMemo(() => inspections.filter(i => i.alertLevel === 'Critical').length, [inspections]);
  const cantTotalSum = useMemo(() => inspections.reduce((s, i) => s + (i.cantTotal || 0), 0), [inspections]);
  const cantRetenidaSum = useMemo(() => inspections.reduce((s, i) => s + (i.cantRetenida || 0), 0), [inspections]);

  const trend = useMemo(
    () =>
      buildDailyTrend(
        inspections,
        i => i.fecha,
        [
          { key: 'total' },
          { key: 'rechazadas', predicate: i => i.estado === 'Rechazado' }
        ]
      ),
    [inspections]
  );

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
        <StatCard label="Inspecciones registradas" value={total} icon={<ClipboardCheck className="w-3.5 h-3.5" />} />
        <StatCard label="Unidades inspeccionadas" value={cantTotalSum} icon={<Layers className="w-3.5 h-3.5" />} />
        <StatCard label="Unidades retenidas" value={cantRetenidaSum} icon={<PackageX className="w-3.5 h-3.5" />} tone={cantRetenidaSum > 0 ? 'warning' : 'default'} />
        <StatCard label="Alertas críticas (IA)" value={criticalCount} icon={<ShieldAlert className="w-3.5 h-3.5" />} tone={criticalCount > 0 ? 'danger' : 'default'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Tasa de aprobación" subtitle="Aprobado + Aprobado (Condicionado) / total">
          <GaugeChart value={approvalRate} label="Aprobación" color={approvalRate >= 90 ? '#10b981' : approvalRate >= 70 ? '#f59e0b' : '#ef4444'} />
        </ChartCard>

        <ChartCard title="Distribución por estado SGC" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byEstado} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                {byEstado.map((entry, idx) => (
                  <Cell key={entry.name} fill={ESTADO_COLORS[entry.name] || colorForIndex(idx)} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number, name: string) => [`${value} inspección(es)`, name]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
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
                <Tooltip formatter={(value: number) => [`${value}`, 'Ocurrencias']} />
                <Bar dataKey="value" fill="#ef4444" radius={[0, 6, 6, 0]}>
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
              <Tooltip />
              <Bar dataKey="value" fill="#003366" radius={[6, 6, 0, 0]}>
                <LabelList dataKey="value" position="top" fontSize={11} fontWeight={700} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Tendencia de inspecciones (últimos 30 días)" subtitle="Total registradas vs. rechazadas por día">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="fiTotalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#003366" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#003366" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fiRejectGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="total" name="Total" stroke="#003366" fill="url(#fiTotalGradient)" strokeWidth={2} />
            <Area type="monotone" dataKey="rechazadas" name="Rechazadas" stroke="#ef4444" fill="url(#fiRejectGradient)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
};
