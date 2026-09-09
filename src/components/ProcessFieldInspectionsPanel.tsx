'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, RefreshCw, ImageOff } from 'lucide-react';

interface FieldInspection {
  id: string;
  fecha: string;
  areaProceso: string;
  op: string;
  disenoReferencia: string | null;
  cantTotal: number;
  cantRetenida: number;
  estado: string;
  defecto: string;
  responsable: string | null;
  observacion: string | null;
  photoStoragePath: string | null;
}

const ESTADO_BADGE: Record<string, string> = {
  Aprobado: 'bg-emerald-100 text-emerald-800',
  'Aprobado (Condicionado)': 'bg-amber-100 text-amber-800',
  Rechazado: 'bg-rose-100 text-rose-800',
  Pendiente: 'bg-slate-200 text-slate-700',
  Reprocesar: 'bg-orange-100 text-orange-800'
};

/**
 * Consulta pública de Inspecciones en Campo — solo lectura. Crear, editar
 * o eliminar registros requiere entrar al CRM (Portal de Administración).
 */
export const ProcessFieldInspectionsPanel: React.FC<{ processSlug: string }> = () => {
  const [inspections, setInspections] = useState<FieldInspection[] | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/field-inspections');
      const data = await res.json();
      setInspections(data.inspections || []);
    } catch {
      setInspections([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (inspections === null) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin" />
        <span className="text-sm">Cargando inspecciones...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {inspections.length} inspección{inspections.length === 1 ? '' : 'es'} registrada{inspections.length === 1 ? '' : 's'} — consulta de solo lectura, edición desde el CRM.
        </p>
        <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Actualizar
        </button>
      </div>

      {inspections.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center space-y-2">
          <ClipboardList className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-500">Aún no hay inspecciones registradas.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left font-bold text-slate-500">Fecha</th>
                <th className="p-2 text-left font-bold text-slate-500">Área</th>
                <th className="p-2 text-left font-bold text-slate-500">OP</th>
                <th className="p-2 text-left font-bold text-slate-500">Diseño</th>
                <th className="p-2 text-left font-bold text-slate-500">Cant.</th>
                <th className="p-2 text-left font-bold text-slate-500">Estado</th>
                <th className="p-2 text-left font-bold text-slate-500">Defecto</th>
                <th className="p-2 text-left font-bold text-slate-500">Foto</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map(insp => (
                <tr key={insp.id} className="border-t border-slate-100">
                  <td className="p-2 whitespace-nowrap">{insp.fecha}</td>
                  <td className="p-2">{insp.areaProceso}</td>
                  <td className="p-2 font-semibold">{insp.op}</td>
                  <td className="p-2">{insp.disenoReferencia}</td>
                  <td className="p-2">{insp.cantTotal}{insp.cantRetenida > 0 && <span className="text-rose-600"> ({insp.cantRetenida} ret.)</span>}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ESTADO_BADGE[insp.estado] || 'bg-slate-100 text-slate-600'}`}>{insp.estado}</span>
                  </td>
                  <td className="p-2">{insp.defecto}</td>
                  <td className="p-2">
                    {insp.photoStoragePath ? (
                      <a href={`/api/field-inspections/${insp.id}/photo`} target="_blank" rel="noopener noreferrer" className="text-[#003366] hover:underline">Ver</a>
                    ) : (
                      <ImageOff className="w-3.5 h-3.5 text-slate-300" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
