'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Ruler, RefreshCw, Plus, X, Paperclip, Search } from 'lucide-react';
import { MetrologyCalibrationForm, MetrologyCalibrationFormValues } from './crm/MetrologyCalibrationForm';
import { MetrologyCalibrationCertificateModal } from './MetrologyCalibrationCertificateModal';
import { MetrologyCalibration } from '@/src/lib/metrologyCalibrationsStore';
import { getDaysUntilDue, getStatusConfig } from '@/src/lib/metrologyCalibrationUtils';

const PUBLIC_API_BASE = '/api/metrology-calibrations';

/**
 * Metrología Pro — Control Calibración, dentro del módulo de Control
 * Calidad — consulta y registro sin necesidad de entrar al CRM. Editar o
 * eliminar un instrumento sí requiere el Portal de Administración.
 */
export const MetrologyCalibrationsPanel: React.FC<{ processSlug: string }> = () => {
  const [calibrations, setCalibrations] = useState<MetrologyCalibration[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [viewingCert, setViewingCert] = useState<{ toolName: string; url: string; isPdf: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(PUBLIC_API_BASE);
      const data = await res.json();
      setCalibrations(data.calibrations || []);
    } catch {
      setCalibrations([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (values: MetrologyCalibrationFormValues) => {
    const res = await fetch(PUBLIC_API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar el instrumento.');
    setShowForm(false);
    await load();
  };

  const stats = useMemo(() => {
    if (!calibrations) return { vigente: 0, proximo: 0, vencido: 0, total: 0 };
    const vigente = calibrations.filter(c => getStatusConfig(c.status, getDaysUntilDue(c.dueDate)).label === 'VIGENTE').length;
    const proximo = calibrations.filter(c => getStatusConfig(c.status, getDaysUntilDue(c.dueDate)).label === 'PRÓXIMO').length;
    const vencido = calibrations.filter(c => getStatusConfig(c.status, getDaysUntilDue(c.dueDate)).label === 'VENCIDO').length;
    return { vigente, proximo, vencido, total: calibrations.length };
  }, [calibrations]);

  const filtered = (calibrations || []).filter(c => c.tool.toLowerCase().includes(searchTerm.toLowerCase()) || c.code.toLowerCase().includes(searchTerm.toLowerCase()));

  if (calibrations === null) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando cronograma de calibración...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {calibrations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard label="Vigentes" value={stats.vigente} className="text-emerald-700 bg-emerald-50 border-emerald-200" />
          <StatCard label="Próximos" value={stats.proximo} className="text-amber-700 bg-amber-50 border-amber-200" />
          <StatCard label="Vencidos" value={stats.vencido} className="text-rose-700 bg-rose-50 border-rose-200" />
          <StatCard label="Total" value={stats.total} className="text-[#003366] bg-blue-50 border-blue-200" />
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar instrumento o código..." className="pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Actualizar
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition">
            <Plus className="w-3.5 h-3.5" /> Vincular instrumento
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">La edición o eliminación de un instrumento se hace desde el Portal de Administración.</p>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
          <Ruler className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">Aún no hay instrumentos registrados.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left font-bold text-slate-500">Instrumento</th>
                <th className="p-2 text-left font-bold text-slate-500">Código</th>
                <th className="p-2 text-left font-bold text-slate-500">Certificado</th>
                <th className="p-2 text-left font-bold text-slate-500">Estado</th>
                <th className="p-2 text-left font-bold text-slate-500">Vencimiento</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const daysLeft = getDaysUntilDue(c.dueDate);
                const cfg = getStatusConfig(c.status, daysLeft);
                return (
                  <tr key={c.id} className="border-t border-slate-100">
                    <td className="p-2 font-semibold">{c.tool}</td>
                    <td className="p-2 font-mono">{c.code}</td>
                    <td className="p-2">
                      {c.certificateStoragePath ? (
                        <button
                          onClick={() => setViewingCert({ toolName: c.tool, url: `/api/metrology-calibrations/${c.id}/certificate`, isPdf: /\.pdf$/i.test(c.certificateStoragePath!) })}
                          className="text-[#003366] hover:underline flex items-center gap-1"
                        >
                          <Paperclip className="w-3.5 h-3.5" /> Ver
                        </button>
                      ) : c.certificateNumber ? (
                        <span className="text-slate-500">#{c.certificateNumber}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>
                    </td>
                    <td className="p-2">{daysLeft > 0 ? `${daysLeft} días` : daysLeft === 0 ? 'Hoy' : `Vencido hace ${Math.abs(daysLeft)}d`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Vincular instrumento</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <MetrologyCalibrationForm isEditing={false} onCancel={() => setShowForm(false)} onSubmit={handleSubmit} apiBase={PUBLIC_API_BASE} />
          </div>
        </div>
      )}

      {viewingCert && (
        <MetrologyCalibrationCertificateModal toolName={viewingCert.toolName} certificateUrl={viewingCert.url} isPdf={viewingCert.isPdf} onClose={() => setViewingCert(null)} />
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; className: string }> = ({ label, value, className }) => (
  <div className={`rounded-xl border p-3 ${className}`}>
    <p className="text-xl font-black tabular-nums">{value}</p>
    <p className="text-[10px] font-bold uppercase tracking-wide">{label}</p>
  </div>
);
