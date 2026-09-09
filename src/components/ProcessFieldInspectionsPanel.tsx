'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, RefreshCw, ImageOff, Plus, X, WifiOff } from 'lucide-react';
import { FieldInspectionForm, FieldInspectionFormValues } from './crm/FieldInspectionForm';
import { loadFieldInspectionQueue, saveFieldInspectionQueue, OfflineQueueItem } from '@/src/lib/fieldInspectionOfflineQueue';

const OFFLINE_QUEUE_KEY = 'alco_field_inspection_public_offline_queue';
const PUBLIC_API_BASE = '/api/field-inspections';

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
 * Inspecciones en Campo dentro del módulo de Control Calidad — consulta y
 * registro de nuevas inspecciones, sin necesidad de entrar al CRM. Editar
 * o eliminar un registro sí requiere el Portal de Administración.
 */
export const ProcessFieldInspectionsPanel: React.FC<{ processSlug: string }> = () => {
  const [inspections, setInspections] = useState<FieldInspection[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(PUBLIC_API_BASE);
      const data = await res.json();
      setInspections(data.inspections || []);
    } catch {
      setInspections([]);
    }
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    const queue = loadFieldInspectionQueue(OFFLINE_QUEUE_KEY);
    if (queue.length === 0) return;

    const remaining: OfflineQueueItem[] = [];
    for (const item of queue) {
      try {
        const res = await fetch(PUBLIC_API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.payload) });
        if (!res.ok) remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }
    saveFieldInspectionQueue(OFFLINE_QUEUE_KEY, remaining);
    setQueueSize(remaining.length);
    if (remaining.length < queue.length) await load();
  }, [load]);

  useEffect(() => {
    load();
    setQueueSize(loadFieldInspectionQueue(OFFLINE_QUEUE_KEY).length);
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [load, syncOfflineQueue]);

  const handleSubmit = async (values: FieldInspectionFormValues) => {
    if (!navigator.onLine) {
      const queue = loadFieldInspectionQueue(OFFLINE_QUEUE_KEY);
      queue.push({ id: `offline-${Date.now()}`, payload: values });
      saveFieldInspectionQueue(OFFLINE_QUEUE_KEY, queue);
      setQueueSize(queue.length);
      setShowForm(false);
      return;
    }

    const res = await fetch(PUBLIC_API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar la inspección.');

    if (data.nonConformityCreated) {
      alert('Se abrió automáticamente un borrador de No Conformidad por el rechazo.');
    }
    setShowForm(false);
    await load();
  };

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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-slate-500">
          {inspections.length} inspección{inspections.length === 1 ? '' : 'es'} registrada{inspections.length === 1 ? '' : 's'} — la edición o eliminación de un registro se hace desde el Portal de Administración.
        </p>
        <div className="flex items-center gap-2">
          {!isOnline && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg">
              <WifiOff className="w-3.5 h-3.5" /> Sin conexión
            </span>
          )}
          {queueSize > 0 && (
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-lg">
              {queueSize} pendiente{queueSize === 1 ? '' : 's'} de sincronizar
            </span>
          )}
          <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Actualizar
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition">
            <Plus className="w-3.5 h-3.5" /> Nueva inspección
          </button>
        </div>
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

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">Nueva inspección</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <FieldInspectionForm isEditing={false} onCancel={() => setShowForm(false)} onSubmit={handleSubmit} apiBase={PUBLIC_API_BASE} />
          </div>
        </div>
      )}
    </div>
  );
};
