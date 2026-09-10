'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { RefreshCw, ClipboardCheck, Wrench, AlertOctagon } from 'lucide-react';
import { FieldInspection } from '@/src/lib/fieldInspectionsStore';
import { MetrologyDelivery } from '@/src/lib/metrologyDeliveriesStore';
import { MetrologyReplacement } from '@/src/lib/metrologyReplacementsStore';
import { MetrologyCalibration } from '@/src/lib/metrologyCalibrationsStore';
import { getDaysUntilDue, getStatusConfig } from '@/src/lib/metrologyCalibrationUtils';
import { FieldInspectionsAnalytics } from './dashboard/FieldInspectionsAnalytics';
import { MetrologyAnalytics } from './dashboard/MetrologyAnalytics';
import { StatCard } from './dashboard/StatCard';

const AUTO_REFRESH_MS = 60_000;

type DashboardTab = 'inspecciones' | 'metrologia';

interface OperationalData {
  inspections: FieldInspection[];
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [inspRes, delivRes, replRes, calibRes] = await Promise.all([
        fetch('/api/field-inspections'),
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
      setData({
        inspections: inspData.inspections || [],
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
  }, []);

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
  const rejectedInspections = data ? data.inspections.filter(i => i.estado === 'Rechazado').length : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Dashboard Operativo</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Inspecciones en Campo • Metrología Pro
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Métricas en vivo a partir de los registros de Control Calidad — se actualiza automáticamente cada minuto.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {lastUpdated && (
            <span className="text-[11px] text-slate-400">
              Actualizado {lastUpdated.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => load()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
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
            <StatCard label="Inspecciones registradas" value={data.inspections.length} icon={<ClipboardCheck className="w-3.5 h-3.5" />} />
            <StatCard label="Inspecciones rechazadas" value={rejectedInspections} icon={<AlertOctagon className="w-3.5 h-3.5" />} tone={rejectedInspections > 0 ? 'danger' : 'default'} />
            <StatCard label="Registros de Metrología Pro" value={totalMetrologyRecords} icon={<Wrench className="w-3.5 h-3.5" />} />
            <StatCard label="Instrumentos vencidos" value={overdueCalibrations} icon={<AlertOctagon className="w-3.5 h-3.5" />} tone={overdueCalibrations > 0 ? 'danger' : 'default'} />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
            <TabButton active={tab === 'inspecciones'} onClick={() => setTab('inspecciones')} icon={<ClipboardCheck className="w-3.5 h-3.5" />} label="Inspecciones en Campo" />
            <TabButton active={tab === 'metrologia'} onClick={() => setTab('metrologia')} icon={<Wrench className="w-3.5 h-3.5" />} label="Metrología Pro" />
          </div>

          {tab === 'inspecciones' && <FieldInspectionsAnalytics inspections={data.inspections} />}
          {tab === 'metrologia' && (
            <MetrologyAnalytics deliveries={data.deliveries} replacements={data.replacements} calibrations={data.calibrations} />
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
