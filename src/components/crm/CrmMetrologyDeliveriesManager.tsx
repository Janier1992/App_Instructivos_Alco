'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Ruler, Plus, RefreshCw, X, FileText, Eye, Pencil, Trash2, Search } from 'lucide-react';
import { MetrologyDelivery } from '@/src/lib/metrologyDeliveriesStore';
import { MetrologyDeliveryForm, MetrologyDeliveryFormValues } from './MetrologyDeliveryForm';
import { MetrologyDeliveryViewModal } from '../MetrologyDeliveryViewModal';
import { exportMetrologyDeliveryToPDF } from '@/src/lib/metrologyPdfExport';

/**
 * Metrología Pro — Entrega de Equipos, dentro del Portal de
 * Administración. El registro normal también está disponible desde el
 * módulo público en /procesos/control-calidad (ver MetrologyDeliveriesPanel);
 * acá además viven la edición y el borrado — operaciones que requieren
 * entrar al Portal de Administración.
 */
export const CrmMetrologyDeliveriesManager: React.FC = () => {
  const [deliveries, setDeliveries] = useState<MetrologyDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MetrologyDelivery | null>(null);
  const [viewing, setViewing] = useState<MetrologyDelivery | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/metrology-deliveries');
      const data = await res.json();
      if (data.success) setDeliveries(data.deliveries || []);
    } catch (err) {
      console.error('Error cargando actas de entrega:', err);
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

  const openEdit = (delivery: MetrologyDelivery) => {
    setViewing(null);
    setEditing(delivery);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (values: MetrologyDeliveryFormValues) => {
    const url = editing ? `/api/crm/metrology-deliveries/${editing.id}` : '/api/crm/metrology-deliveries';
    const method = editing ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar el acta de entrega.');
    closeForm();
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta acta de entrega? Esta acción no se puede deshacer.')) return;
    const res = await fetch(`/api/crm/metrology-deliveries/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setViewing(null);
      await load();
    } else {
      alert(data.error || 'No se pudo eliminar el acta de entrega.');
    }
  };

  const initialFormValues: Partial<MetrologyDeliveryFormValues> | undefined = editing
    ? {
        fecha: editing.fecha,
        area: editing.area,
        sede: editing.sede,
        receptorNombre: editing.receptorNombre,
        receptorCedula: editing.receptorCedula,
        receptorCargo: editing.receptorCargo || '',
        items: editing.items,
        firmaEntrega: editing.firmaEntrega || '',
        firmaRecibe: editing.firmaRecibe || ''
      }
    : undefined;

  const filtered = deliveries.filter(d => d.receptorNombre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Ruler className="w-5 h-5 text-[#003366]" /> Metrología Pro — Entrega de Equipos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Actas de entrega de herramientas y equipos de medición, con firma digital de quien entrega y quien recibe.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-bold text-sm text-slate-800">{filtered.length} acta{filtered.length === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por receptor..." className="pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
            </div>
            <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition">
              <Plus className="w-3.5 h-3.5" /> Nueva Asignación
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="p-2 text-left font-bold text-slate-500 bg-slate-50">Fecha</th>
                <th className="p-2 text-left font-bold text-slate-500 bg-slate-50">Receptor</th>
                <th className="p-2 text-left font-bold text-slate-500 bg-slate-50">Área</th>
                <th className="p-2 text-left font-bold text-slate-500 bg-slate-50">Sede</th>
                <th className="p-2 text-left font-bold text-slate-500 bg-slate-50">Ítems</th>
                <th className="p-2 text-right font-bold text-slate-500 bg-slate-50">Gestión</th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">No hay actas registradas.</td></tr>
              ) : (
                filtered.map(d => (
                  <tr key={d.id} className="border-t border-slate-100">
                    <td className="p-2 whitespace-nowrap">{d.fecha}</td>
                    <td className="p-2 font-semibold">{d.receptorNombre}</td>
                    <td className="p-2">{d.area}</td>
                    <td className="p-2">{d.sede}</td>
                    <td className="p-2">{d.items.length}</td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setViewing(d)} title="Ver" className="p-1.5 text-slate-500 hover:text-[#003366] hover:bg-blue-50 rounded-lg transition"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => exportMetrologyDeliveryToPDF(d)} title="Exportar PDF" className="p-1.5 text-slate-500 hover:text-[#003366] hover:bg-blue-50 rounded-lg transition"><FileText className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEdit(d)} title="Editar" className="p-1.5 text-slate-500 hover:text-[#003366] hover:bg-blue-50 rounded-lg transition"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(d.id)} title="Eliminar" className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">{editing ? 'Editar acta de entrega' : 'Nueva acta de entrega'}</h3>
              <button onClick={closeForm}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <MetrologyDeliveryForm initial={initialFormValues} isEditing={!!editing} onCancel={closeForm} onSubmit={handleSubmit} />
          </div>
        </div>
      )}

      {viewing && (
        <MetrologyDeliveryViewModal
          delivery={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => openEdit(viewing)}
          onDelete={() => handleDelete(viewing.id)}
        />
      )}
    </div>
  );
};
