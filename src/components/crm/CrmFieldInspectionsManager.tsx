'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, UploadCloud, Link2, AlertTriangle, RefreshCw, X, WifiOff } from 'lucide-react';
import { FieldInspection } from '@/src/lib/fieldInspectionsStore';
import { FieldInspectionForm, FieldInspectionFormValues } from './FieldInspectionForm';
import { FieldInspectionTable } from './FieldInspectionTable';
import { FieldInspectionBulkUpload } from './FieldInspectionBulkUpload';
import { CrmFieldInspectionLinksManager } from './CrmFieldInspectionLinksManager';
import { CrmNonConformitiesManager } from './CrmNonConformitiesManager';
import { loadFieldInspectionQueue, saveFieldInspectionQueue, OfflineQueueItem as BaseOfflineQueueItem } from '@/src/lib/fieldInspectionOfflineQueue';

const OFFLINE_QUEUE_KEY = 'alco_field_inspection_offline_queue';

interface OfflineQueueItem extends BaseOfflineQueueItem {
  type: 'create' | 'update';
  editingId?: string;
}

function loadQueue(): OfflineQueueItem[] {
  return loadFieldInspectionQueue(OFFLINE_QUEUE_KEY) as OfflineQueueItem[];
}

function saveQueue(queue: OfflineQueueItem[]) {
  saveFieldInspectionQueue(OFFLINE_QUEUE_KEY, queue);
}

type Tab = 'tabla' | 'enlaces' | 'nc';

/**
 * Inspecciones en Campo — módulo de Control Calidad portado del proyecto
 * de referencia. El registro normal (foto + IA + voz + medición 2D) también
 * está disponible desde el módulo público en /procesos/control-calidad
 * (ver ProcessFieldInspectionsPanel); acá además viven la edición, el
 * borrado, la carga masiva, los enlaces externos y las No Conformidades —
 * operaciones que requieren entrar al Portal de Administración.
 */
export const CrmFieldInspectionsManager: React.FC = () => {
  const [tab, setTab] = useState<Tab>('tabla');
  const [inspections, setInspections] = useState<FieldInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FieldInspection | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/crm/field-inspections');
      const data = await res.json();
      if (data.success) setInspections(data.inspections || []);
    } catch (err) {
      console.error('Error cargando inspecciones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const syncOfflineQueue = useCallback(async () => {
    const queue = loadQueue();
    if (queue.length === 0) return;

    const remaining: OfflineQueueItem[] = [];
    for (const item of queue) {
      try {
        const url = item.type === 'update' ? `/api/crm/field-inspections/${item.editingId}` : '/api/crm/field-inspections';
        const method = item.type === 'update' ? 'PATCH' : 'POST';
        const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.payload) });
        if (!res.ok) remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }
    saveQueue(remaining);
    setQueueSize(remaining.length);
    if (remaining.length < queue.length) await load();
  }, [load]);

  useEffect(() => {
    load();
    setQueueSize(loadQueue().length);
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

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (inspection: FieldInspection) => {
    setEditing(inspection);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (values: FieldInspectionFormValues) => {
    if (!navigator.onLine) {
      const queue = loadQueue();
      queue.push({ id: `offline-${Date.now()}`, type: editing ? 'update' : 'create', payload: values, editingId: editing?.id });
      saveQueue(queue);
      setQueueSize(queue.length);
      closeForm();
      return;
    }

    const url = editing ? `/api/crm/field-inspections/${editing.id}` : '/api/crm/field-inspections';
    const method = editing ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar la inspección.');

    if (data.nonConformityCreated) {
      alert('Se abrió automáticamente un borrador de No Conformidad por el rechazo.');
    }
    closeForm();
    await load();
  };

  const handleDeleteSelected = async (ids: string[]) => {
    const res = await fetch('/api/crm/field-inspections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    const data = await res.json();
    if (data.success) await load();
    else alert(data.error || 'No se pudieron eliminar.');
  };

  const initialFormValues: Partial<FieldInspectionFormValues> | undefined = editing
    ? {
        fecha: editing.fecha,
        areaProceso: editing.areaProceso,
        op: editing.op,
        planoOpc: editing.planoOpc || '',
        disenoReferencia: editing.disenoReferencia || '',
        cantTotal: editing.cantTotal,
        cantRetenida: editing.cantRetenida,
        estado: editing.estado,
        defecto: editing.defecto,
        reviso: editing.reviso || '',
        responsable: editing.responsable || '',
        accionCorrectiva: editing.accionCorrectiva || 'NA',
        observacion: editing.observacion || '',
        photoStoragePath: editing.photoStoragePath || '',
        alertLevel: editing.alertLevel,
        aiMetadata: editing.aiMetadata
      }
    : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#003366]" /> Inspecciones en Campo
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Registro de inspecciones de calidad en planta — foto, IA de defectos, medición 2D y disparo automático de No Conformidad.</p>
        </div>
        {!isOnline && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg">
            <WifiOff className="w-3.5 h-3.5" /> Sin conexión — los registros se guardan localmente
          </span>
        )}
        {queueSize > 0 && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-blue-100 px-3 py-1.5 rounded-lg">
            {queueSize} pendiente{queueSize === 1 ? '' : 's'} de sincronizar
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
        <TabButton active={tab === 'tabla'} onClick={() => setTab('tabla')} icon={<ClipboardList className="w-3.5 h-3.5" />} label="Registros" />
        <TabButton active={tab === 'enlaces'} onClick={() => setTab('enlaces')} icon={<Link2 className="w-3.5 h-3.5" />} label="Enlaces externos" />
        <TabButton active={tab === 'nc'} onClick={() => setTab('nc')} icon={<AlertTriangle className="w-3.5 h-3.5" />} label="No Conformidades" />
      </div>

      {tab === 'tabla' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-bold text-sm text-slate-800">{inspections.length} registro{inspections.length === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-2">
              <button onClick={load} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Actualizar
              </button>
              <button onClick={() => setShowBulkUpload(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 rounded-lg transition">
                <UploadCloud className="w-3.5 h-3.5" /> Carga masiva
              </button>
              <button onClick={openCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition">
                <Plus className="w-3.5 h-3.5" /> Nueva Inspección
              </button>
            </div>
          </div>
          <FieldInspectionTable inspections={inspections} onEdit={openEdit} onDeleteSelected={handleDeleteSelected} />
        </div>
      )}

      {tab === 'enlaces' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <CrmFieldInspectionLinksManager />
        </div>
      )}

      {tab === 'nc' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <CrmNonConformitiesManager />
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900">{editing ? 'Editar inspección' : 'Nueva inspección'}</h3>
              <button onClick={closeForm}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <FieldInspectionForm
              initial={initialFormValues}
              initialPhotoUrl={editing?.photoStoragePath ? `/api/field-inspections/${editing.id}/photo` : null}
              isEditing={!!editing}
              onCancel={closeForm}
              onSubmit={handleSubmit}
            />
          </div>
        </div>
      )}

      {showBulkUpload && (
        <FieldInspectionBulkUpload
          onClose={() => setShowBulkUpload(false)}
          onDone={() => {
            setShowBulkUpload(false);
            load();
          }}
        />
      )}
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-t-lg transition ${
      active ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-slate-500 hover:text-slate-800'
    }`}
  >
    {icon} {label}
  </button>
);
