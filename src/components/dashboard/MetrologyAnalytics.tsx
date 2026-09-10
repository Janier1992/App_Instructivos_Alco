'use client';

import React, { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, LineChart, Line
} from 'recharts';
import { Truck, RefreshCcw as RepeatIcon, Ruler, Package, AlertTriangle } from 'lucide-react';
import { MetrologyDelivery } from '@/src/lib/metrologyDeliveriesStore';
import { MetrologyReplacement } from '@/src/lib/metrologyReplacementsStore';
import { MetrologyCalibration } from '@/src/lib/metrologyCalibrationsStore';
import { getDaysUntilDue, getStatusConfig } from '@/src/lib/metrologyCalibrationUtils';
import { ChartCard, EmptyChartState } from './ChartCard';
import { StatCard } from './StatCard';
import { GaugeChart } from './GaugeChart';
import { CALIBRATION_STATUS_COLORS, colorForIndex } from '@/src/lib/dashboardColors';
import { buildDailyTrend, countBy } from '@/src/lib/dashboardTrend';

interface Props {
  deliveries: MetrologyDelivery[];
  replacements: MetrologyReplacement[];
  calibrations: MetrologyCalibration[];
}

export const MetrologyAnalytics: React.FC<Props> = ({ deliveries, replacements, calibrations }) => {
  return (
    <div className="space-y-8">
      <DeliverySection deliveries={deliveries} />
      <ReplacementSection replacements={replacements} />
      <CalibrationSection calibrations={calibrations} />
    </div>
  );
};

const SectionTitle: React.FC<{ icon: React.ReactNode; title: string; subtitle: string }> = ({ icon, title, subtitle }) => (
  <div className="flex items-center gap-2 mb-3">
    <span className="p-1.5 rounded-lg bg-blue-50 text-[#003366]">{icon}</span>
    <div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="text-[11px] text-slate-500">{subtitle}</p>
    </div>
  </div>
);

const DeliverySection: React.FC<{ deliveries: MetrologyDelivery[] }> = ({ deliveries }) => {
  const totalEquipos = useMemo(() => deliveries.reduce((s, d) => s + d.items.reduce((si, it) => si + (it.cantidad || 0), 0), 0), [deliveries]);

  const byMarca = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of deliveries) {
      for (const item of d.items) {
        const key = item.marca || 'Sin marca';
        counts.set(key, (counts.get(key) || 0) + (item.cantidad || 0));
      }
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [deliveries]);

  const byArea = useMemo(() => countBy(deliveries, d => d.area).slice(0, 10), [deliveries]);
  const trend = useMemo(() => buildDailyTrend(deliveries, d => d.fecha, [{ key: 'actas' }]), [deliveries]);

  return (
    <section>
      <SectionTitle icon={<Truck className="w-4 h-4" />} title="Entrega de Equipos" subtitle="Actas de entrega de herramientas y equipos de medición" />
      {deliveries.length === 0 ? (
        <ChartCard title="Sin datos"><EmptyChartState label="Aún no hay actas de entrega registradas." /></ChartCard>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Actas registradas" value={deliveries.length} icon={<Truck className="w-3.5 h-3.5" />} />
            <StatCard label="Equipos entregados" value={totalEquipos} icon={<Package className="w-3.5 h-3.5" />} />
            <StatCard label="Marcas distintas" value={byMarca.length} icon={<Ruler className="w-3.5 h-3.5" />} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Equipos entregados por marca">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={byMarca} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {byMarca.map((entry, idx) => <Cell key={entry.name} fill={colorForIndex(idx)} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Actas por área">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={byArea} margin={{ top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={55} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="value" position="top" fontSize={11} fontWeight={700} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <ChartCard title="Tendencia de actas de entrega (últimos 30 días)">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="actas" name="Actas" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </section>
  );
};

const ReplacementSection: React.FC<{ replacements: MetrologyReplacement[] }> = ({ replacements }) => {
  const bySeCobra = useMemo(() => countBy(replacements, r => r.seCobraEquipo || 'Sin dato'), [replacements]);
  const byArea = useMemo(() => countBy(replacements, r => r.areaUso).slice(0, 10), [replacements]);
  const trend = useMemo(() => buildDailyTrend(replacements, r => r.fechaRegistro, [{ key: 'registros' }]), [replacements]);

  return (
    <section>
      <SectionTitle icon={<RepeatIcon className="w-4 h-4" />} title="Reposición y Baja" subtitle="Ciclo de vida de equipos de medición" />
      {replacements.length === 0 ? (
        <ChartCard title="Sin datos"><EmptyChartState label="Aún no hay registros de reposición o baja." /></ChartCard>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Registros" value={replacements.length} icon={<RepeatIcon className="w-3.5 h-3.5" />} />
            <StatCard
              label="Con cobro al colaborador"
              value={replacements.filter(r => r.seCobraEquipo === 'SI').length}
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
              tone={replacements.some(r => r.seCobraEquipo === 'SI') ? 'warning' : 'default'}
            />
            <StatCard label="Áreas distintas" value={byArea.length} icon={<Ruler className="w-3.5 h-3.5" />} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="¿Se cobra el equipo al colaborador?">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={bySeCobra} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                    {bySeCobra.map((entry, idx) => (
                      <Cell key={entry.name} fill={entry.name === 'SI' ? '#ef4444' : entry.name === 'NO' ? '#10b981' : '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Registros por área de uso">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byArea} margin={{ top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={55} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f97316" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="value" position="top" fontSize={11} fontWeight={700} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <ChartCard title="Tendencia de registros (últimos 30 días)">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="registros" name="Registros" stroke="#f97316" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </section>
  );
};

const CalibrationSection: React.FC<{ calibrations: MetrologyCalibration[] }> = ({ calibrations }) => {
  const withStatus = useMemo(
    () => calibrations.map(c => ({ ...c, daysLeft: getDaysUntilDue(c.dueDate), cfg: getStatusConfig(c.status, getDaysUntilDue(c.dueDate)) })),
    [calibrations]
  );

  const byStatus = useMemo(() => countBy(withStatus, c => c.cfg.label), [withStatus]);
  const vigentePct = calibrations.length === 0 ? 0 : (withStatus.filter(c => c.cfg.label === 'VIGENTE').length / calibrations.length) * 100;

  const upcoming = useMemo(
    () => withStatus.filter(c => c.cfg.label === 'VENCIDO' || c.cfg.label === 'PRÓXIMO').sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 8),
    [withStatus]
  );

  return (
    <section>
      <SectionTitle icon={<Ruler className="w-4 h-4" />} title="Control Calibración" subtitle="Cronograma maestro de calibración de instrumentos" />
      {calibrations.length === 0 ? (
        <ChartCard title="Sin datos"><EmptyChartState label="Aún no hay instrumentos vinculados al cronograma." /></ChartCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ChartCard title="Vigencia general">
            <GaugeChart value={vigentePct} label="Vigentes" color={vigentePct >= 80 ? '#10b981' : vigentePct >= 50 ? '#f59e0b' : '#ef4444'} />
          </ChartCard>

          <ChartCard title="Distribución por estado">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false}>
                  {byStatus.map(entry => <Cell key={entry.name} fill={CALIBRATION_STATUS_COLORS[entry.name] || '#64748b'} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Próximos a vencer / vencidos" subtitle="Ordenados por urgencia">
            {upcoming.length === 0 ? (
              <EmptyChartState label="Ningún instrumento vencido o próximo a vencer." />
            ) : (
              <ul className="space-y-1.5 max-h-[200px] overflow-y-auto pr-1">
                {upcoming.map(c => (
                  <li key={c.id} className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{c.tool}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{c.code}</p>
                    </div>
                    <span className={`shrink-0 ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.cfg.bg} ${c.cfg.text} ${c.cfg.border}`}>
                      {c.daysLeft >= 0 ? `${c.daysLeft}d` : `${Math.abs(c.daysLeft)}d vencido`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </div>
      )}
    </section>
  );
};
