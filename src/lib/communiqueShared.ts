import type { Communique, CommuniqueKind, CommuniqueSigner } from './communiqueStore';
import { stripDashes } from './supplierClaimShared';

/** Piezas compartidas por la exportación a PDF y a Word del comunicado o procedimiento. */

export const COMMUNIQUE_SUBTITLE = 'CALIDAD PRODUCCIÓN';
export const COMMUNIQUE_FOOTER = 'Departamento de Gestión de la Calidad';
export const DEFAULT_CLOSING = 'Agradecemos su atención y compromiso en la implementación de este cambio.';
export const DEFAULT_SENDER = 'Departamento de Calidad';
export const MAX_REFERENCE_DOCUMENTS = 3;

/** Papel de un documento adjunto: la ficha técnica es fuente de datos; el borrador es el punto de partida del texto. */
export type ReferenceRole = 'ficha' | 'borrador';

export const REFERENCE_ROLES: Record<ReferenceRole, string> = {
  ficha: 'Ficha técnica',
  borrador: 'Borrador del comunicado'
};

export const normalizeRole = (value: unknown): ReferenceRole => (value === 'borrador' ? 'borrador' : 'ficha');

/** Firmantes por defecto de la plantilla oficial; se pueden editar o quitar en el formulario. */
export const DEFAULT_SIGNERS: CommuniqueSigner[] = [
  { nombre: 'Víctor Bermúdez', cargo: 'Jefe de producción' },
  { nombre: 'Eduin Bedoya', cargo: 'Coordinador de calidad' }
];

interface KindConfig {
  label: string;
  /** Título del encabezado del documento. */
  title: string;
  stepsHeading: string;
  /** Frase con la que inicia el texto redactado por la IA. */
  opening: string;
  hint: string;
  /** false: el tipo aparece en el formulario como "Próximamente", sin generación todavía. */
  available: boolean;
}

export const KIND_CONFIG: Record<CommuniqueKind, KindConfig> = {
  comunicado: {
    label: 'Comunicado',
    title: 'COMUNICADO',
    stepsHeading: 'Instrucciones para la Implementación:',
    opening: 'Por medio del presente comunicado, les informamos que',
    hint: 'Implementaciones, mejoras de diseño o integración de nuevos productos para las áreas de producción y control.',
    available: true
  },
  procedimiento: {
    label: 'Procedimiento',
    title: 'PROCEDIMIENTO',
    stepsHeading: 'Pasos del Procedimiento:',
    opening: 'Por medio del presente documento, se establece el procedimiento para',
    hint: 'Pasos para ejecutar una actividad del proceso.',
    available: false
  },
  divulgacion: {
    label: 'Divulgación',
    title: 'DIVULGACIÓN',
    stepsHeading: 'Puntos a Divulgar:',
    opening: 'Por medio del presente documento, se divulga',
    hint: 'Socialización de información o lecciones aprendidas a las áreas.',
    available: false
  }
};

export const KIND_ORDER: CommuniqueKind[] = ['comunicado', 'procedimiento', 'divulgacion'];

export interface TextSegment {
  text: string;
  bold: boolean;
}

/** Divide un texto con **negritas** (la IA marca términos clave así, como el logo en la plantilla) en segmentos. */
export function splitBold(text: string): TextSegment[] {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) => ({ text: part, bold: i % 2 === 1 }))
    .filter(seg => seg.text.length > 0);
}

export function stripBoldMarks(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '$1');
}

/** Copia del comunicado con todos los textos libres sin guiones largos, lista para exportar. */
export function cleanCommuniqueForExport(c: Communique): Communique {
  return {
    ...c,
    de: stripDashes(c.de),
    para: stripDashes(c.para),
    asunto: stripDashes(c.asunto),
    intro: c.intro ? stripDashes(c.intro) : null,
    pasos: c.pasos.map(p => ({ titulo: stripDashes(p.titulo), detalle: stripDashes(p.detalle) })),
    cierre: c.cierre ? stripDashes(c.cierre) : null,
    firmantes: c.firmantes.map(f => ({ nombre: stripDashes(f.nombre), cargo: stripDashes(f.cargo) }))
  };
}

export function communiqueFileName(c: Communique, extension: string): string {
  const safe = (text: string) => text.replace(/[^\w-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${KIND_CONFIG[c.tipo].label}-${safe(c.asunto)}-${c.fecha}.${extension}`;
}
