'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Ruler, Plus, RefreshCw, X, Paperclip, Pencil, Trash2, Search } from 'lucide-react';
import { MetrologyCalibration } from '@/src/lib/metrologyCalibrationsStore';
import { MetrologyCalibrationForm, MetrologyCalibrationFormValues } from './MetrologyCalibrationForm';
import { MetrologyCalibrationCertificateModal } from '../MetrologyCalibrationCertificateModal';
import { getDaysUntilDue, getStatusConfig } from '@/src/lib/metrologyCalibrationUtils';

/**
 * Metrología Pro — Control Calibración, dentro del Portal de
 * Administración. El registro normal también está disponible desde el
 * módulo público en /procesos/control-calidad (ver MetrologyCalibrationsPanel);
 * acá además viven la edición y el borrado.
 */
export const CrmMetrologyCalibrationsManager: React.FC = () => {
  const [calibrations, setCalibrations] = useState<MetrologyCalibration[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MetrologyCalibration | null>(null);
  const [viewingCert, setViewingCert] = useState<{ toolName: string; url: string; isPdf: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/metrology-calibrations');
      const data = await res.json();
      if (data.success) setCalibrations(data.calibrations || []);
    } catch (err) {
      console.error('Error cargando instrumentos de calibración:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (calibration: MetrologyCalibration) => {
    setEditing(calibration);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (values: MetrologyCalibrationFormValues) => {
    const url = editing ? `/api/crm/metrology-calibrations/${editing.id}` : '/api/crm/metrology-calibrations';
    const method = editing ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar el instrumento.');
    closeForm();
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este instrumento del cronograma? Esta acción no se puede deshacer.')) return;
    const res = await fetch(`/api/crm/metrology-calibrations/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) await load();
    else alert(data.error || 'No se pudo eliminar el instrumento.');
  };

  const initialFormValues: Partial<MetrologyCalibrationFormValues> | undefined = editing
    ? {
        tool: editing.tool,
        code: editing.code,
        lastDate: editing.lastDate || '',
        dueDate: editing.dueDate || '',
        status: editing.status,
        certificateNumber: editing.certificateNumber || '',
        certificateStoragePath: editing.certificateStoragePath || ''
      }
    : undefined;

  const stats = useMemo(() => {
    const vigente = calibrations.filter(c => getStatusConfig(c.status, getDaysUntilDue(c.dueDate)).label === 'VIGENTE').length;
    const proximo = calibrations.filter(c => getStatusConfig(c.status, getDaysUntilDue(c.dueDate)).label === 'PRÓXIMO').length;
    const vencido = calibrations.filter(c => getStatusConfig(c.status, getDaysUntilDue(c.dueDate)).label === 'VENCIDO').length;
    return { vigente, proximo, vencido, total: calibrations.length };
  }, [calibrations]);

  const filtered = calibrations.filter(c => c.tool.toLowerCase().includes(searchTerm.toLowerCase()) || c.code.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Ruler className="w-5 h-5 text-[#003366]" /> Metrología Pro — Control Calibración
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Cronograma maestro de calibración de instrumentos de medición (ISO 9001 7.1.5).</p>
        </div>
      </div>

      {calibrations.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard label="Vigentes" value={stats.vigente} className="text-emerald-700 bg-emerald-50 border-emerald-200" />
          <StatCard label="Próximos" value={stats.proximo} className="text-amber-700 bg-amber-50 border-amber-200" />
          <StatCard label="Vencidos" value={stats.vencido} className="text-rose-700 bg-rose-50 border-rose-200" />
          <StatCard label="Total" value={stats.total} className="text-[#003366] bg-blue-50 border-blue-200" />
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-bold text-sm text-slate-800">{filtered.length} instrumento{filtered.length === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar instrumento o código..." className="pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
            </div>
            <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition">
              <Plus className="w-3.5 h-3.5" /> Vincular Instrumento
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left font-bold text-slate-500 bg-slate-50">Instrumento</th>
                <th className="p-2 text-left font-bold text-slate-500 bg-slate-50">Código</th>
                <th className="p-2 text-left font-bold text-slate-500 bg-slate-50">Certificado</th>
                <th className="p-2 text-left font-bold text-slate-500 bg-slate-50">Estado</th>
                <th className="p-2 text-left font-bold text-slate-500 bg-slate-50">Vencimiento</th>
                <th className="p-2 text-right font-bold text-slate-500 bg-slate-50">Gestión</th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">No hay instrumentos registrados.</td></tr>
              ) : (
                filtered.map(c => {
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
                      <td className="p-2">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => openEdit(c)} title="Editar" className="p-1.5 text-slate-500 hover:text-[#003366] hover:bg-blue-50 rounded-lg transition"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(c.id)} title="Eliminar" className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">{editing ? 'Editar ficha técnica' : 'Nuevo instrumento'}</h3>
              <button onClick={closeForm}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <MetrologyCalibrationForm initial={initialFormValues} isEditing={!!editing} onCancel={closeForm} onSubmit={handleSubmit} />
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
