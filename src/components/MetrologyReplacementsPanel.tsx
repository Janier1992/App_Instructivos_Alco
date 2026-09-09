'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCcw as RepeatIcon, RefreshCw, Plus, X, FileText, Eye } from 'lucide-react';
import { MetrologyReplacementForm, MetrologyReplacementFormValues } from './crm/MetrologyReplacementForm';
import { MetrologyReplacementViewModal } from './MetrologyReplacementViewModal';
import { MetrologyReplacement } from '@/src/lib/metrologyReplacementsStore';
import { exportMetrologyReplacementToPDF } from '@/src/lib/metrologyReplacementPdfExport';

const PUBLIC_API_BASE = '/api/metrology-replacements';

/**
 * Metrología Pro — Reposición y Baja, dentro del módulo de Control
 * Calidad — consulta y registro sin necesidad de entrar al CRM. Editar o
 * eliminar un registro sí requiere el Portal de Administración.
 */
export const MetrologyReplacementsPanel: React.FC<{ processSlug: string }> = () => {
  const [replacements, setReplacements] = useState<MetrologyReplacement[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<MetrologyReplacement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(PUBLIC_API_BASE);
      const data = await res.json();
      setReplacements(data.replacements || []);
    } catch {
      setReplacements([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (values: MetrologyReplacementFormValues) => {
    const res = await fetch(PUBLIC_API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar el registro.');
    setShowForm(false);
    await load();
  };

  if (replacements === null) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando registros...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-slate-500">
          {replacements.length} registro{replacements.length === 1 ? '' : 's'} — la edición o eliminación se hace desde el Portal de Administración.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Actualizar
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition">
            <Plus className="w-3.5 h-3.5" /> Nuevo registro
          </button>
        </div>
      </div>

      {replacements.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
          <RepeatIcon className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">Aún no hay registros de reposición o baja.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left font-bold text-slate-500">Fecha</th>
                <th className="p-2 text-left font-bold text-slate-500">Equipo</th>
                <th className="p-2 text-left font-bold text-slate-500">Código</th>
                <th className="p-2 text-left font-bold text-slate-500">Área</th>
                <th className="p-2 text-left font-bold text-slate-500">Responsable</th>
                <th className="p-2 text-left font-bold text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {replacements.map(r => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="p-2 whitespace-nowrap">{r.fechaRegistro}</td>
                  <td className="p-2 font-semibold">{r.nombreEquipo}</td>
                  <td className="p-2">{r.codigo}</td>
                  <td className="p-2">{r.areaUso}</td>
                  <td className="p-2">{r.nombreResponsable}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewing(r)} className="text-[#003366] hover:underline flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Ver</button>
                      <button onClick={() => exportMetrologyReplacementToPDF(r)} className="text-[#003366] hover:underline flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> PDF</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Nuevo registro de reposición/baja</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <MetrologyReplacementForm isEditing={false} onCancel={() => setShowForm(false)} onSubmit={handleSubmit} />
          </div>
        </div>
      )}

      {viewing && <MetrologyReplacementViewModal replacement={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};
