'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { Divulgacion, DivulgacionAsistente } from '@/src/lib/divulgacionStore';
import { PROCESS_SECTIONS } from '@/src/lib/divulgacionShared';

const INPUT = 'w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]';
const LABEL = 'text-[11px] font-bold text-slate-600 block mb-1';
const MIN_ID_DIGITS = 5;

interface Props {
  divulgacionId: string;
  attendee: DivulgacionAsistente;
  onClose: () => void;
  /** Recibe la divulgación con la fila ya corregida. */
  onSaved: (updated: Divulgacion) => void;
}

/** Corrige el nombre, la cédula o el proceso o sección de una fila de la planilla; la firma registrada no cambia. */
export const DivulgacionAttendeeEditModal: React.FC<Props> = ({ divulgacionId, attendee, onClose, onSaved }) => {
  const [nombre, setNombre] = useState(attendee.nombre);
  const [cedula, setCedula] = useState(attendee.cedula);
  const [proceso, setProceso] = useState(attendee.procesoSeccion);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si el proceso guardado ya no está en la lista, se conserva como opción para no perderlo al guardar.
  const sections = PROCESS_SECTIONS.includes(attendee.procesoSeccion) || !attendee.procesoSeccion ? PROCESS_SECTIONS : [attendee.procesoSeccion, ...PROCESS_SECTIONS];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = cedula.replace(/\D/g, '');
    if (!nombre.trim()) return setError('Escribe el nombre completo.');
    if (id.length < MIN_ID_DIGITS) return setError('Escribe el número de cédula.');
    if (!proceso) return setError('Elige el proceso o sección.');
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/divulgaciones/${divulgacionId}/asistentes/${attendee.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nombre.trim(), cedula: id, procesoSeccion: proceso }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.divulgacion) throw new Error(data.error || 'No se pudo actualizar el registro.');
      onSaved(data.divulgacion as Divulgacion);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Editar registro de asistencia</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div><label className={LABEL}>Nombre completo *</label><input className={INPUT} value={nombre} onChange={e => setNombre(e.target.value)} /></div>
        <div><label className={LABEL}>Cédula *</label><input className={INPUT} value={cedula} onChange={e => setCedula(e.target.value)} inputMode="numeric" /></div>
        <div>
          <label className={LABEL}>Proceso/Sección *</label>
          <select className={INPUT} value={proceso} onChange={e => setProceso(e.target.value)}>
            <option value="">Elige el proceso o sección</option>
            {sections.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <p className="text-[11px] text-slate-500">La firma registrada no cambia.</p>
        {error && <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">{error}</div>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1.5 text-xs font-semibold text-slate-600">Cancelar</button>
          <button type="submit" disabled={saving} className="px-4 py-1.5 text-xs font-bold text-white bg-[#003366] rounded-lg disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </form>
    </div>
  );
};
