'use client';

import React, { useEffect, useState } from 'react';
import { X, UserPlus, Trash2, RefreshCw } from 'lucide-react';
import { DivulgacionAttendanceModal } from './DivulgacionAttendanceModal';
import { WordIcon, PdfIcon } from './ExportFormatIcons';
import type { Divulgacion } from '@/src/lib/divulgacionStore';
import { COLUMN_FRACTIONS, COLUMN_HEADERS, KIND_LABELS, KIND_ORDER, SHEET_DATE, SHEET_SUBTITLE, SHEET_TITLE, SHEET_VERSION, formatSheetDate, paginateAttendees } from '@/src/lib/divulgacionShared';
import { exportDivulgacionToPDF } from '@/src/lib/divulgacionPdfExport';
import { exportDivulgacionToWord } from '@/src/lib/divulgacionWordExport';

const CELL = 'border border-slate-800 px-2 py-1';

interface Props {
  divulgacionId: string;
  onClose: () => void;
  /** Avisa a la lista que cambió el número de asistentes. */
  onChanged: (updated: Divulgacion) => void;
}

/** La planilla de asistencia con el diseño original, en pantalla: aquí cada persona registra su asistencia y se van listando las filas. */
export const DivulgacionSheetModal: React.FC<Props> = ({ divulgacionId, onClose, onChanged }) => {
  const [d, setD] = useState<Divulgacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [exporting, setExporting] = useState<'word' | 'pdf' | null>(null);

  useEffect(() => {
    fetch(`/api/divulgaciones/${divulgacionId}`, { cache: 'no-store' })
      .then(async res => {
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo cargar la planilla.');
        setD(data.divulgacion as Divulgacion);
      })
      .catch(err => setError(err.message));
  }, [divulgacionId]);

  const apply = (updated: Divulgacion) => {
    setD(updated);
    onChanged(updated);
  };

  const removeRow = async (rowId: string, name: string) => {
    if (!d || !window.confirm(`¿Quitar el registro de ${name}?`)) return;
    const res = await fetch(`/api/divulgaciones/${d.id}/asistentes/${rowId}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success && data.divulgacion) apply(data.divulgacion as Divulgacion);
    else window.alert('No se pudo quitar el registro. Intenta de nuevo.');
  };

  const exportAs = async (format: 'word' | 'pdf') => {
    if (!d) return;
    setExporting(format);
    try {
      await (format === 'word' ? exportDivulgacionToWord(d) : exportDivulgacionToPDF(d));
    } catch {
      window.alert('No se pudo generar el documento. Intenta de nuevo.');
    } finally {
      setExporting(null);
    }
  };

  const pages = d ? paginateAttendees(d) : [];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-5xl p-4 sm:p-6 space-y-4 my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold text-slate-900">Planilla de asistencia</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {d && <button onClick={() => setRegistering(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#003366] hover:bg-blue-900 rounded-lg"><UserPlus className="w-3.5 h-3.5" /> Registrar mi asistencia</button>}
            {d && <button onClick={() => exportAs('word')} disabled={exporting === 'word'} className="flex items-center gap-1 text-xs font-semibold text-[#003366] hover:underline disabled:opacity-50"><WordIcon className="w-4 h-4" /> {exporting === 'word' ? 'Generando...' : 'Word'}</button>}
            {d && <button onClick={() => exportAs('pdf')} disabled={exporting === 'pdf'} className="flex items-center gap-1 text-xs font-semibold text-[#003366] hover:underline disabled:opacity-50"><PdfIcon className="w-4 h-4" /> {exporting === 'pdf' ? 'Generando...' : 'PDF'}</button>}
            <button onClick={onClose} aria-label="Cerrar"><X className="w-4 h-4 text-slate-400" /></button>
          </div>
        </div>

        {error && <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800">{error}</div>}
        {!d && !error && <div className="flex items-center justify-center gap-2 text-slate-400 py-10"><RefreshCw className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando planilla...</span></div>}

        {d && pages.map((rows, page) => (
          <div key={page} className="overflow-x-auto">
            <div className="min-w-[760px] text-[12px] text-slate-900">
              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td rowSpan={2} className={`${CELL} w-[14%] text-center font-black text-[#003366]`}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logo-alco.png" alt="ALCO" className="mx-auto max-h-12 object-contain" /></td>
                    <td className={`${CELL} text-center font-bold`}>{SHEET_TITLE}</td>
                    <td className={`${CELL} w-[19%] font-bold`}>VERSIÓN: {SHEET_VERSION}</td>
                  </tr>
                  <tr>
                    <td className={`${CELL} text-center font-bold`}>{SHEET_SUBTITLE}</td>
                    <td className={`${CELL} font-bold`}>FECHA: {SHEET_DATE}</td>
                  </tr>
                </tbody>
              </table>
              <table className="w-full border-collapse -mt-px">
                <tbody>
                  <tr><td colSpan={3} className={CELL}>Fecha: {formatSheetDate(d.fecha)}</td></tr>
                  <tr><td colSpan={3} className={CELL}>Tema: {d.tema}</td></tr>
                  <tr><td colSpan={3} className={CELL}>Objetivo: {d.objetivo}</td></tr>
                  <tr>
                    <td className={`${CELL} w-[45%]`}>Responsable del Tema: {d.responsable}</td>
                    <td className={`${CELL} w-[30%]`}>Proceso/área: {d.procesoArea}</td>
                    <td className={CELL}>Duración: {d.duracion}</td>
                  </tr>
                  <tr>
                    <td colSpan={3} className={`${CELL} py-1.5`}>
                      <span className="mr-8">Marque con una <b className="text-sm">X</b></span>
                      {KIND_ORDER.map(kind => (
                        <span key={kind} className="mr-8 inline-flex items-center gap-1.5">
                          {KIND_LABELS[kind]}
                          <span className="inline-flex items-center justify-center w-6 h-4 border border-slate-800 text-[11px] font-bold leading-none">{d.tipo === kind ? 'X' : ''}</span>
                        </span>
                      ))}
                    </td>
                  </tr>
                </tbody>
              </table>
              <table className="w-full border-collapse -mt-px table-fixed">
                <colgroup>{COLUMN_FRACTIONS.map((f, i) => <col key={i} style={{ width: `${f * 100}%` }} />)}</colgroup>
                <thead>
                  <tr><th colSpan={5} className={`${CELL} text-center`}>ASISTENCIA</th></tr>
                  <tr>{COLUMN_HEADERS.map(h => <th key={h} className={`${CELL} text-center text-[11px]`}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.map(({ number, row }) => (
                    <tr key={number} className="h-9 group">
                      <td className={`${CELL} text-center text-[11px]`}>{number}</td>
                      <td className={`${CELL} truncate`}>{row?.nombre}</td>
                      <td className={CELL}>{row?.cedula}</td>
                      <td className={`${CELL} text-center p-0.5`}>{row?.firma && /* eslint-disable-next-line @next/next/no-img-element */ <img src={row.firma} alt={`Firma de ${row.nombre}`} className="mx-auto h-8 max-w-full object-contain" />}</td>
                      <td className={`${CELL} relative`}>
                        {row?.procesoSeccion}
                        {row && <button onClick={() => removeRow(row.id, row.nombre)} aria-label={`Quitar a ${row.nombre}`} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus:opacity-100 [@media(hover:none)]:opacity-100 transition"><Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-rose-600" /></button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="w-full border-collapse -mt-px">
                <tbody>
                  <tr><td className={`${CELL} font-bold`}>Esta capacitación o divulgación será evaluada en <span className="inline-block min-w-12 border-b border-slate-800 text-center font-normal">{d.evaluacionDias}</span> Días</td></tr>
                  <tr><td className={`${CELL} font-bold`}>Nombre del responsable de realizar la evaluación: <span className="font-normal">{d.evaluador}</span></td></tr>
                  <tr><td className={`${CELL} font-bold`}>Resultados de la evaluación: <span className="font-normal">{d.resultados}</span></td></tr>
                  <tr><td className={`${CELL} h-6`} /></tr>
                </tbody>
              </table>
              {pages.length > 1 && <p className="text-[10px] text-slate-400 text-right mt-1">Hoja {page + 1} de {pages.length}</p>}
            </div>
          </div>
        ))}

        {d && <p className="text-[10px] text-slate-500">{d.asistentes.length} {d.asistentes.length === 1 ? 'persona registrada' : 'personas registradas'}. Para quitar un registro con datos equivocados, usa el ícono de basura al final de su fila.</p>}
      </div>

      {registering && d && <DivulgacionAttendanceModal divulgacion={d} onClose={() => setRegistering(false)} onRegistered={apply} />}
    </div>
  );
};
