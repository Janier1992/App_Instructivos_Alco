'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Ruler, RefreshCw, Plus, X, FileText, Eye } from 'lucide-react';
import { MetrologyDeliveryForm, MetrologyDeliveryFormValues } from './crm/MetrologyDeliveryForm';
import { MetrologyDeliveryViewModal } from './MetrologyDeliveryViewModal';
import { MetrologyDelivery } from '@/src/lib/metrologyDeliveriesStore';
import { exportMetrologyDeliveryToPDF } from '@/src/lib/metrologyPdfExport';

const PUBLIC_API_BASE = '/api/metrology-deliveries';

/**
 * Metrología Pro — Entrega de Equipos, dentro del módulo de Control
 * Calidad — consulta y registro de actas sin necesidad de entrar al CRM.
 * Editar o eliminar un acta sí requiere el Portal de Administración.
 */
export const MetrologyDeliveriesPanel: React.FC<{ processSlug: string }> = () => {
  const [deliveries, setDeliveries] = useState<MetrologyDelivery[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<MetrologyDelivery | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(PUBLIC_API_BASE);
      const data = await res.json();
      setDeliveries(data.deliveries || []);
    } catch {
      setDeliveries([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (values: MetrologyDeliveryFormValues) => {
    const res = await fetch(PUBLIC_API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar el acta de entrega.');
    setShowForm(false);
    await load();
  };

  if (deliveries === null) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando actas de entrega...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-slate-500">
          {deliveries.length} acta{deliveries.length === 1 ? '' : 's'} registrada{deliveries.length === 1 ? '' : 's'} — la edición o eliminación se hace desde el Portal de Administración.
        </p>
        <div className="flex items-center gap-2">
          <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Actualizar
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition">
            <Plus className="w-3.5 h-3.5" /> Nueva acta
          </button>
        </div>
      </div>

      {deliveries.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
          <Ruler className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">Aún no hay actas de entrega registradas.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left font-bold text-slate-500">Fecha</th>
                <th className="p-2 text-left font-bold text-slate-500">Receptor</th>
                <th className="p-2 text-left font-bold text-slate-500">Área</th>
                <th className="p-2 text-left font-bold text-slate-500">Sede</th>
                <th className="p-2 text-left font-bold text-slate-500">Ítems</th>
                <th className="p-2 text-left font-bold text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.id} className="border-t border-slate-100">
                  <td className="p-2 whitespace-nowrap">{d.fecha}</td>
                  <td className="p-2 font-semibold">{d.receptorNombre}</td>
                  <td className="p-2">{d.area}</td>
                  <td className="p-2">{d.sede}</td>
                  <td className="p-2">{d.items.length}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setViewing(d)} className="text-[#003366] hover:underline flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Ver</button>
                      <button onClick={() => exportMetrologyDeliveryToPDF(d)} className="text-[#003366] hover:underline flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> PDF</button>
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
              <h3 className="font-bold text-slate-900">Nueva acta de entrega</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <MetrologyDeliveryForm isEditing={false} onCancel={() => setShowForm(false)} onSubmit={handleSubmit} />
          </div>
        </div>
      )}

      {viewing && <MetrologyDeliveryViewModal delivery={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
};
