'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, Search, X, FileText, Plus, Trash2, PenLine, CheckCircle2 } from 'lucide-react';
import { DocumentTypeTiles, type DocumentType } from './DocumentTypeTiles';
import { SignatureDialog } from './SignatureDialog';
import type { Communique } from '@/src/lib/communiqueStore';
import type { Divulgacion, DivulgacionInput, DivulgacionKind } from '@/src/lib/divulgacionStore';
import { DEFAULT_SESSION, KIND_LABELS, KIND_ORDER, PROCESS_SECTIONS, fieldsFromCommunique } from '@/src/lib/divulgacionShared';

const INPUT = 'w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#003366]';
const LABEL = 'text-[11px] font-bold text-slate-600 block mb-1';
const MAX_RESULTS = 8;
const MIN_ID_DIGITS = 5;

/** Fila de asistencia del formulario: nueva (sin id, editable) o ya guardada (con id, solo se puede quitar). */
interface AttendeeRow {
  key: string;
  id?: string;
  nombre: string;
  cedula: string;
  procesoSeccion: string;
  firma: string | null;
}

interface Props {
  initial?: Divulgacion;
  onCancel: () => void;
  onSaved: (saved: Divulgacion) => Promise<void> | void;
  /** Cambia el tipo de documento (Comunicado o Divulgación) dentro del mismo módulo. */
  onSelectType: (type: DocumentType) => void;
}

const newRow = (): AttendeeRow => ({ key: `${Date.now()}-${Math.random()}`, nombre: '', cedula: '', procesoSeccion: '', firma: null });
const digits = (value: string) => value.replace(/\D/g, '');
const isBlank = (r: AttendeeRow) => !r.nombre.trim() && !r.cedula.trim() && !r.procesoSeccion && !r.firma;

/** Planilla de asistencia: datos de la sesión (que se pueden tomar de un comunicado ya creado) y la lista de colaboradores con su cédula, proceso o sección y firma. */
export const DivulgacionForm: React.FC<Props> = ({ initial, onCancel, onSaved, onSelectType }) => {
  const [tipo, setTipo] = useState<DivulgacionKind>(initial?.tipo || DEFAULT_SESSION.tipo);
  const [fecha, setFecha] = useState(initial?.fecha || new Date().toISOString().split('T')[0]);
  const [tema, setTema] = useState(initial?.tema || '');
  const [objetivo, setObjetivo] = useState(initial?.objetivo || '');
  const [responsable, setResponsable] = useState(initial?.responsable || DEFAULT_SESSION.responsable);
  const [procesoArea, setProcesoArea] = useState(initial?.procesoArea || DEFAULT_SESSION.procesoArea);
  const [duracion, setDuracion] = useState(initial?.duracion || DEFAULT_SESSION.duracion);
  const [evaluacionDias, setEvaluacionDias] = useState(initial?.evaluacionDias || '');
  const [evaluador, setEvaluador] = useState(initial?.evaluador || '');
  const [resultados, setResultados] = useState(initial?.resultados || '');
  const [comunicado, setComunicado] = useState<{ id: string; asunto: string } | null>(initial?.comunicadoId ? { id: initial.comunicadoId, asunto: 'Comunicado vinculado' } : null);
  const [rows, setRows] = useState<AttendeeRow[]>(() => [
    ...(initial?.asistentes || []).map(a => ({ key: a.id, id: a.id, nombre: a.nombre, cedula: a.cedula, procesoSeccion: a.procesoSeccion, firma: a.firma })),
    newRow()
  ]);
  const [signingKey, setSigningKey] = useState<string | null>(null);

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
    setComunicado({ id: c.id, asunto: c.asunto });
    setPickerOpen(false);
    setSearch('');
    setError(null);
  };

  const updateRow = (key: string, patch: Partial<AttendeeRow>) => setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key: string) => setRows(prev => (prev.filter(r => r.key !== key).length ? prev.filter(r => r.key !== key) : [newRow()]));
  const signingRow = rows.find(r => r.key === signingKey);

  /** Revisa las filas con datos: todas deben estar completas y sin cédulas repetidas. Devuelve el error o las filas nuevas a registrar. */
  const checkRows = (): { error: string } | { fresh: AttendeeRow[] } => {
    const filled = rows.filter(r => !isBlank(r));
    for (const [i, r] of filled.entries()) {
      const who = r.nombre.trim() || `la persona ${i + 1}`;
      if (!r.nombre.trim()) return { error: `Falta el nombre de la persona ${i + 1}.` };
      if (digits(r.cedula).length < MIN_ID_DIGITS) return { error: `Falta la cédula de ${who}.` };
      if (!r.procesoSeccion) return { error: `Falta el proceso o sección de ${who}.` };
      if (!r.firma) return { error: `Falta la firma de ${who}.` };
    }
    const ids = filled.map(r => digits(r.cedula));
    const repeated = ids.find((id, i) => ids.indexOf(id) !== i);
    if (repeated) return { error: `La cédula ${repeated} está repetida en la lista.` };
    return { fresh: filled.filter(r => !r.id) };
  };

  const toPayload = (r: AttendeeRow) => ({ nombre: r.nombre.trim(), cedula: digits(r.cedula), procesoSeccion: r.procesoSeccion, firma: r.firma as string });
  const call = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo guardar.');
    return data;
  };

  /** Al editar: se actualiza la sesión, se quitan las filas borradas y se registran las nuevas. */
  const saveEdit = async (header: DivulgacionInput, fresh: AttendeeRow[]): Promise<Divulgacion> => {
    const base = `/api/divulgaciones/${initial!.id}`;
    await call(base, 'PATCH', header);
    const keptIds = new Set(rows.filter(r => r.id).map(r => r.id));
    for (const old of (initial!.asistentes || []).filter(a => !keptIds.has(a.id))) await call(`${base}/asistentes/${old.id}`, 'DELETE');
    let latest: Divulgacion | undefined;
    for (const r of fresh) latest = (await call(`${base}/asistentes`, 'POST', toPayload(r))).divulgacion;
    return latest ?? (await call(base, 'GET')).divulgacion;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tema.trim() || !responsable.trim()) return setError('Completa el tema y el responsable del tema.');
    const checked = checkRows();
    if ('error' in checked) return setError(checked.error);

    setBusy(true);
    setError(null);
    try {
      const header: DivulgacionInput = { fecha, tema, objetivo, responsable, procesoArea, duracion, tipo, comunicadoId: comunicado?.id ?? null, evaluacionDias, evaluador, resultados };
      const saved: Divulgacion = initial
        ? await saveEdit(header, checked.fresh)
        : (await call('/api/divulgaciones', 'POST', { ...header, asistentes: checked.fresh.map(toPayload) })).divulgacion;
      await onSaved(saved);
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <DocumentTypeTiles active="divulgacion" onSelect={onSelectType} disabled={busy} />

      <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-slate-700">¿Qué comunicado se divulga?</p>
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
        <p className="text-[10px] text-slate-500">Al elegirlo se llenan el tema y el objetivo. Puedes ajustarlos.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div><label className={LABEL}>Fecha *</label><input type="date" className={INPUT} value={fecha} onChange={e => setFecha(e.target.value)} /></div>
        <div className="sm:col-span-2"><label className={LABEL}>Tema *</label><input className={INPUT} value={tema} onChange={e => setTema(e.target.value)} placeholder="Ej: Marco del vidrio para exportación" /></div>
        <div className="sm:col-span-2"><label className={LABEL}>Objetivo</label><textarea className={INPUT} rows={2} value={objetivo} onChange={e => setObjetivo(e.target.value)} placeholder="Ej: Estandarizar la marcación en el canto del vidrio que se va a exportar" /></div>
      </div>

      <details className="border border-slate-200 rounded-xl p-3 bg-slate-50">
        <summary className="text-xs font-bold text-slate-700 cursor-pointer">
          Datos de la planilla: {KIND_LABELS[tipo]} · {responsable || 'sin responsable'} · {procesoArea || 'sin proceso'} · {duracion || 'sin duración'}
          <span className="block text-[10px] font-normal text-slate-500">Vienen preestablecidos; ábrelos solo si necesitas cambiarlos.</span>
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className={LABEL}>Tipo de sesión *</label>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tipo de sesión">
              {KIND_ORDER.map(kind => (
                <button key={kind} type="button" role="radio" aria-checked={tipo === kind} onClick={() => setTipo(kind)} className={`px-2 py-2 rounded-lg border text-xs font-bold transition ${tipo === kind ? 'bg-[#003366] border-[#003366] text-white' : 'bg-white border-slate-300 text-slate-600 hover:border-[#003366]'}`}>{KIND_LABELS[kind]}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={LABEL}>Responsable del tema *</label><input className={INPUT} value={responsable} onChange={e => setResponsable(e.target.value)} /></div>
            <div>
              <label className={LABEL}>Proceso/área</label>
              <input className={INPUT} list="divulgacion-procesos" value={procesoArea} onChange={e => setProcesoArea(e.target.value)} placeholder="Elige de la lista o escribe" />
              <datalist id="divulgacion-procesos">{PROCESS_SECTIONS.map(p => <option key={p} value={p} />)}</datalist>
            </div>
            <div><label className={LABEL}>Duración</label><input className={INPUT} value={duracion} onChange={e => setDuracion(e.target.value)} placeholder="Ej: 20 Minutos" /></div>
          </div>
        </div>
      </details>

      <section className="space-y-2" aria-label="Asistencia">
        <div className="flex items-center justify-between">
          <label className={LABEL + ' mb-0'}>Asistencia: colaboradores a quienes se les divulga</label>
          <button type="button" onClick={() => setRows(prev => [...prev, newRow()])} className="flex items-center gap-1 text-[11px] font-bold text-[#003366]"><Plus className="w-3 h-3" /> Agregar persona</button>
        </div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={r.key} className="border border-slate-200 rounded-xl p-2.5 bg-white space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-[24px_1.7fr_1fr_24px] gap-2 items-center">
                <span className="text-[11px] font-bold text-slate-400 sm:text-center">{i + 1}</span>
                <input className={INPUT} placeholder="Nombre completo" value={r.nombre} disabled={Boolean(r.id)} onChange={e => updateRow(r.key, { nombre: e.target.value })} aria-label={`Nombre de la persona ${i + 1}`} />
                <input className={INPUT} placeholder="Cédula" inputMode="numeric" value={r.cedula} disabled={Boolean(r.id)} onChange={e => updateRow(r.key, { cedula: e.target.value })} aria-label={`Cédula de la persona ${i + 1}`} />
                <button type="button" onClick={() => removeRow(r.key)} aria-label={`Quitar a la persona ${i + 1}`} className="justify-self-end"><Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-600" /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[24px_1fr_auto_24px] gap-2 items-center">
                <span className="hidden sm:block" />
                <select className={INPUT} value={r.procesoSeccion} disabled={Boolean(r.id)} onChange={e => updateRow(r.key, { procesoSeccion: e.target.value })} aria-label={`Proceso o sección de la persona ${i + 1}`}>
                  <option value="">Proceso/Sección</option>
                  {PROCESS_SECTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="flex items-center gap-2">
                  {r.firma && /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.firma} alt={`Firma de ${r.nombre || 'la persona'}`} className="h-8 max-w-[110px] object-contain border-b border-slate-300" />}
                  {r.id ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Registrada</span>
                  ) : (
                    <button type="button" onClick={() => setSigningKey(r.key)} className="flex items-center gap-1 text-[11px] font-bold text-[#003366] border border-[#003366] rounded-lg px-2.5 py-1.5 whitespace-nowrap"><PenLine className="w-3 h-3" /> {r.firma ? 'Cambiar firma' : 'Firmar'}</button>
                  )}
                </div>
                <span className="hidden sm:block" />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-500">Cada colaborador firma en su fila con el dedo, el lápiz o el mouse. También pueden registrarse después desde la planilla, con "Registrar mi asistencia".</p>
      </section>

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
          {busy ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Guardando...</> : <><Sparkles className="w-3.5 h-3.5" /> {initial ? 'Guardar cambios' : 'Registrar divulgación'}</>}
        </button>
      </div>

      {signingRow && <SignatureDialog signerName={signingRow.nombre} onClose={() => setSigningKey(null)} onSave={firma => { updateRow(signingRow.key, { firma }); setSigningKey(null); }} />}
    </form>
  );
};
