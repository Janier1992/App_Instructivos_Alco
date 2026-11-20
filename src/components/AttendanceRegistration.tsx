'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, Send, RefreshCw, AlertTriangle } from 'lucide-react';
import { SignaturePad } from './SignaturePad';
import { compactSignature } from '@/src/lib/signatureImage';
import type { DivulgacionPublic } from '@/src/lib/divulgacionStore';
import { KIND_LABELS, PROCESS_SECTIONS, formatSheetDate } from '@/src/lib/divulgacionShared';

const INPUT = 'w-full bg-white border border-slate-300 rounded-xl px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#003366]';
const LABEL = 'text-xs font-bold text-slate-600 block mb-1.5';
const MIN_ID_DIGITS = 5;
const SEARCH_FROM = 6;

/**
 * Página pública de registro de asistencia (/asistencia): un único enlace, el mismo para todos los colaboradores.
 * Quien lo abre elige la divulgación y registra su nombre, cédula, proceso o
 * sección y firma dibujada con el dedo, pensado para el celular. No muestra a los demás asistentes.
 */
export const AttendanceRegistration: React.FC = () => {
  const [sessions, setSessions] = useState<DivulgacionPublic[] | null>(null);
  const [token, setToken] = useState('');
  const [search, setSearch] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [proceso, setProceso] = useState('');
  const [drawn, setDrawn] = useState('');
  const [padKey, setPadKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/asistencia', { cache: 'no-store' })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo abrir el registro.');
        const list = data.divulgaciones as DivulgacionPublic[];
        setSessions(list);
        // Solo el enlace directo a una divulgación (?d=<código>) la deja elegida; con el enlace general cada quien elige la suya.
        const wanted = new URLSearchParams(window.location.search).get('d');
        setToken(list.find(s => s.token === wanted)?.token ?? '');
      })
      .catch(err => setLoadError(err.message));
  }, []);

  const info = sessions?.find(s => s.token === token) ?? null;
  const visible = (sessions ?? []).filter(s => s.token === token || `${s.tema} ${s.responsable}`.toLowerCase().includes(search.trim().toLowerCase()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = cedula.replace(/\D/g, '');
    if (!token) return setError('Elige la divulgación a la que asististe.');
    if (!nombre.trim()) return setError('Escribe tu nombre completo.');
    if (id.length < MIN_ID_DIGITS) return setError('Escribe tu número de cédula.');
    if (!proceso) return setError('Elige tu proceso o sección.');
    if (!drawn) return setError('Dibuja tu firma en el recuadro.');

    setSending(true);
    setError(null);
    try {
      const firma = await compactSignature(drawn);
      const res = await fetch('/api/asistencia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, nombre: nombre.trim(), cedula: id, procesoSeccion: proceso, firma }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo registrar la asistencia.');
      setDone(nombre.trim());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  /** Deja el formulario limpio para que otra persona se registre desde el mismo equipo. */
  const registerAnother = () => {
    setDone(null);
    setNombre('');
    setCedula('');
    setProceso('');
    setDrawn('');
    setPadKey(k => k + 1);
    setError(null);
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 flex justify-center">
      <div className="w-full max-w-md space-y-4">
        <header className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-alco.png" alt="ALCO Windows & Doors" className="h-11 w-auto rounded-lg bg-white p-1" />
          <div>
            <h1 className="text-base font-extrabold text-[#003366] leading-tight">Registro de asistencia</h1>
            <p className="text-[11px] text-slate-500">Capacitación, divulgación y charla</p>
          </div>
        </header>

        {loadError && (
          <div className="bg-white rounded-2xl border border-rose-200 p-5 flex gap-3 text-sm text-rose-800">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div><p className="font-bold">No se pudo abrir el registro</p><p className="text-xs mt-1">{loadError}</p></div>
          </div>
        )}

        {!sessions && !loadError && <div className="flex items-center justify-center gap-2 text-slate-400 py-10"><RefreshCw className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando...</span></div>}

        {sessions && sessions.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 text-sm text-slate-600">Por ahora no hay divulgaciones abiertas para registrar asistencia. Pídele a quien dicta la divulgación que la cree en la aplicación.</div>
        )}

        {sessions && sessions.length > 0 && (
          <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            <div>
              <label className={LABEL}>¿A qué divulgación asististe? *</label>
              {sessions.length > SEARCH_FROM && <input className={`${INPUT} mb-2`} type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por tema o responsable" aria-label="Buscar divulgación" />}
              <select className={INPUT} value={token} onChange={e => setToken(e.target.value)} aria-label="Divulgación">
                <option value="">Elige la divulgación</option>
                {visible.map(s => <option key={s.token} value={s.token}>{formatSheetDate(s.fecha)} · {s.tema}</option>)}
              </select>
            </div>
            {info && (
              <div className="space-y-1 border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{KIND_LABELS[info.tipo]} · {formatSheetDate(info.fecha)}</p>
                <p className="text-sm font-bold text-slate-900">{info.tema}</p>
                <p className="text-xs text-slate-500">Responsable: {info.responsable}</p>
              </div>
            )}
          </section>
        )}

        {info && (
          <>
            {done ? (
              <section className="bg-white rounded-2xl border border-emerald-200 p-5 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <p className="text-base font-bold text-slate-900">¡Listo, {done.split(' ')[0]}!</p>
                <p className="text-sm text-slate-600">Tu asistencia quedó registrada. Ya puedes cerrar esta página.</p>
                <button type="button" onClick={registerAnother} className="text-xs font-bold text-[#003366] border border-[#003366] rounded-xl px-4 py-2.5">Registrar a otra persona</button>
              </section>
            ) : (
              <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
                <div><label className={LABEL}>Nombre completo *</label><input className={INPUT} value={nombre} onChange={e => setNombre(e.target.value)} autoComplete="name" /></div>
                <div><label className={LABEL}>Cédula *</label><input className={INPUT} value={cedula} onChange={e => setCedula(e.target.value)} inputMode="numeric" placeholder="Solo números" /></div>
                <div>
                  <label className={LABEL}>Proceso/Sección *</label>
                  <select className={INPUT} value={proceso} onChange={e => setProceso(e.target.value)}>
                    <option value="">Elige tu proceso o sección</option>
                    {PROCESS_SECTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <SignaturePad key={padKey} label="Firma *" initialValue={null} onChange={setDrawn} accentClassName="border-sky-200" />
                <p className="text-[11px] text-slate-500 -mt-2">Firma con el dedo dentro del recuadro. Si te equivocas, toca el botón de limpiar de la esquina.</p>
                {error && <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">{error}</div>}
                <button type="submit" disabled={sending} className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-white bg-[#003366] rounded-xl disabled:opacity-60"><Send className="w-4 h-4" /> {sending ? 'Enviando...' : 'Enviar registro'}</button>
              </form>
            )}
          </>
        )}

        <p className="text-center text-[10px] text-slate-400">Alco Windows & Doors S.A.S. · Gestión de la Calidad</p>
      </div>
    </main>
  );
}
