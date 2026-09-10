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

interface MapResult {
  inspections: FieldInspectionInput[];
  /** Cuántos de los campos esperados (Fecha, Área, OP, ...) se lograron reconocer en el encabezado. */
  matchedFieldCount: number;
}

function mapRowsToInspections(rows: any[][]): MapResult {
  if (rows.length === 0) return { inspections: [], matchedFieldCount: 0 };
  const headerIdx = detectHeaderRow(rows);
  if (headerIdx === null) return { inspections: [], matchedFieldCount: 0 };
  const headers = rows[headerIdx].map(h => normalize(String(h || '')));

  const columnIndexByField = new Map<keyof FieldInspectionInput, number>();
  for (const { field, keywords } of HEADER_MAP) {
    const idx = headers.findIndex(h => keywords.some(k => h.includes(normalize(k))));
    if (idx >= 0) columnIndexByField.set(field, idx);
  }

  const dataRows = rows.slice(headerIdx + 1).filter(r => r.some(c => c !== undefined && c !== ''));

  const inspections = dataRows.map(row => {
    const get = (field: keyof FieldInspectionInput) => {
      const idx = columnIndexByField.get(field);
      return idx !== undefined ? row[idx] : undefined;
    };
    return {
      fecha: get('fecha') ? String(get('fecha')) : new Date().toISOString().split('T')[0],
      areaProceso: String(get('areaProceso') || ''),
      op: String(get('op') || ''),
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
    };
  });

  return { inspections, matchedFieldCount: columnIndexByField.size };
}

export const FieldInspectionBulkUpload: React.FC<{ onClose: () => void; onDone: () => void }> = ({ onClose, onDone }) => {
  const [rows, setRows] = useState<FieldInspectionInput[]>([]);
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
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
      const { inspections, matchedFieldCount } = mapRowsToInspections(rawRows);
      if (inspections.length === 0) {
        setError('No se reconoció una fila de encabezados en el archivo (se esperan columnas como Fecha, Área, OP, Plano, Cant. Total...). Verifica que la primera fila con esos encabezados esté entre las primeras 30 filas del archivo.');
        return;
      }

      // Nunca se deja pasar un lote donde el mapeo de columnas claramente
      // falló — antes esto insertaba cientos de filas en blanco en
      // silencio. Si no se reconocieron al menos OP y Área, o la mayoría
      // de filas quedaron sin esos dos datos, se bloquea con un mensaje
      // claro en vez de dejar confirmar la carga.
      const blankCount = inspections.filter(r => !r.op.trim() && !r.areaProceso.trim()).length;
      if (matchedFieldCount < 2 || blankCount / inspections.length > 0.3) {
        setError(
          `No se pudieron identificar correctamente las columnas del archivo — ${blankCount} de ${inspections.length} filas quedarían sin OP ni Área. ` +
          'Revisa que la fila de encabezados use nombres reconocibles (Fecha, Área, OP, Plano, Diseño, Cant. Total, Cant. Retenida, Estado, Defecto, Revisó, Responsable) y vuelve a intentar.'
        );
        return;
      }

      setRows(inspections);
    } catch (err: any) {
      setError(err?.message || 'No se pudo leer el archivo.');
    }
  };

  const confirmUpload = async () => {
    setUploading(true);
    setError(null);
    try {
      const res = await fetch('/api/crm/field-inspections/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'No se pudo completar la carga.');
      onDone();
    } catch (err: any) {
      setError(err?.message || 'Error de conexión.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-4 h-4 text-[#003366]" /> Carga masiva de inspecciones (Excel)
          </h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
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
            </p>
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
                  {rows.map((r, i) => (
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

            <div className="flex items-center gap-2">
              <button
                onClick={confirmUpload}
                disabled={uploading}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Confirmar e insertar {rows.length} fila{rows.length === 1 ? '' : 's'}
              </button>
              <button onClick={() => setRows([])} className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition">
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
