'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, X, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { FieldInspectionInput } from '@/src/lib/fieldInspectionsStore';

// Mapeo difuso de encabezados en español (con o sin tildes) a los campos
// del registro — igual idea que el proyecto de referencia: el archivo
// real de planta rara vez tiene los encabezados exactos.
const HEADER_MAP: { field: keyof FieldInspectionInput; keywords: string[] }[] = [
  { field: 'fecha', keywords: ['fecha'] },
  { field: 'areaProceso', keywords: ['area', 'área', 'proceso'] },
  { field: 'op', keywords: ['op', 'orden de produccion', 'orden'] },
  { field: 'planoOpc', keywords: ['plano', 'item', 'ítem'] },
  { field: 'disenoReferencia', keywords: ['diseno', 'diseño', 'serie', 'referencia'] },
  { field: 'cantTotal', keywords: ['cant total', 'cantidad total', 'cant. total'] },
  { field: 'cantRetenida', keywords: ['cant retenida', 'cantidad retenida', 'cant. retenida'] },
  { field: 'estado', keywords: ['estado'] },
  { field: 'defecto', keywords: ['defecto'] },
  { field: 'reviso', keywords: ['reviso', 'revisó', 'inspector'] },
  { field: 'responsable', keywords: ['responsable', 'operario'] },
  { field: 'accionCorrectiva', keywords: ['accion correctiva', 'acción correctiva'] },
  { field: 'observacion', keywords: ['observacion', 'observación', 'dictamen'] }
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

const MIN_HEADER_MATCHES = 3;

/**
 * Busca la fila de encabezados por puntaje (cuántos campos conocidos
 * reconoce esa fila) en vez de exigir una combinación fija de palabras en
 * una sola fila — más tolerante a archivos reales con filas de título o
 * encabezados en un orden distinto. Si ninguna fila junta al menos
 * MIN_HEADER_MATCHES coincidencias, no hay encabezado reconocible.
 */
function detectHeaderRow(rows: any[][]): number | null {
  let bestIdx = 0;
  let bestScore = 0;
  const searchLimit = Math.min(rows.length, 30);

  for (let i = 0; i < searchLimit; i++) {
    const cells = rows[i].map(c => normalize(String(c || '')));
    const score = HEADER_MAP.reduce((acc, { keywords }) => (cells.some(cell => keywords.some(k => cell.includes(normalize(k)))) ? acc + 1 : acc), 0);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }

  return bestScore >= MIN_HEADER_MATCHES ? bestIdx : null;
}

const UPLOAD_BATCH_SIZE = 500;
const PREVIEW_ROW_LIMIT = 100;

/** Igual que en el resto de la app: nunca se le pasa el body de una respuesta no-JSON directo a res.json() (ej. el 413 de Vercel llega como texto plano). */
async function parseJsonResponse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return { error: `Respuesta inesperada del servidor (${res.status}).` };
  return res.json();
}

interface SkippedRow {
  /** Número de fila tal como se ve en Excel (1-based). */
  rowNumber: number;
  op: string;
  fecha: string;
  reason: string;
}

interface MapResult {
  inspections: FieldInspectionInput[];
  /** Cuántos de los campos esperados (Fecha, Área, OP, ...) se lograron reconocer en el encabezado. */
  matchedFieldCount: number;
  /** Filas con una fecha que no se pudo interpretar — se excluyen en vez de mandar un valor inventado o dejar que rompan todo el lote donde caigan. */
  skipped: SkippedRow[];
}

/** Acepta 'YYYY-MM-DD' o 'M/D/YYYY' (los dos formatos que produce Excel según la configuración regional del archivo). Cualquier otra cosa (ej. una sola letra suelta) se considera inválida. */
function isValidDateValue(value: string): boolean {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return !isNaN(new Date(value).getTime());
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value)) return true;
  return false;
}

function mapRowsToInspections(rows: any[][]): MapResult {
  if (rows.length === 0) return { inspections: [], matchedFieldCount: 0, skipped: [] };
  const headerIdx = detectHeaderRow(rows);
  if (headerIdx === null) return { inspections: [], matchedFieldCount: 0, skipped: [] };
  const headers = rows[headerIdx].map(h => normalize(String(h || '')));

  const columnIndexByField = new Map<keyof FieldInspectionInput, number>();
  for (const { field, keywords } of HEADER_MAP) {
    const idx = headers.findIndex(h => keywords.some(k => h.includes(normalize(k))));
    if (idx >= 0) columnIndexByField.set(field, idx);
  }

  const dataRows = rows
    .map((row, idx) => ({ row, idx }))
    .slice(headerIdx + 1)
    .filter(({ row }) => row.some(c => c !== undefined && c !== ''));

  const inspections: FieldInspectionInput[] = [];
  const skipped: SkippedRow[] = [];

  for (const { row, idx } of dataRows) {
    const get = (field: keyof FieldInspectionInput) => {
      const colIdx = columnIndexByField.get(field);
      return colIdx !== undefined ? row[colIdx] : undefined;
    };

    const fechaRaw = get('fecha');
    const fechaStr = fechaRaw ? String(fechaRaw).trim() : '';
    const op = String(get('op') || '').trim();
    const areaProceso = String(get('areaProceso') || '').trim();

    if (fechaStr && !isValidDateValue(fechaStr)) {
      skipped.push({ rowNumber: idx + 1, op, fecha: fechaStr, reason: `fecha no reconocida ("${fechaStr}")` });
      continue;
    }

    // OP y Área son obligatorios para cualquier inspección (misma regla que
    // exige el registro individual) — una fila real sin uno de los dos se
    // omite en vez de dejar que rompa todo el lote de 500 donde caiga.
    if (!op || !areaProceso) {
      skipped.push({ rowNumber: idx + 1, op, fecha: fechaStr, reason: !op && !areaProceso ? 'sin OP ni Área' : !op ? 'sin OP' : 'sin Área' });
      continue;
    }

    inspections.push({
      fecha: fechaStr || new Date().toISOString().split('T')[0],
      areaProceso,
      op,
      planoOpc: get('planoOpc') ? String(get('planoOpc')) : undefined,
      disenoReferencia: get('disenoReferencia') ? String(get('disenoReferencia')) : undefined,
      cantTotal: Number(get('cantTotal')) || 0,
      cantRetenida: Number(get('cantRetenida')) || 0,
      estado: String(get('estado') || 'Aprobado'),
      defecto: String(get('defecto') || 'NINGUNO'),
      reviso: get('reviso') ? String(get('reviso')) : undefined,
      responsable: get('responsable') ? String(get('responsable')) : undefined,
      accionCorrectiva: get('accionCorrectiva') ? String(get('accionCorrectiva')) : undefined,
      observacion: get('observacion') ? String(get('observacion')) : undefined
    });
  }

  return { inspections, matchedFieldCount: columnIndexByField.size, skipped };
}

export const FieldInspectionBulkUpload: React.FC<{ onClose: () => void; onDone: () => void }> = ({ onClose, onDone }) => {
  const [rows, setRows] = useState<FieldInspectionInput[]>([]);
  const [skippedRows, setSkippedRows] = useState<SkippedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });
      const { inspections, matchedFieldCount, skipped } = mapRowsToInspections(rawRows);
      const totalParsed = inspections.length + skipped.length;
      if (totalParsed === 0) {
        setError('No se reconoció una fila de encabezados en el archivo (se esperan columnas como Fecha, Área, OP, Plano, Cant. Total...). Verifica que la primera fila con esos encabezados esté entre las primeras 30 filas del archivo.');
        return;
      }

      // Nunca se deja pasar un archivo donde el mapeo de columnas
      // claramente falló — antes esto insertaba miles de filas en blanco
      // en silencio. Si no se reconocieron al menos OP y Área, o mas del
      // 30% de las filas quedarían sin esos datos (señal de columnas mal
      // detectadas, no de errores puntuales de digitación), se bloquea con
      // un mensaje claro en vez de dejar confirmar la carga.
      if (matchedFieldCount < 2 || skipped.length / totalParsed > 0.3) {
        setError(
          `No se pudieron identificar correctamente las columnas del archivo — ${skipped.length} de ${totalParsed} filas quedarían sin OP, Área o fecha válida. ` +
          'Revisa que la fila de encabezados use nombres reconocibles (Fecha, Área, OP, Plano, Diseño, Cant. Total, Cant. Retenida, Estado, Defecto, Revisó, Responsable) y vuelve a intentar.'
        );
        return;
      }

      setRows(inspections);
      setSkippedRows(skipped);
    } catch (err: any) {
      setError(err?.message || 'No se pudo leer el archivo.');
    }
  };

  /**
   * Envía la carga en lotes de UPLOAD_BATCH_SIZE en vez de un solo POST con
   * todas las filas: con archivos grandes (miles de filas) un único
   * request supera el límite de tamaño de body de Vercel y el servidor
   * responde con texto plano ("Request Entity Too Large") en vez de JSON,
   * lo que rompía res.json() con un error críptico. Los lotes van
   * secuenciales para no saturar la base de datos ni perder el orden de
   * los errores.
   */
  const confirmUpload = async () => {
    setUploading(true);
    setError(null);
    setUploaded(0);

    let inserted = 0;
    for (let i = 0; i < rows.length; i += UPLOAD_BATCH_SIZE) {
      const batch = rows.slice(i, i + UPLOAD_BATCH_SIZE);
      try {
        const res = await fetch('/api/crm/field-inspections/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: batch })
        });
        const data = await parseJsonResponse(res);
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'No se pudo completar la carga.');
        }
        inserted += data.count ?? batch.length;
        setUploaded(inserted);
      } catch (err: any) {
        setError(
          `${err?.message || 'Error de conexión.'} (se insertaron ${inserted} de ${rows.length} filas antes del error — el resto no se envió)`
        );
        setUploading(false);
        return;
      }
    }

    setUploading(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#003366]" /> Carga masiva de inspecciones (Excel)
          </h3>
          <button onClick={onClose} disabled={uploading} className="disabled:opacity-30"><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {rows.length === 0 ? (
          <>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition"
            >
              <UploadCloud className="w-6 h-6 mx-auto mb-2" />
              Selecciona un archivo Excel (.xlsx) con las columnas de inspección
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-slate-500">
              <strong>{fileName}</strong> — {rows.length} fila{rows.length === 1 ? '' : 's'} detectada{rows.length === 1 ? '' : 's'}. Revisa antes de confirmar.
              {rows.length > PREVIEW_ROW_LIMIT && ` Mostrando solo las primeras ${PREVIEW_ROW_LIMIT} para la vista previa.`}
            </p>

            {skippedRows.length > 0 && (
              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1">
                <p className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {skippedRows.length} fila{skippedRows.length === 1 ? '' : 's'} omitida{skippedRows.length === 1 ? '' : 's'} — no se van a cargar:
                </p>
                <ul className="pl-5 list-disc">
                  {skippedRows.slice(0, 10).map(s => (
                    <li key={s.rowNumber}>Fila {s.rowNumber} (OP {s.op || 'sin OP'}): {s.reason}</li>
                  ))}
                  {skippedRows.length > 10 && <li>... y {skippedRows.length - 10} más.</li>}
                </ul>
                <p>Corrige el archivo original y vuelve a intentar si quieres incluirlas.</p>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-64">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {['Fecha', 'Área', 'OP', 'Plano', 'Diseño', 'Cant.', 'Retenida', 'Estado', 'Defecto', 'Revisó', 'Responsable'].map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-bold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, PREVIEW_ROW_LIMIT).map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-2 py-1">{r.fecha}</td>
                      <td className="px-2 py-1">{r.areaProceso}</td>
                      <td className="px-2 py-1">{r.op}</td>
                      <td className="px-2 py-1">{r.planoOpc}</td>
                      <td className="px-2 py-1">{r.disenoReferencia}</td>
                      <td className="px-2 py-1">{r.cantTotal}</td>
                      <td className="px-2 py-1">{r.cantRetenida}</td>
                      <td className="px-2 py-1">{r.estado}</td>
                      <td className="px-2 py-1">{r.defecto}</td>
                      <td className="px-2 py-1">{r.reviso}</td>
                      <td className="px-2 py-1">{r.responsable}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {uploading && rows.length > UPLOAD_BATCH_SIZE && (
              <div className="space-y-1">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${Math.round((uploaded / rows.length) * 100)}%` }} />
                </div>
                <p className="text-[11px] text-slate-500">Insertando {uploaded} de {rows.length} filas...</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={confirmUpload}
                disabled={uploading}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {uploading ? 'Insertando...' : `Confirmar e insertar ${rows.length} fila${rows.length === 1 ? '' : 's'}`}
              </button>
              <button onClick={() => { setRows([]); setSkippedRows([]); }} disabled={uploading} className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition disabled:opacity-50">
                Elegir otro archivo
              </button>
            </div>
          </>
        )}

        {error && (
          <p className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </p>
        )}
      </div>
    </div>
  );
};
