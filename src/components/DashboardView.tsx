'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, ClipboardCheck, Wrench, AlertOctagon } from 'lucide-react';
import { FieldInspectionsDashboardStats } from '@/src/lib/fieldInspectionsStore';
import { MetrologyDelivery } from '@/src/lib/metrologyDeliveriesStore';
import { MetrologyReplacement } from '@/src/lib/metrologyReplacementsStore';
import { MetrologyCalibration } from '@/src/lib/metrologyCalibrationsStore';
import { getDaysUntilDue, getStatusConfig } from '@/src/lib/metrologyCalibrationUtils';
import { buildDailyTrend, compareToPreviousPeriod } from '@/src/lib/dashboardTrend';
import { FieldInspectionsAnalytics } from './dashboard/FieldInspectionsAnalytics';
import { MetrologyAnalytics } from './dashboard/MetrologyAnalytics';
import { StatCard } from './dashboard/StatCard';

const AUTO_REFRESH_MS = 60_000;
const PERIOD_OPTIONS = [7, 30, 90] as const;

type DashboardTab = 'inspecciones' | 'metrologia';

interface OperationalData {
  /** null cuando aún no se ejecutó la migración de la función SQL de agregación (ver db/migrate_field_inspections_dashboard_stats.sql). */
  inspectionStats: FieldInspectionsDashboardStats | null;
  deliveries: MetrologyDelivery[];
  replacements: MetrologyReplacement[];
  calibrations: MetrologyCalibration[];
}

/**
 * Dashboard operativo de Control Calidad — métricas en vivo de los
 * registros de Inspecciones en Campo y Metrología Pro (Entrega de
 * Equipos, Reposición y Baja, Control Calibración). Reemplaza al panel
 * anterior de cobertura de documentación RAG.
 */
export const DashboardView: React.FC = () => {
  const [data, setData] = useState<OperationalData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tab, setTab] = useState<DashboardTab>('inspecciones');
  const [days, setDays] = useState<number>(30);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [inspRes, delivRes, replRes, calibRes] = await Promise.all([
        fetch(`/api/field-inspections/stats?days=${days}`),
        fetch('/api/metrology-deliveries'),
        fetch('/api/metrology-replacements'),
        fetch('/api/metrology-calibrations')
      ]);
      const [inspData, delivData, replData, calibData] = await Promise.all([
        inspRes.json(),
        delivRes.json(),
        replRes.json(),
        calibRes.json()
      ]);
      if (!inspData.success) console.error('Error cargando métricas de inspecciones:', inspData.error);
      setData({
        inspectionStats: inspData.success ? inspData.stats : null,
        deliveries: delivData.deliveries || [],
        replacements: replData.replacements || [],
        calibrations: calibData.calibrations || []
      });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error cargando el dashboard operativo:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => load(true), AUTO_REFRESH_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  const overdueCalibrations = useMemo(() => {
    if (!data) return 0;
    return data.calibrations.filter(c => getStatusConfig(c.status, getDaysUntilDue(c.dueDate)).label === 'VENCIDO').length;
  }, [data]);

  const totalMetrologyRecords = data ? data.deliveries.length + data.replacements.length + data.calibrations.length : 0;
  const rejectedInspections = data?.inspectionStats ? data.inspectionStats.rejectedCount : 0;

  const inspectionsComparison = useMemo(() => {
    if (!data?.inspectionStats) return null;
    const { current, previous } = data.inspectionStats.periodComparison;
    return { current, previous, deltaPct: previous === 0 ? null : ((current - previous) / previous) * 100 };
  }, [data]);
  const inspectionsSparkline = useMemo(() => (data?.inspectionStats ? data.inspectionStats.trend.map(row => row.total) : []), [data]);

  const metrologyComparison = useMemo(() => {
    if (!data) return null;
    const combined = [
      ...data.deliveries.map(d => d.fecha),
      ...data.replacements.map(r => r.fechaRegistro)
    ].map(fecha => ({ fecha }));
    return compareToPreviousPeriod(combined, r => r.fecha, days);
  }, [data, days]);
  const metrologySparkline = useMemo(() => {
    if (!data) return [];
    const combined = [
      ...data.deliveries.map(d => ({ fecha: d.fecha })),
      ...data.replacements.map(r => ({ fecha: r.fechaRegistro }))
    ];
    return buildDailyTrend(combined, r => r.fecha, [{ key: 'total' }], days).map(row => Number(row.total));
  }, [data, days]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#002244] via-[#003366] to-[#00498f] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">Dashboard Operativo</h2>
            <span className="bg-white/15 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full border border-white/20">
              Inspecciones en Campo • Metrología Pro
            </span>
          </div>
          <p className="text-xs text-blue-100 mt-1">
            Métricas en vivo a partir de los registros de Control Calidad — se actualiza automáticamente cada minuto.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center bg-white/10 border border-white/20 rounded-xl p-0.5">
            {PERIOD_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setDays(opt)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  days === opt ? 'bg-white text-[#003366] shadow-sm' : 'text-blue-100 hover:text-white'
                }`}
              >
                {opt}d
              </button>
            ))}
          </div>
          {lastUpdated && (
            <span className="text-[11px] text-blue-200">
              Actualizado {lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => load()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {!data ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center text-slate-400 text-sm">
          Cargando métricas...
        </div>
      ) : (
        <>
          {/* KPI global */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Inspecciones registradas"
              value={data.inspectionStats?.total ?? '—'}
              icon={<ClipboardCheck className="w-3.5 h-3.5" />}
              deltaPct={inspectionsComparison?.deltaPct}
              sparkline={inspectionsSparkline}
            />
            <StatCard label="Inspecciones rechazadas" value={rejectedInspections} icon={<AlertOctagon className="w-3.5 h-3.5" />} tone={rejectedInspections > 0 ? 'danger' : 'default'} />
            <StatCard
              label="Registros de Metrología Pro"
              value={totalMetrologyRecords}
              icon={<Wrench className="w-3.5 h-3.5" />}
              deltaPct={metrologyComparison?.deltaPct}
              sparkline={metrologySparkline}
            />
            <StatCard label="Instrumentos vencidos" value={overdueCalibrations} icon={<AlertOctagon className="w-3.5 h-3.5" />} tone={overdueCalibrations > 0 ? 'danger' : 'default'} />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
            <TabButton active={tab === 'inspecciones'} onClick={() => setTab('inspecciones')} icon={<ClipboardCheck className="w-3.5 h-3.5" />} label="Inspecciones en Campo" />
            <TabButton active={tab === 'metrologia'} onClick={() => setTab('metrologia')} icon={<Wrench className="w-3.5 h-3.5" />} label="Metrología Pro" />
          </div>

          {tab === 'inspecciones' && (
            data.inspectionStats ? (
              <FieldInspectionsAnalytics stats={data.inspectionStats} days={days} />
            ) : (
              <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/50 shadow-sm p-6 text-sm text-amber-800">
                No se pudieron calcular las métricas de Inspecciones en Campo. Verifica que la migración{' '}
                <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">db/migrate_field_inspections_dashboard_stats.sql</code>{' '}
                se haya ejecutado en Supabase.
              </div>
            )
          )}
          {tab === 'metrologia' && (
            <MetrologyAnalytics deliveries={data.deliveries} replacements={data.replacements} calibrations={data.calibrations} days={days} />
          )}
        </>
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-lg transition ${
      active ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-slate-500 hover:text-slate-800'
    }`}
  >
    {icon} {label}
  </button>
);
