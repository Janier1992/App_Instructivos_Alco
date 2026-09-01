'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ClipboardCheck, Plus, Trash2, EyeOff, Eye, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ProcessPicker } from './ProcessPicker';

interface ShiftCheckItem {
  id: string;
  processSlug: string;
  label: string;
  displayOrder: number;
  active: boolean;
}

interface ShiftCheckResult {
  itemId: string;
  label: string;
  passed: boolean;
}

interface ShiftCheck {
  id: string;
  processSlug: string;
  shift: 'manana' | 'tarde' | 'noche';
  collaboratorName: string;
  results: ShiftCheckResult[];
  allPassed: boolean;
  notes?: string;
  createdAt: string;
}

const SHIFT_LABELS: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };

/**
 * Gestión del Autocontrol por Turno: Calidad define qué ítems críticos debe
 * confirmar cada proceso (checklist corto, 2-5 ítems recomendados) y aquí
 * revisa el historial real de autocontroles enviados desde la app pública
 * — en particular los que marcaron algún ítem como "No cumple".
 */
export const CrmShiftChecksManager: React.FC = () => {
  const [processSlug, setProcessSlug] = useState('');
  const [items, setItems] = useState<ShiftCheckItem[]>([]);
  const [checks, setChecks] = useState<ShiftCheck[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingChecks, setLoadingChecks] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  const loadItems = useCallback(async () => {
    if (!processSlug) return;
    setLoadingItems(true);
    try {
      const res = await fetch(`/api/crm/shift-check-items?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (data.success) setItems(data.items || []);
    } catch (err) {
      console.error('Error cargando ítems de autocontrol:', err);
    } finally {
      setLoadingItems(false);
    }
  }, [processSlug]);

  const loadChecks = useCallback(async () => {
    if (!processSlug) return;
    setLoadingChecks(true);
    try {
      const res = await fetch(`/api/crm/shift-checks?processSlug=${encodeURIComponent(processSlug)}`);
      const data = await res.json();
      if (data.success) setChecks(data.checks || []);
    } catch (err) {
      console.error('Error cargando historial de autocontrol:', err);
    } finally {
      setLoadingChecks(false);
    }
  }, [processSlug]);

  useEffect(() => {
    loadItems();
    loadChecks();
  }, [loadItems, loadChecks]);

  const handleAddItem = async () => {
    if (!newLabel.trim()) return;
    setSavingItem(true);
    try {
      const res = await fetch('/api/crm/shift-check-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processSlug, label: newLabel, displayOrder: items.length })
      });
      const data = await res.json();
      if (data.success) {
        setNewLabel('');
        loadItems();
      } else {
        alert(data.error || 'No se pudo guardar.');
      }
    } catch (err) {
      console.error('Error creando ítem de autocontrol:', err);
    } finally {
      setSavingItem(false);
    }
  };

  const handleToggleActive = async (item: ShiftCheckItem) => {
    try {
      const res = await fetch(`/api/crm/shift-check-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active })
      });
      const data = await res.json();
      if (data.success) {
        setItems(prev => prev.map(i => (i.id === item.id ? { ...i, active: !item.active } : i)));
      } else {
        alert(data.error || 'No se pudo actualizar.');
      }
    } catch (err) {
      console.error('Error actualizando ítem de autocontrol:', err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('¿Eliminar este ítem del checklist? El historial de autocontroles ya enviados no se borra.')) return;
    try {
      const res = await fetch(`/api/crm/shift-check-items/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setItems(prev => prev.filter(i => i.id !== id));
      } else {
        alert(data.error || 'No se pudo eliminar.');
      }
    } catch (err) {
      console.error('Error eliminando ítem de autocontrol:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Autocontrol por Turno</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define el checklist corto (2-5 ítems) que cada proceso confirma por sí mismo en cada turno, y revisa lo que de verdad se está reportando.
          </p>
        </div>
        <ProcessPicker value={processSlug} onChange={setProcessSlug} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 font-bold text-sm text-slate-800 border-b border-slate-200 pb-3">
          <ClipboardCheck className="w-5 h-5 text-[#003366]" />
          <span>Ítems del checklist</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder='Ítem corto, ej. "Tope micrométrico calibrado dentro de ±0.5 mm"'
            maxLength={300}
            className="flex-1 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]"
          />
          <button
            onClick={handleAddItem}
            disabled={savingItem || !newLabel.trim()}
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-[#003366] hover:bg-blue-700 rounded-lg transition disabled:opacity-50 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>

        {loadingItems ? (
          <div className="p-6 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando...
          </div>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">
            Sin ítems configurados — la app pública no mostrará la caja de Autocontrol para este proceso hasta que agregues al menos uno.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className={`flex items-center gap-2 p-2.5 rounded-lg border ${item.active ? 'border-slate-200 bg-slate-50/60' : 'border-slate-200 bg-slate-100/60 opacity-60'}`}>
                <span className="flex-1 text-sm text-slate-800">{item.label}</span>
                {!item.active && <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full shrink-0">Inactivo</span>}
                <button
                  onClick={() => handleToggleActive(item)}
                  className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-lg transition shrink-0"
                  title={item.active ? 'Desactivar' : 'Reactivar'}
                >
                  {item.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition shrink-0"
                  title="Eliminar"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <span className="font-bold text-sm text-slate-800">Historial de autocontroles</span>
          <button onClick={loadChecks} className="text-[11px] font-semibold text-[#003366] hover:underline flex items-center gap-1">
            <RefreshCw className={`w-3 h-3 ${loadingChecks ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {loadingChecks ? (
          <div className="p-6 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Cargando...
          </div>
        ) : checks.length === 0 ? (
          <p className="text-xs text-slate-400 italic text-center py-4">Todavía no hay autocontroles registrados para este proceso.</p>
        ) : (
          <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-1">
            {checks.map(check => (
              <div key={check.id} className={`p-3 rounded-lg border ${check.allPassed ? 'border-slate-200 bg-slate-50/60' : 'border-rose-200 bg-rose-50/50'}`}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    {check.allPassed ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    )}
                    Turno {SHIFT_LABELS[check.shift]} · {check.collaboratorName}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(check.createdAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <ul className="mt-1.5 space-y-0.5">
                  {check.results.map((r, idx) => (
                    <li key={idx} className={`text-[11px] flex items-center gap-1.5 ${r.passed ? 'text-slate-600' : 'text-rose-700 font-semibold'}`}>
                      {r.passed ? '✓' : '✕'} {r.label}
                    </li>
                  ))}
                </ul>
                {check.notes && <p className="mt-1.5 text-[11px] text-slate-600 italic">"{check.notes}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
