'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ShieldCheck, Lock } from 'lucide-react';
import { useCrmSession } from './CrmSessionContext';

interface AuditEventRow {
  id: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-rose-100 text-rose-800',
  publish: 'bg-emerald-100 text-emerald-800',
  unpublish: 'bg-slate-200 text-slate-700',
  login: 'bg-indigo-100 text-indigo-800',
  logout: 'bg-slate-200 text-slate-700',
  activate: 'bg-emerald-100 text-emerald-800',
  deactivate: 'bg-rose-100 text-rose-800'
};

export const CrmAuditLog: React.FC = () => {
  const { role } = useCrmSession();
  const [events, setEvents] = useState<AuditEventRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/audit-log');
      const data = await res.json();
      if (data.success) setEvents(data.events || []);
    } catch (err) {
      console.error('Error cargando auditoría:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'administrador') loadEvents();
  }, [role, loadEvents]);

  if (role !== 'administrador') {
    return (
      <div className="p-10 text-center bg-white rounded-xl border border-slate-200 space-y-2">
        <Lock className="w-8 h-8 text-slate-400 mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Solo un Administrador puede consultar la auditoría.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Auditoría de Operaciones</h1>
          <p className="text-xs text-slate-500 mt-0.5">Registro de toda acción administrativa ejecutada desde el CRM.</p>
        </div>
        <button onClick={loadEvents} className="text-xs font-semibold text-[#003366] hover:underline flex items-center gap-1">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-800 p-4 border-b border-slate-200">
          <ShieldCheck className="w-4 h-4 text-[#003366]" />
          <span>Últimos {events.length} eventos</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-[10px] uppercase text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="py-2 px-4 font-bold whitespace-nowrap">Fecha</th>
                <th className="py-2 px-4 font-bold">Usuario</th>
                <th className="py-2 px-4 font-bold">Acción</th>
                <th className="py-2 px-4 font-bold">Entidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map(ev => (
                <tr key={ev.id} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                    {new Date(ev.createdAt).toLocaleString('es-CO')}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">{ev.adminEmail}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${ACTION_COLORS[ev.action] || 'bg-slate-100 text-slate-600'}`}>
                      {ev.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-600">
                    {ev.entityType}
                    {ev.entityId && <span className="text-slate-400"> · {ev.entityId}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 && !loading && (
            <p className="text-center text-xs text-slate-400 py-8">Sin eventos registrados todavía.</p>
          )}
        </div>
      </div>
    </div>
  );
};
