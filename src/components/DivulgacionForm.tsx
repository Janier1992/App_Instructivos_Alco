'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, Search, X, FileText } from 'lucide-react';
import type { Communique } from '@/src/lib/communiqueStore';
import type { Divulgacion, DivulgacionInput, DivulgacionKind } from '@/src/lib/divulgacionStore';
import { KIND_LABELS, KIND_ORDER, PROCESS_SECTIONS, fieldsFromCommunique } from '@/src/lib/divulgacionShared';

const INPUT = 'w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]';
const LABEL = 'text-[11px] font-bold text-slate-600 block mb-1';
const MAX_RESULTS = 8;

interface Props {
  initial?: Divulgacion;
  onCancel: () => void;
  onSaved: (saved: Divulgacion) => Promise<void> | void;
}

/** Datos de la planilla de asistencia: se pueden tomar de un comunicado ya creado, que se busca y se elige en la lista. */
export const DivulgacionForm: React.FC<Props> = ({ initial, onCancel, onSaved }) => {
  const [tipo, setTipo] = useState<DivulgacionKind>(initial?.tipo || 'divulgacion');
  const [fecha, setFecha] = useState(initial?.fecha || new Date().toISOString().split('T')[0]);
  const [tema, setTema] = useState(initial?.tema || '');
  const [objetivo, setObjetivo] = useState(initial?.objetivo || '');
  const [responsable, setResponsable] = useState(initial?.responsable || '');
  const [procesoArea, setProcesoArea] = useState(initial?.procesoArea || '');
  const [duracion, setDuracion] = useState(initial?.duracion || '');
  const [evaluacionDias, setEvaluacionDias] = useState(initial?.evaluacionDias || '');
  const [evaluador, setEvaluador] = useState(initial?.evaluador || '');
  const [resultados, setResultados] = useState(initial?.resultados || '');
  const [comunicado, setComunicado] = useState<{ id: string; asunto: string } | null>(initial?.comunicadoId ? { id: initial.comunicadoId, asunto: 'Comunicado vinculado' } : null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [communiques, setCommuniques] = useState<Communique[] | null>(null);
  const [search, setSearch] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPicker = async () => {
    setPickerOpen(true);
    if (communiques) return;
    setLoadingList(true);
    try {
      const res = await fetch('/api/communiques', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudieron cargar los comunicados.');
      setCommuniques(data.communiques || []);
    } catch (err: any) {
      setError(err.message);
      setCommuniques([]);
    } finally {
      setLoadingList(false);
    }
  };

  const term = search.trim().toLowerCase();
  const results = (communiques || []).filter(c => !term || [c.asunto, c.para, c.de].some(v => v?.toLowerCase().includes(term))).slice(0, MAX_RESULTS);

  /** Llena los campos de la planilla con los datos del comunicado elegido; todos se pueden ajustar después. */
  const pickCommunique = (c: Communique) => {
    const fields = fieldsFromCommunique(c);
    setTema(fields.tema);
    setObjetivo(fields.objetivo);
    setResponsable(fields.responsable);
    setProcesoArea(fields.procesoArea);
    setComunicado({ id: c.id, asunto: c.asunto });
    setPickerOpen(false);
    setSearch('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tema.trim() || !responsable.trim()) return setError('Completa el tema y el responsable del tema.');
    setBusy(true);
    setError(null);
    try {
      const body: DivulgacionInput = { fecha, tema, objetivo, responsable, procesoArea, duracion, tipo, comunicadoId: comunicado?.id ?? null, evaluacionDias, evaluador, resultados };
      const res = await fetch(initial ? `/api/divulgaciones/${initial.id}` : '/api/divulgaciones', { method: initial ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar la divulgación.');
      await onSaved(data.divulgacion as Divulgacion);
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-slate-700">¿Parte de un comunicado ya creado?</p>
          {!pickerOpen && <button type="button" onClick={openPicker} className="flex items-center gap-1 text-[11px] font-bold text-[#003366] border border-[#003366] rounded-lg px-3 py-1.5"><Search className="w-3 h-3" /> Buscar comunicado</button>}
        </div>
        {comunicado && (
          <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs">
            <span className="flex items-center gap-1.5 min-w-0"><FileText className="w-3.5 h-3.5 text-[#003366] shrink-0" /><span className="truncate">{comunicado.asunto}</span></span>
            <button type="button" onClick={() => setComunicado(null)} aria-label="Quitar comunicado"><X className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" /></button>
          </div>
        )}
        {pickerOpen && (
          <div className="space-y-2">
            <input autoFocus className={INPUT} value={search} onChange={e => setSearch(e.target.value)} placeholder="Escribe parte del asunto o del área" />
            {loadingList ? (
              <p className="text-[11px] text-slate-500 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Cargando comunicados...</p>
            ) : results.length === 0 ? (
              <p className="text-[11px] text-slate-500">No hay comunicados que coincidan.</p>
            ) : (
              <ul className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                {results.map(c => (
                  <li key={c.id}>
                    <button type="button" onClick={() => pickCommunique(c)} className="w-full text-left px-3 py-2 hover:bg-blue-50">
                      <span className="block text-xs font-semibold text-slate-800">{c.asunto}</span>
                      <span className="block text-[10px] text-slate-500">{c.fecha} · Para: {c.para}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => setPickerOpen(false)} className="text-[11px] font-semibold text-slate-500 hover:underline">Cerrar búsqueda</button>
          </div>
        )}
        <p className="text-[10px] text-slate-500">Al elegirlo se llenan el tema, el objetivo, el responsable y el proceso. Puedes ajustarlos.</p>
      </div>

      <div>
        <label className={LABEL}>Tipo de sesión *</label>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de sesión">
          {KIND_ORDER.map(kind => (
            <button key={kind} type="button" role="radio" aria-checked={tipo === kind} onClick={() => setTipo(kind)} className={`px-2 py-2 rounded-lg border text-xs font-bold transition ${tipo === kind ? 'bg-[#003366] border-[#003366] text-white' : 'bg-slate-50 border-slate-300 text-slate-600 hover:border-[#003366]'}`}>{KIND_LABELS[kind]}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Fecha *</label><input type="date" className={INPUT} value={fecha} onChange={e => setFecha(e.target.value)} /></div>
        <div><label className={LABEL}>Duración</label><input className={INPUT} value={duracion} onChange={e => setDuracion(e.target.value)} placeholder="Ej: 20 Minutos" /></div>
        <div className="sm:col-span-2"><label className={LABEL}>Tema *</label><input className={INPUT} value={tema} onChange={e => setTema(e.target.value)} placeholder="Ej: Marco del vidrio para exportación" /></div>
        <div className="sm:col-span-2"><label className={LABEL}>Objetivo</label><textarea className={INPUT} rows={2} value={objetivo} onChange={e => setObjetivo(e.target.value)} placeholder="Ej: Estandarizar la marcación en el canto del vidrio que se va a exportar" /></div>
        <div><label className={LABEL}>Responsable del tema *</label><input className={INPUT} value={responsable} onChange={e => setResponsable(e.target.value)} /></div>
        <div>
          <label className={LABEL}>Proceso/área</label>
          <input className={INPUT} list="divulgacion-procesos" value={procesoArea} onChange={e => setProcesoArea(e.target.value)} placeholder="Elige de la lista o escribe" />
          <datalist id="divulgacion-procesos">{PROCESS_SECTIONS.map(p => <option key={p} value={p} />)}</datalist>
        </div>
      </div>

      <details className="border border-slate-200 rounded-xl p-3 bg-slate-50" open={Boolean(initial?.evaluacionDias || initial?.evaluador || initial?.resultados)}>
        <summary className="text-xs font-bold text-slate-700 cursor-pointer">Evaluación (opcional, se puede completar después)</summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div><label className={LABEL}>Será evaluada en (días)</label><input className={INPUT} value={evaluacionDias} onChange={e => setEvaluacionDias(e.target.value)} placeholder="Ej: 8" /></div>
          <div><label className={LABEL}>Responsable de realizar la evaluación</label><input className={INPUT} value={evaluador} onChange={e => setEvaluador(e.target.value)} /></div>
          <div className="sm:col-span-2"><label className={LABEL}>Resultados de la evaluación</label><textarea className={INPUT} rows={2} value={resultados} onChange={e => setResultados(e.target.value)} /></div>
        </div>
      </details>

      {error && <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">{error}</div>}

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button type="button" onClick={onCancel} disabled={busy} className="px-4 py-2 text-xs font-bold text-slate-600 border border-slate-300 rounded-lg disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={busy} className="px-4 py-2 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg flex items-center gap-1.5 disabled:opacity-60">
          {busy ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Guardando...</> : <><Sparkles className="w-3.5 h-3.5" /> {initial ? 'Guardar cambios' : 'Crear planilla'}</>}
        </button>
      </div>
    </form>
  );
};
