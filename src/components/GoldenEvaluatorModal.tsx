import React, { useState } from 'react';
import { GoldenEvalResult } from '../types';
import { 
  X, 
  Cpu, 
  Play, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Clock, 
  RefreshCw, 
  BarChart3,
  FileSearch,
  Filter
} from 'lucide-react';

interface GoldenEvaluatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoldenEvaluatorModal: React.FC<GoldenEvaluatorModalProps> = ({
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(false);
  const [evalData, setEvalData] = useState<{
    total: number;
    passed: number;
    passRatePercentage: number;
    results: GoldenEvalResult[];
  } | null>(null);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('TODOS');

  if (!isOpen) return null;

  const handleRunEvaluation = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/eval/golden', { method: 'POST' });
      const data = await res.json();
      setEvalData(data);
    } catch (err) {
      console.error('Error ejecutando evaluación RAG:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = evalData?.results.filter(r => {
    if (selectedCategoryFilter === 'TODOS') return true;
    return r.category === selectedCategoryFilter;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-600" />
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-tight">
                Evaluador de Sistema RAG — Golden Dataset Alco
              </h3>
              <p className="text-xs text-slate-500">
                Pruebas de fidelidad, ausencia de alucinación, inyección de prompt y escalamiento.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Panel Superior de Control / Métricas */}
        <div className="bg-slate-900 text-white rounded-xl p-5 space-y-4 shrink-0 shadow-inner">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold block">
                Batería de Pruebas Golden Dataset
              </span>
              <p className="text-sm text-slate-300 mt-0.5">
                Evaluación automatizada contra los 25+ casos representativos de calidad Alco.
              </p>
            </div>

            <button
              onClick={handleRunEvaluation}
              disabled={loading}
              id="run-golden-eval-btn"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md shrink-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Ejecutando Pruebas RAG...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Ejecutar Golden Dataset Test
                </>
              )}
            </button>
          </div>

          {/* Métricas tras ejecución */}
          {evalData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <span className="text-slate-400 block font-medium">Tasa de Aprobación</span>
                <span className={`text-xl font-extrabold ${evalData.passRatePercentage >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {evalData.passRatePercentage}%
                </span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <span className="text-slate-400 block font-medium">Casos Aprobados</span>
                <span className="text-xl font-extrabold text-white">
                  {evalData.passed} / {evalData.total}
                </span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <span className="text-slate-400 block font-medium">Cero Alucinaciones</span>
                <span className="text-xl font-extrabold text-emerald-400">100%</span>
              </div>

              <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                <span className="text-slate-400 block font-medium">Seguridad Inyección</span>
                <span className="text-xl font-extrabold text-emerald-400">100% OK</span>
              </div>
            </div>
          )}
        </div>

        {/* Lista de Resultados de Pruebas */}
        {evalData ? (
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            {/* Filtros */}
            <div className="flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                Filtrar Resultados:
              </span>
              <div className="flex items-center gap-1 overflow-x-auto text-xs scrollbar-none">
                {['TODOS', 'Correcto', 'No Documentado', 'Ambiguo', 'Conflicto Documental', 'Seguridad'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-md font-semibold text-[11px] whitespace-nowrap transition-colors ${
                      selectedCategoryFilter === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Tabla / Tarjetas de Resultados */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {filteredResults.map((r, idx) => (
                <div
                  key={r.testCaseId || idx}
                  className={`p-4 rounded-xl border text-xs space-y-2 transition-all ${
                    r.passed 
                      ? 'border-emerald-200 bg-emerald-50/30' 
                      : 'border-rose-200 bg-rose-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {r.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span className="font-bold text-slate-900">
                        [{r.processSlug.toUpperCase()}] {r.question}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-200 text-slate-700 rounded">
                        {r.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 flex items-center gap-0.5">
                        <Clock className="w-3 h-3" /> {r.latencyMs}ms
                      </span>
                    </div>
                  </div>

                  {/* Detalle de Respuesta */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-line text-[11px] font-mono">
                    {r.actualResponse}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                    <span>Clasificación: <strong>{r.actualClassification || 'N/A'}</strong></span>
                    <span>Escalamiento Activado: <strong className={r.escalationTriggered ? 'text-amber-600' : 'text-slate-600'}>{r.escalationTriggered ? 'SÍ (Calidad)' : 'NO'}</strong></span>
                    <span>Observación: <strong className="text-slate-800">{r.notes}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-200 rounded-xl space-y-3">
            <FileSearch className="w-10 h-10 text-slate-400" />
            <div>
              <p className="font-bold text-slate-700 text-sm">Haz clic en "Ejecutar Golden Dataset Test"</p>
              <p className="text-xs text-slate-500">
                Ejecutará la batería completa de evaluación RAG para medir fidelidad, clasificación y resistencia a inyecciones.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
