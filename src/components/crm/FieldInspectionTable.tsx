'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Pencil, Trash2, Search, ImageOff, CloudOff } from 'lucide-react';
import { FieldInspection } from '@/src/lib/fieldInspectionsStore';

const ESTADO_BADGE: Record<string, string> = {
  Aprobado: 'bg-emerald-100 text-emerald-800',
  'Aprobado (Condicionado)': 'bg-amber-100 text-amber-800',
  Rechazado: 'bg-rose-100 text-rose-800',
  Pendiente: 'bg-slate-200 text-slate-700',
  Reprocesar: 'bg-orange-100 text-orange-800'
};

interface Props {
  inspections: (FieldInspection & { isOffline?: boolean })[];
  onEdit: (inspection: FieldInspection) => void;
  onDeleteSelected: (ids: string[]) => void;
}

export const FieldInspectionTable: React.FC<Props> = ({ inspections, onEdit, onDeleteSelected }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!search.trim()) return inspections;
    const q = search.trim().toLowerCase();
    return inspections.filter(i =>
      [i.op, i.planoOpc, i.areaProceso, i.disenoReferencia, i.responsable, i.reviso, i.defecto].some(v => (v || '').toLowerCase().includes(q))
    );
  }, [inspections, search]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every(i => selected.has(i.id));
  const someFilteredSelected = filtered.some(i => selected.has(i.id));
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someFilteredSelected && !allFilteredSelected;
    }
  }, [someFilteredSelected, allFilteredSelected]);

  const toggleSelectAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach(i => next.delete(i.id));
      } else {
        filtered.forEach(i => next.add(i.id));
      }
      return next;
    });
  };

  const handleBulkDelete = () => {
    if (selected.size === 0) return;
    if (!confirm(`¿Eliminar ${selected.size} inspección(es) seleccionada(s)?`)) return;
    onDeleteSelected(Array.from(selected));
    setSelected(new Set());
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por OP, área, diseño, responsable..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
          />
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition">
              <Trash2 className="w-3.5 h-3.5" /> Eliminar {selected.size} seleccionada{selected.size === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 w-8">
                {filtered.length > 0 && (
                  <input ref={selectAllRef} type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} title="Seleccionar todo" />
                )}
              </th>
              <th className="p-2 text-left font-bold text-slate-500">Fecha</th>
              <th className="p-2 text-left font-bold text-slate-500">Área</th>
              <th className="p-2 text-left font-bold text-slate-500">OP</th>
              <th className="p-2 text-left font-bold text-slate-500">Plano/Ítem</th>
              <th className="p-2 text-left font-bold text-slate-500">Diseño</th>
              <th className="p-2 text-left font-bold text-slate-500">Cant.</th>
              <th className="p-2 text-left font-bold text-slate-500">Estado</th>
              <th className="p-2 text-left font-bold text-slate-500">Defecto</th>
              <th className="p-2 text-left font-bold text-slate-500">Responsable</th>
              <th className="p-2 text-left font-bold text-slate-500">Foto</th>
              <th className="p-2 text-left font-bold text-slate-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-6 text-center text-slate-400">Sin inspecciones registradas.</td>
              </tr>
            ) : (
              filtered.map(insp => (
                <tr key={insp.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="p-2"><input type="checkbox" checked={selected.has(insp.id)} onChange={() => toggleSelect(insp.id)} /></td>
                  <td className="p-2 whitespace-nowrap">{insp.fecha}</td>
                  <td className="p-2">{insp.areaProceso}</td>
                  <td className="p-2 font-semibold">
                    {insp.op}
                    {insp.isOffline && <CloudOff className="w-3 h-3 inline ml-1 text-amber-500" aria-label="Pendiente de sincronizar" />}
                  </td>
                  <td className="p-2 font-mono">{insp.planoOpc || '—'}</td>
                  <td className="p-2">{insp.disenoReferencia}</td>
                  <td className="p-2">{insp.cantTotal}{insp.cantRetenida > 0 && <span className="text-rose-600"> ({insp.cantRetenida} ret.)</span>}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTADO_BADGE[insp.estado] || 'bg-slate-100 text-slate-600'}`}>{insp.estado}</span>
                  </td>
                  <td className="p-2">{insp.defecto}</td>
                  <td className="p-2">{insp.responsable}</td>
                  <td className="p-2">
                    {insp.photoStoragePath ? (
                      <a href={`/api/field-inspections/${insp.id}/photo`} target="_blank" rel="noopener noreferrer" className="text-[#003366] hover:underline">Ver</a>
                    ) : (
                      <ImageOff className="w-3.5 h-3.5 text-slate-300" />
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => onEdit(insp)} className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDeleteSelected([insp.id])} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
