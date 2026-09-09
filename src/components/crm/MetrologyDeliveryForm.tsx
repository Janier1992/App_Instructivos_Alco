'use client';

import React, { useState } from 'react';
import { Plus, X, AlertTriangle } from 'lucide-react';
import { SignaturePad } from '../SignaturePad';
import { MetrologyDeliveryItem } from '@/src/lib/metrologyDeliveriesStore';
import { METROLOGY_MARCAS, METROLOGY_SEDES, METROLOGY_LONGITUDES, METROLOGY_SECCIONES, METROLOGY_OBSERVACIONES_OPTIONS } from '@/src/data/metrologyOptions';

export interface MetrologyDeliveryFormValues {
  fecha: string;
  area: string;
  sede: string;
  receptorNombre: string;
  receptorCedula: string;
  receptorCargo: string;
  items: MetrologyDeliveryItem[];
  firmaEntrega: string;
  firmaRecibe: string;
}

const EMPTY_ITEM: MetrologyDeliveryItem = { equipoNombre: '', marca: '', cantidad: 1, observaciones: '', codigo: '', longitud: '' };

const EMPTY_FORM: MetrologyDeliveryFormValues = {
  fecha: new Date().toISOString().split('T')[0],
  area: '',
  sede: '',
  receptorNombre: '',
  receptorCedula: '',
  receptorCargo: '',
  items: [{ ...EMPTY_ITEM }],
  firmaEntrega: '',
  firmaRecibe: ''
};

interface Props {
  initial?: Partial<MetrologyDeliveryFormValues>;
  isEditing: boolean;
  onCancel: () => void;
  onSubmit: (values: MetrologyDeliveryFormValues) => Promise<void>;
}

export const MetrologyDeliveryForm: React.FC<Props> = ({ initial, isEditing, onCancel, onSubmit }) => {
  const [values, setValues] = useState<MetrologyDeliveryFormValues>({ ...EMPTY_FORM, ...initial, items: initial?.items?.length ? initial.items : [{ ...EMPTY_ITEM }] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof MetrologyDeliveryFormValues>(key: K, value: MetrologyDeliveryFormValues[K]) =>
    setValues(prev => ({ ...prev, [key]: value }));

  const setItem = (index: number, field: keyof MetrologyDeliveryItem, value: any) => {
    setValues(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => setValues(prev => ({ ...prev, items: [...prev.items, { ...EMPTY_ITEM }] }));
  const removeItem = (index: number) => setValues(prev => ({ ...prev, items: prev.items.length === 1 ? prev.items : prev.items.filter((_, i) => i !== index) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err: any) {
      setError(err?.message || 'Error de conexión.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Fecha">
          <input type="date" value={values.fecha} onChange={e => set('fecha', e.target.value)} required className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
        <Field label="Área">
          <select value={values.area} onChange={e => set('area', e.target.value)} required className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]">
            <option value="">Seleccione...</option>
            {METROLOGY_SECCIONES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Sede">
          <select value={values.sede} onChange={e => set('sede', e.target.value)} required className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]">
            <option value="">Seleccione...</option>
            {METROLOGY_SEDES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Nombre y apellidos (receptor)">
          <input value={values.receptorNombre} onChange={e => set('receptorNombre', e.target.value)} required className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
        <Field label="Cédula">
          <input value={values.receptorCedula} onChange={e => set('receptorCedula', e.target.value)} required className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
        <Field label="Cargo">
          <input value={values.receptorCargo} onChange={e => set('receptorCargo', e.target.value)} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700">Equipos / herramientas entregadas</label>
          <button type="button" onClick={addItem} className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#003366] bg-blue-50 hover:bg-blue-100 rounded-lg transition">
            <Plus className="w-3.5 h-3.5" /> Agregar ítem
          </button>
        </div>

        {values.items.map((item, index) => (
          <div key={index} className="bg-slate-50 border border-slate-200 rounded-xl p-3 relative space-y-2">
            {values.items.length > 1 && (
              <button type="button" onClick={() => removeItem(index)} className="absolute -top-2 -right-2 bg-slate-700 text-white rounded-full p-1">
                <X className="w-3 h-3" />
              </button>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Equipo / herramienta</label>
                <input value={item.equipoNombre} onChange={e => setItem(index, 'equipoNombre', e.target.value)} required className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Marca</label>
                <select value={item.marca} onChange={e => setItem(index, 'marca', e.target.value)} required className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]">
                  <option value="">Seleccione...</option>
                  {METROLOGY_MARCAS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Cant.</label>
                <input type="number" min={1} value={item.cantidad} onChange={e => setItem(index, 'cantidad', Number(e.target.value) || 1)} className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Código</label>
                <input value={item.codigo || ''} onChange={e => setItem(index, 'codigo', e.target.value)} placeholder="Ej: FLEX-08-05" className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Longitud</label>
                <select value={item.longitud || ''} onChange={e => setItem(index, 'longitud', e.target.value)} className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]">
                  <option value="">Seleccione...</option>
                  {METROLOGY_LONGITUDES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-4">
                <label className="text-[10px] font-bold text-slate-600 block mb-1">Observaciones</label>
                <input list={`metrology-obs-${index}`} value={item.observaciones} onChange={e => setItem(index, 'observaciones', e.target.value)} placeholder="Estado del equipo..." className="w-full px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
                <datalist id={`metrology-obs-${index}`}>
                  {METROLOGY_OBSERVACIONES_OPTIONS.map(o => <option key={o} value={o} />)}
                </datalist>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-[11px] font-semibold text-amber-800">
          Quien recibe las herramientas y/o equipos es responsable de su correcto uso y cuidado. En caso de incumplimiento, debe asumir los costos pertinentes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SignaturePad label="Firma quien entrega (Gestor SGC)" initialValue={values.firmaEntrega} onChange={v => set('firmaEntrega', v)} accentClassName="border-sky-200" />
        <SignaturePad label="Firma quien recibe (Colaborador)" initialValue={values.firmaRecibe} onChange={v => set('firmaRecibe', v)} accentClassName="border-emerald-200" />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition disabled:opacity-50">
          {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Registrar acta de entrega'}
        </button>
        <button type="button" onClick={onCancel} className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
          Cancelar
        </button>
      </div>
    </form>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <label className="text-[11px] font-bold text-slate-700 block mb-1">{label}</label>
    {children}
  </div>
);
