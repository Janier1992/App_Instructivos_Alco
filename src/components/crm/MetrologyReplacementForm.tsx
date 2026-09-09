'use client';

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { SignaturePad } from '../SignaturePad';
import { METROLOGY_MARCAS, METROLOGY_SECCIONES } from '@/src/data/metrologyOptions';

export interface MetrologyReplacementFormValues {
  fechaRegistro: string;
  nombreEquipo: string;
  marca: string;
  codigo: string;
  areaUso: string;
  nombreResponsable: string;
  motivoReposicion: string;
  devuelveEquipoAnterior: 'SI' | 'NO' | '';
  descripcionBaja: string;
  seCobraEquipo: 'SI' | 'NO' | '';
  nombreResponsableCalidad: string;
  firmaResponsableArea: string;
  firmaResponsableCalidad: string;
}

const EMPTY_FORM: MetrologyReplacementFormValues = {
  fechaRegistro: new Date().toISOString().split('T')[0],
  nombreEquipo: '',
  marca: '',
  codigo: '',
  areaUso: '',
  nombreResponsable: '',
  motivoReposicion: '',
  devuelveEquipoAnterior: 'NO',
  descripcionBaja: '',
  seCobraEquipo: 'NO',
  nombreResponsableCalidad: '',
  firmaResponsableArea: '',
  firmaResponsableCalidad: ''
};

interface Props {
  initial?: Partial<MetrologyReplacementFormValues>;
  isEditing: boolean;
  onCancel: () => void;
  onSubmit: (values: MetrologyReplacementFormValues) => Promise<void>;
}

export const MetrologyReplacementForm: React.FC<Props> = ({ initial, isEditing, onCancel, onSubmit }) => {
  const [values, setValues] = useState<MetrologyReplacementFormValues>({ ...EMPTY_FORM, ...initial });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof MetrologyReplacementFormValues>(key: K, value: MetrologyReplacementFormValues[K]) =>
    setValues(prev => ({ ...prev, [key]: value }));

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Fecha de registro">
          <input type="date" value={values.fechaRegistro} onChange={e => set('fechaRegistro', e.target.value)} required className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
        <Field label="Nombre del equipo">
          <input value={values.nombreEquipo} onChange={e => set('nombreEquipo', e.target.value)} required className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Marca">
          <input list="metrology-replacement-marcas" value={values.marca} onChange={e => set('marca', e.target.value)} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
          <datalist id="metrology-replacement-marcas">
            {METROLOGY_MARCAS.map(m => <option key={m} value={m} />)}
          </datalist>
        </Field>
        <Field label="Código">
          <input value={values.codigo} onChange={e => set('codigo', e.target.value)} required className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Proceso / área de uso">
          <select value={values.areaUso} onChange={e => set('areaUso', e.target.value)} required className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]">
            <option value="">Seleccione...</option>
            {METROLOGY_SECCIONES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Nombre del responsable">
          <input value={values.nombreResponsable} onChange={e => set('nombreResponsable', e.target.value)} required className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
        </Field>
      </div>

      <Field label="Motivo de reposición">
        <textarea value={values.motivoReposicion} onChange={e => set('motivoReposicion', e.target.value)} required rows={3} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#003366]" />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="¿Devuelve equipo anterior?">
          <select value={values.devuelveEquipoAnterior} onChange={e => set('devuelveEquipoAnterior', e.target.value as 'SI' | 'NO' | '')} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]">
            <option value="">Seleccione</option>
            <option value="SI">SI</option>
            <option value="NO">NO</option>
          </select>
        </Field>
        <Field label="¿Se cobra equipo?">
          <select value={values.seCobraEquipo} onChange={e => set('seCobraEquipo', e.target.value as 'SI' | 'NO' | '')} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]">
            <option value="">Seleccione</option>
            <option value="SI">SI</option>
            <option value="NO">NO</option>
          </select>
        </Field>
      </div>

      <Field label="Descripción de la baja y disposición final">
        <textarea value={values.descripcionBaja} onChange={e => set('descripcionBaja', e.target.value)} rows={3} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#003366]" />
      </Field>

      <Field label="Nombre responsable de Calidad">
        <input value={values.nombreResponsableCalidad} onChange={e => set('nombreResponsableCalidad', e.target.value)} className="w-full px-2.5 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#003366]" />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SignaturePad label="Firma responsable proceso/área" initialValue={values.firmaResponsableArea} onChange={v => set('firmaResponsableArea', v)} accentClassName="border-sky-200" />
        <SignaturePad label="Firma responsable Calidad" initialValue={values.firmaResponsableCalidad} onChange={v => set('firmaResponsableCalidad', v)} accentClassName="border-emerald-200" />
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg transition disabled:opacity-50">
          {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Registrar reposición/baja'}
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
