'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  FileText,
  FolderCheck,
  FolderX,
  Play,
  Cpu,
  FileSearch,
  AlertTriangle
} from 'lucide-react';

interface DashboardMetrics {
  totalDocuments: number;
  totalProcesses: number;
  processesWithDocs: number;
  processesWithoutDocs: string[];
  byProcess: { processSlug: string; processName: string; documentCount: number }[];
}

interface GoldenEvalLast {
  hasRun: boolean;
  total?: number;
  passed?: number;
  passRatePercentage?: number;
  ranAt?: string;
  byCategory?: { category: string; total: number; passed: number }[];
}

export const DashboardView: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [golden, setGolden] = useState<GoldenEvalLast | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningEval, setIsRunningEval] = useState(false);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [metricsRes, goldenRes] = await Promise.all([
        fetch('/api/dashboard/metrics'),
        fetch('/api/eval/golden/last')
      ]);
      setMetrics(await metricsRes.json());
      setGolden(await goldenRes.json());
    } catch (err) {
      console.error('Error cargando métricas del dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRunGoldenEval = async () => {
    setIsRunningEval(true);
    try {
      await fetch('/api/eval/golden', { method: 'POST' });
      const goldenRes = await fetch('/api/eval/golden/last');
      setGolden(await goldenRes.json());
    } catch (err) {
      console.error('Error ejecutando evaluación Golden Dataset:', err);
    } finally {
      setIsRunningEval(false);
    }
  };

  const maxProcessDocs = Math.max(1, ...(metrics?.byProcess.map(p => p.documentCount) || [1]));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">Dashboard de Supervisión</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Vista Consolidada
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Cobertura de documentación RAG por proceso y salud del asistente de IA.
          </p>
        </div>

        <button
          onClick={loadDashboard}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {!metrics ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 text-center text-slate-400 text-sm">
          Cargando métricas...
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Documentos RAG Cargados
              </span>
              <span className="text-2xl font-extrabold text-slate-900 block mt-1">{metrics.totalDocuments}</span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                <FolderCheck className="w-3.5 h-3.5" /> Procesos con Documentación
              </span>
              <span className="text-2xl font-extrabold text-emerald-600 block mt-1">
                {metrics.processesWithDocs} / {metrics.totalProcesses}
              </span>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <span className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
                <FolderX className="w-3.5 h-3.5" /> Procesos Sin Documentación
              </span>
              <span className={`text-2xl font-extrabold block mt-1 ${metrics.processesWithoutDocs.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {metrics.processesWithoutDocs.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ranking por Proceso */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Documentos RAG por Proceso</h3>
              {metrics.byProcess.length === 0 ? (
                <p className="text-xs text-slate-400">Sin procesos registrados.</p>
              ) : (
                <div className="space-y-2.5">
                  {metrics.byProcess.map(p => (
                    <div key={p.processSlug}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700 truncate">{p.processName}</span>
                        <span className="text-slate-500 font-semibold shrink-0 ml-2">{p.documentCount}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${(p.documentCount / maxProcessDocs) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Procesos sin documentación */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-3">Brechas de Documentación</h3>
              {metrics.processesWithoutDocs.length === 0 ? (
                <p className="text-xs text-emerald-600 font-medium">Todos los procesos tienen al menos un documento cargado.</p>
              ) : (
                <div className="space-y-2">
                  {metrics.processesWithoutDocs.map(name => (
                    <div key={name} className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-medium">{name}</span>
                      <span className="text-amber-700 ml-auto">Sin PDF cargado</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Golden Dataset */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold">Salud del Asistente IA — Golden Dataset</h3>
                  {golden?.hasRun && golden.ranAt && (
                    <p className="text-[11px] text-slate-400">
                      Última ejecución: {new Date(golden.ranAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={handleRunGoldenEval}
                disabled={isRunningEval}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shrink-0"
              >
                {isRunningEval ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Ejecutando (~30s)...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    {golden?.hasRun ? 'Ejecutar de Nuevo' : 'Ejecutar Ahora'}
                  </>
                )}
              </button>
            </div>

            {golden?.hasRun ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <span className="text-slate-400 block font-medium">Tasa de Aprobación</span>
                    <span className={`text-xl font-extrabold ${(golden.passRatePercentage || 0) >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {golden.passRatePercentage}%
                    </span>
                  </div>
                  <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                    <span className="text-slate-400 block font-medium">Casos Aprobados</span>
                    <span className="text-xl font-extrabold text-white">{golden.passed} / {golden.total}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  {golden.byCategory?.map(cat => (
                    <div key={cat.category} className="flex items-center gap-3 text-[11px]">
                      <span className="w-40 shrink-0 text-slate-300 truncate">{cat.category}</span>
                      <div className="flex-1 flex h-2 rounded-full overflow-hidden bg-slate-800">
                        <div className="bg-emerald-500" style={{ width: `${(cat.passed / cat.total) * 100}%` }} />
                        <div className="bg-rose-500" style={{ width: `${((cat.total - cat.passed) / cat.total) * 100}%` }} />
                      </div>
                      <span className="w-10 shrink-0 text-slate-400 text-right">{cat.passed}/{cat.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-700 rounded-xl">
                <FileSearch className="w-8 h-8 text-slate-500 mb-2" />
                <p className="text-xs text-slate-400">
                  Aún no se ha ejecutado el Golden Dataset. Pulsa "Ejecutar Ahora" para medir la calidad del asistente.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
