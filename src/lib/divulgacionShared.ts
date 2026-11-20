import type { Communique } from './communiqueStore';
import type { Divulgacion, DivulgacionKind } from './divulgacionStore';

/** Piezas compartidas por la pantalla y las exportaciones de la planilla "Asistencia a capacitación, divulgación y charla". */

export const SHEET_TITLE = 'ASISTENCIA A CAPACITACIÓN, DIVULGACIÓN Y CHARLA';
export const SHEET_SUBTITLE = 'TRANSVERSAL A LOS PROCESOS';
export const SHEET_VERSION = '2';
export const SHEET_DATE = '22/03/2024';
export const ROWS_PER_PAGE = 15;
/** Ancho de las columnas de la tabla de asistencia, como fracción del total: N°, nombre, cédula, firma y proceso o sección. */
export const COLUMN_FRACTIONS = [0.045, 0.265, 0.18, 0.285, 0.225];
export const COLUMN_HEADERS = ['N°', 'NOMBRE', 'CÉDULA', 'FIRMA', 'PROCESO/SECCIÓN'];

/** Procesos y secciones del menú desplegable "Proceso/Sección" de la planilla (listado de la empresa, sin repetidos). */
export const PROCESS_SECTIONS = [
  'ACCESORIOS',
  'ABASTECIMIENTO',
  'ALMACÉN',
  'CALIDAD',
  'CNC',
  'CORTE DE PERFILERIA',
  'COTIZACION',
  'COMERCIAL',
  'DESPACHOS',
  'INGENIERÍA',
  'ENSAMBLE',
  'FELPA / EMPAQUE',
  'PINTURA',
  'TROQUELADO 1',
  'TROQUELADO 2',
  'TROQUELADO 3',
  'VIDRIO CRUDO',
  'VIDRIO TEMPLADO',
  'TALLER',
  'ENSAMBLE. BOGOTÁ'
];

export const KIND_LABELS: Record<DivulgacionKind, string> = {
  capacitacion: 'Capacitación',
  divulgacion: 'Divulgación',
  charla: 'Charla'
};
export const KIND_ORDER: DivulgacionKind[] = ['capacitacion', 'divulgacion', 'charla'];

/** dd/mm/aaaa a partir de una fecha ISO (aaaa-mm-dd), sin pasar por la zona horaria. */
export function formatSheetDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return y && m && d ? `${d}/${m}/${y}` : isoDate;
}

/** Filas de asistencia numeradas, completadas con filas vacías hasta un múltiplo de 15 (una hoja por cada 15). */
export function paginateAttendees(divulgacion: Divulgacion): { number: number; row: Divulgacion['asistentes'][number] | null }[][] {
  const total = Math.max(1, Math.ceil(divulgacion.asistentes.length / ROWS_PER_PAGE)) * ROWS_PER_PAGE;
  const rows = Array.from({ length: total }, (_, i) => ({ number: i + 1, row: divulgacion.asistentes[i] ?? null }));
  return Array.from({ length: total / ROWS_PER_PAGE }, (_, page) => rows.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE));
}

export function divulgacionFileName(d: Divulgacion, extension: string): string {
  const safe = (text: string) => text.replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `Asistencia-${safe(d.tema)}-${d.fecha}.${extension}`;
}

/** Objetivo breve a partir de la introducción de un comunicado: sin la fórmula de apertura ni las marcas de negrita, y solo la primera oración. */
export function objectiveFromCommunique(intro: string | null): string {
  const plain = (intro || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\s+/g, ' ').trim();
  const withoutOpening = plain.replace(/^por medio del presente (comunicado|documento)[^,]*,\s*(les informamos que|se (establece|divulga)[^,]*?)\s*,?\s*/i, '');
  const firstSentence = (withoutOpening.match(/^.+?[.!?](?=\s|$)/)?.[0] || withoutOpening).slice(0, 260);
  return firstSentence ? firstSentence.charAt(0).toUpperCase() + firstSentence.slice(1) : '';
}

/** Datos de la planilla que se pueden tomar de un comunicado ya creado. */
export function fieldsFromCommunique(c: Communique): { tema: string; objetivo: string; responsable: string; procesoArea: string } {
  const quality = c.firmantes.find(f => /calidad/i.test(f.cargo));
  return { tema: c.asunto, objetivo: objectiveFromCommunique(c.intro), responsable: (quality || c.firmantes[0])?.nombre || '', procesoArea: c.para };
}
