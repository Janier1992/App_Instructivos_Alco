'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Send } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { compactSignature } from '@/src/lib/signatureImage';
import type { Divulgacion } from '@/src/lib/divulgacionStore';
import { PROCESS_SECTIONS } from '@/src/lib/divulgacionShared';

const INPUT = 'w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#003366]';
const LABEL = 'text-[11px] font-bold text-slate-600 block mb-1';
const MIN_ID_DIGITS = 5;

interface Props {
  divulgacion: Divulgacion;
  onClose: () => void;
  /** Recibe la divulgación actualizada con la nueva fila de asistencia. */
  onRegistered: (updated: Divulgacion) => void;
}

/** Cada asistente registra su propia fila: nombre, cédula, proceso o sección y su firma dibujada en la pantalla. */
export const DivulgacionAttendanceModal: React.FC<Props> = ({ divulgacion, onClose, onRegistered }) => {
  const initialProcess = PROCESS_SECTIONS.includes(divulgacion.procesoArea.toUpperCase()) ? divulgacion.procesoArea.toUpperCase() : '';
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [proceso, setProceso] = useState(initialProcess);
  const [drawn, setDrawn] = useState('');
  const [padKey, setPadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRegistered, setLastRegistered] = useState<string | null>(null);

  const reset = () => {
    setNombre('');
    setCedula('');
    setProceso(initialProcess);
    setDrawn('');
    setPadKey(k => k + 1);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = cedula.replace(/\D/g, '');
    if (!nombre.trim()) return setError('Escribe tu nombre completo.');
    if (id.length < MIN_ID_DIGITS) return setError('Escribe tu número de cédula.');
    if (!proceso) return setError('Elige tu proceso o sección.');
    if (!drawn) return setError('Dibuja tu firma en el recuadro.');

    setSaving(true);
    setError(null);
    try {
      const firma = await compactSignature(drawn);
      const res = await fetch(`/api/divulgaciones/${divulgacion.id}/asistentes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre.trim(), cedula: id, procesoSeccion: proceso, firma })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo registrar la asistencia.');
      onRegistered(data.divulgacion as Divulgacion);
      setLastRegistered(nombre.trim());
      reset();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} className="bg-white rounded-2xl max-w-lg w-full max-h-[94vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900">Registrar mi asistencia</h3>
            <p className="text-xs text-slate-500 mt-0.5">{divulgacion.tema}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {lastRegistered && (
          <div className="flex items-start gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Quedó registrada la asistencia de {lastRegistered}. Si hay otra persona, puede registrarse ahora en este mismo equipo.</span>
          </div>
        )}

        <div><label className={LABEL}>Nombre completo *</label><input className={INPUT} value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="name" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className={LABEL}>Cédula *</label><input className={INPUT} value={cedula} onChange={e => setCedula(e.target.value)} inputMode="numeric" placeholder="Solo números" /></div>
          <div>
            <label className={LABEL}>Proceso/Sección *</label>
            <select className={INPUT} value={proceso} onChange={e => setProceso(e.target.value)}>
              <option value="">Elige tu proceso o sección</option>
              {PROCESS_SECTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <SignaturePad key={padKey} label="Firma *" initialValue={null} onChange={setDrawn} accentClassName="border-sky-200" />
        <p className="text-[10px] text-slate-500 -mt-1">Firma con el dedo, el lápiz o el mouse. Si te equivocas, usa el botón de limpiar de la esquina del recuadro.</p>

        {error && <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">{error}</div>}

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button type="button" onClick={onClose} disabled={saving} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-lg disabled:opacity-50">Cerrar</button>
          <button type="submit" disabled={saving} className="px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg flex items-center gap-1.5 disabled:opacity-60"><Send className="w-3.5 h-3.5" /> {saving ? 'Enviando...' : 'Enviar registro'}</button>
        </div>
      </form>
    </div>
  );
};
