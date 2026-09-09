'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

interface NonConformity {
  id: string;
  serialId: string;
  title: string;
  severity: string;
  description: string | null;
  status: string;
  createdAt: string;
}

const STATUS_OPTIONS = ['Abierta', 'En análisis', 'Cerrada'];

/**
 * Lista de No Conformidades generadas automáticamente por Inspecciones en
 * Campo (rechazos). No es el flujo completo de CAPA/5 Porqués — solo
 * consulta y cambio de estado, para que el registro no quede huérfano.
 */
export const CrmNonConformitiesManager: React.FC = () => {
  const [items, setItems] = useState<NonConformity[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/crm/non-conformities');
    const data = await res.json();
    if (data.success) setItems(data.nonConformities || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/crm/non-conformities/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) await load();
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-xs text-slate-400 text-center py-4">Cargando...</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-8">Sin No Conformidades registradas.</p>
      ) : (
        items.map(nc => (
          <div key={nc.id} className="p-3 bg-white border border-amber-200 bg-amber-50/40 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-bold text-slate-900">{nc.serialId}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">{nc.severity}</span>
              </div>
              <select value={nc.status} onChange={e => handleStatusChange(nc.id, e.target.value)} className="text-[11px] px-2 py-1 bg-white border border-slate-300 rounded-lg">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <p className="text-sm font-semibold text-slate-800">{nc.title}</p>
            {nc.description && <p className="text-[11px] text-slate-600">{nc.description}</p>}
            <span className="text-[10px] text-slate-400">{new Date(nc.createdAt).toLocaleString('es-CO')}</span>
          </div>
        ))
      )}
    </div>
  );
};
