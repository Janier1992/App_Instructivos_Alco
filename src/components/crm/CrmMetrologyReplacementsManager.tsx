'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCcw as RepeatIcon, Plus, RefreshCw, X, FileText, Eye, Pencil, Trash2, Search } from 'lucide-react';
import { MetrologyReplacement } from '@/src/lib/metrologyReplacementsStore';
import { MetrologyReplacementForm, MetrologyReplacementFormValues } from './MetrologyReplacementForm';
import { MetrologyReplacementViewModal } from '../MetrologyReplacementViewModal';
import { exportMetrologyReplacementToPDF } from '@/src/lib/metrologyReplacementPdfExport';

/**
 * Metrología Pro — Reposición y Baja, dentro del Portal de
 * Administración. El registro normal también está disponible desde el
 * módulo público en /procesos/control-calidad (ver MetrologyReplacementsPanel);
 * acá además viven la edición y el borrado.
 */
export const CrmMetrologyReplacementsManager: React.FC = () => {
  const [replacements, setReplacements] = useState<MetrologyReplacement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<MetrologyReplacement | null>(null);
  const [viewing, setViewing] = useState<MetrologyReplacement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/metrology-replacements');
      const data = await res.json();
      if (data.success) setReplacements(data.replacements || []);
    } catch (err) {
      console.error('Error cargando registros de reposición/baja:', err);
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

  const openEdit = (replacement: MetrologyReplacement) => {
    setViewing(null);
    setEditing(replacement);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (values: MetrologyReplacementFormValues) => {
    const url = editing ? `/api/crm/metrology-replacements/${editing.id}` : '/api/crm/metrology-replacements';
    const method = editing ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar el registro.');
    closeForm();
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro? Esta acción no se puede deshacer.')) return;
    const res = await fetch(`/api/crm/metrology-replacements/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      setViewing(null);
      await load();
    } else {
      alert(data.error || 'No se pudo eliminar el registro.');
    }
  };

  const initialFormValues: Partial<MetrologyReplacementFormValues> | undefined = editing
    ? {
        fechaRegistro: editing.fechaRegistro,
        nombreEquipo: editing.nombreEquipo,
        marca: editing.marca || '',
        codigo: editing.codigo,
        areaUso: editing.areaUso,
        nombreResponsable: editing.nombreResponsable,
        motivoReposicion: editing.motivoReposicion,
        devuelveEquipoAnterior: editing.devuelveEquipoAnterior,
        descripcionBaja: editing.descripcionBaja || '',
        seCobraEquipo: editing.seCobraEquipo,
        nombreResponsableCalidad: editing.nombreResponsableCalidad || '',
        firmaResponsableArea: editing.firmaResponsableArea || '',
        firmaResponsableCalidad: editing.firmaResponsableCalidad || ''
      }
    : undefined;

  const filtered = replacements.filter(r => r.nombreEquipo.toLowerCase().includes(searchTerm.toLowerCase()) || r.codigo.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <RepeatIcon className="w-5 h-5 text-[#003366]" /> Metrología Pro — Reposición y Baja
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Ciclo de vida de equipos de medición: motivo de reposición, disposición final y firma de responsables.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="font-bold text-sm text-slate-800">{filtered.length} registro{filtered.length === 1 ? '' : 's'}</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar por equipo o código..." className="pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
            </div>
            <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
            <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition">
              <Plus className="w-3.5 h-3.5" /> Nuevo Registro
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left font-bold text-slate-500">Fecha</th>
                <th className="p-2 text-left font-bold text-slate-500">Equipo</th>
                <th className="p-2 text-left font-bold text-slate-500">Código</th>
                <th className="p-2 text-left font-bold text-slate-500">Área</th>
                <th className="p-2 text-left font-bold text-slate-500">Responsable</th>
                <th className="p-2 text-right font-bold text-slate-500">Gestión</th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">Cargando...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-slate-400">No hay registros.</td></tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="p-2 whitespace-nowrap">{r.fechaRegistro}</td>
                    <td className="p-2 font-semibold">{r.nombreEquipo}</td>
                    <td className="p-2">{r.codigo}</td>
                    <td className="p-2">{r.areaUso}</td>
                    <td className="p-2">{r.nombreResponsable}</td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setViewing(r)} title="Ver" className="p-1.5 text-slate-500 hover:text-[#003366] hover:bg-blue-50 rounded-lg transition"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => exportMetrologyReplacementToPDF(r)} title="Exportar PDF" className="p-1.5 text-slate-500 hover:text-[#003366] hover:bg-blue-50 rounded-lg transition"><FileText className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openEdit(r)} title="Editar" className="p-1.5 text-slate-500 hover:text-[#003366] hover:bg-blue-50 rounded-lg transition"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(r.id)} title="Eliminar" className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button>
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
              <h3 className="font-bold text-slate-900">{editing ? 'Editar registro' : 'Nuevo registro de reposición/baja'}</h3>
              <button onClick={closeForm}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <MetrologyReplacementForm initial={initialFormValues} isEditing={!!editing} onCancel={closeForm} onSubmit={handleSubmit} />
          </div>
        </div>
      )}

      {viewing && (
        <MetrologyReplacementViewModal
          replacement={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => openEdit(viewing)}
          onDelete={() => handleDelete(viewing.id)}
        />
      )}
    </div>
  );
};
