import { generateJsonWithFallback } from './geminiJson';
import { polishText, stripDashes } from './supplierClaimShared';
import { DEFAULT_CLOSING, KIND_CONFIG } from './communiqueShared';
import type { CommuniqueKind, CommuniqueStep } from './communiqueStore';

/**
 * Redacta el comunicado o procedimiento de Calidad Producción (mismo tono y
 * estructura de la plantilla oficial de Alco) a partir de lo que describe el
 * colaborador, las imágenes y los documentos de referencia que adjunta, como
 * una ficha técnica. Modo JSON nativo de Gemini, con respaldo entre modelos.
 */

export interface CommuniqueDraftInput {
  tipo: CommuniqueKind;
  de: string;
  para: string;
  asunto: string;
  contexto: string;
  /** Pie de foto escrito por el colaborador para cada imagen, en orden ('' si no escribió uno). */
  piesFotos: string[];
  images: { buffer: Buffer; mimeType: string }[];
  /** Documentos de referencia: PDF e imágenes se envían a Gemini; el texto plano va dentro del prompt. */
  documents: { buffer: Buffer; mimeType: string; nombre: string }[];
  /** Texto que ya tiene el formulario: puede ser un borrador a mejorar o instrucciones dirigidas a la IA. */
  borrador?: { intro: string; pasos: CommuniqueStep[]; cierre: string };
}

export interface CommuniqueDraft {
  asunto: string;
  intro: string;
  pasos: CommuniqueStep[];
  pies: string[];
  cierre: string;
  /** Avisos para el colaborador (qué adjuntar o precisar); no van dentro del documento. */
  sugerencias: string[];
  generadoPorIa: boolean;
  /** Por qué se usó el texto base, cuando la IA no respondió. */
  motivo?: string;
}

function describeDraft(borrador: CommuniqueDraftInput['borrador']): string {
  const pasos = (borrador?.pasos || []).map((p, i) => `${i + 1}) ${p.titulo} ${p.detalle}`).join(' ');
  const text = [borrador?.intro?.trim(), pasos].filter(Boolean).join(' | ');
  return text
    ? `\nBORRADOR ACTUAL DEL FORMULARIO: ${text}\nEl borrador puede traer instrucciones dirigidas a ti en vez de texto final (por ejemplo "genera una explicación detallada del proceso"): si es así, cúmplelas. Si ya es texto, mejóralo (ortografía, claridad, detalle) y conserva lo que esté correcto.\n`
    : '';
}

function buildPrompt(input: CommuniqueDraftInput): string {
  const cfg = KIND_CONFIG[input.tipo];
  const opening = `${cfg.opening}...`;
  const docs = input.documents.length ? input.documents.map(d => d.nombre).join(', ') : 'ninguno';
  return `Eres un Asistente de Calidad de ALCO S.A.S. (fabricante de ventanas y puertas de aluminio y vidrio). Redacta el texto de un ${cfg.label.toUpperCase()} interno de "Calidad Producción" dirigido a los colaboradores de las áreas de la planta, para divulgar implementaciones, mejoras de diseño, integración de nuevos productos o cambios en el proceso de control y de producción.

DATOS
- De: ${input.de}
- Para: ${input.para}
- Asunto propuesto: ${input.asunto}
- Lo que pide el colaborador: ${input.contexto}
  Puede ser una descripción del cambio o una instrucción dirigida a ti (por ejemplo "genera una explicación detallada del proceso"). Si es una instrucción, cúmplela y desarrolla el contenido completo del documento.
- Pies de foto escritos por el colaborador (en el orden de las ${input.piesFotos.length} imágenes adjuntas): ${input.piesFotos.map((p, i) => `${i + 1}) ${p || '(sin pie)'}`).join(' | ') || 'no hay imágenes'}
- Documentos de referencia adjuntos: ${docs}
${describeDraft(input.borrador)}
FUENTES
- Las imágenes y los documentos de referencia (por ejemplo una ficha técnica) vienen adjuntos antes de este texto. Úsalos como fuente de las especificaciones, medidas, normas y pasos. Lo que diga el colaborador manda sobre cualquier otra fuente.
- No inventes cifras, medidas, torques, tiempos, normas, referencias, fechas ni nombres que no aparezcan en lo anterior. Cuando falte un dato técnico específico, redacta el paso de forma general y verificable, basado en las buenas prácticas de ensamble, producción y control de calidad, y remite al documento correspondiente ("según la ficha técnica del producto", "según la orden de producción").
- El documento debe quedar COMPLETO y listo para divulgar: nunca dejes secciones vacías, ni pidas más información dentro del texto, ni repitas las instrucciones del colaborador como si fueran el contenido. Corrige los errores de ortografía de lo que escribió el colaborador, incluidos nombres de productos (por ejemplo "batiente" en lugar de "bantiente").

ESTRUCTURA (igual a la plantilla oficial)
- asunto: título corto y claro del tema, por ejemplo "Marcado de vidrio laminado templado claro". Si el propuesto ya es claro, consérvalo corregido; sin punto final.
- intro: un párrafo que inicia con "${opening}" y explica con claridad qué cambia, a quién aplica y para qué. Marca con **dos asteriscos** hasta 3 términos clave (nombres de producto, marca o el cambio principal).
- pasos: de 4 a 7 objetos { "titulo", "detalle" }, en orden de ejecución. "titulo" es una acción corta que termina en punto (por ejemplo "Identificar la composición del vidrio laminado."). "detalle" son 1 a 3 oraciones que explican cómo hacerlo, con los datos de la fuente.
- pies: arreglo con exactamente ${input.piesFotos.length} textos, uno por imagen, en el mismo orden. Si el colaborador escribió un pie, consérvalo corregido; si no, propón uno de máximo 8 palabras según lo que muestra la imagen. Sin punto final.
- sugerencias: de 0 a 3 frases cortas dirigidas al colaborador sobre qué adjuntar o precisar para mejorar el documento (por ejemplo "Adjunta la ficha técnica para incluir las medidas exactas"). Arreglo vacío si no falta nada. No forman parte del documento.
- cierre: una sola oración de agradecimiento por la atención y el compromiso, como "${DEFAULT_CLOSING}", adaptada al tema.

TONO Y REDACCIÓN
- Español formal, claro y cordial, propio de un profesional colombiano de calidad. Primera persona del plural cuando corresponda.
- Ortografía impecable según la RAE: tildes, puntuación, concordancia y mayúsculas solo en nombres propios, siglas y códigos. Números con su unidad (por ejemplo "6 mm").
- Cada oración termina en punto (salvo asunto y pies). Sin repeticiones entre secciones y sin frases vagas: cada una aporta un dato o una instrucción concreta.
- PROHIBIDO usar guiones largos o medios (— o –). Usa comas, puntos o paréntesis. El guion corto solo dentro de códigos o referencias.
- No uses emojis ni frases típicas de texto automático como "Es importante destacar" o "cabe resaltar".

Responde exclusivamente con un JSON de esta forma, sin texto adicional:
{
  "asunto": "...",
  "intro": "...",
  "pasos": [{ "titulo": "...", "detalle": "..." }],
  "pies": ["..."],
  "sugerencias": ["..."],
  "cierre": "..."
}`;
}

/** Texto base cuando la IA no está disponible: el comunicado se puede generar igual y editar después. */
export function buildFallbackDraft(input: CommuniqueDraftInput, motivo?: string): CommuniqueDraft {
  return {
    asunto: input.asunto,
    intro: `${KIND_CONFIG[input.tipo].opening} ${input.contexto.trim()}`,
    pasos: [],
    pies: input.piesFotos,
    cierre: DEFAULT_CLOSING,
    sugerencias: [],
    generadoPorIa: false,
    motivo
  };
}

function draftFromParsed(parsed: any, input: CommuniqueDraftInput): CommuniqueDraft {
  const clean = (text: unknown) => (typeof text === 'string' ? stripDashes(text).trim() : '');
  const pies = Array.isArray(parsed.pies) ? parsed.pies.map(clean) : [];
  return {
    asunto: clean(parsed.asunto).replace(/[.]+$/, '') || input.asunto,
    intro: polishText(clean(parsed.intro)),
    pasos: Array.isArray(parsed.pasos)
      ? parsed.pasos
          .filter((s: any) => s && typeof s.titulo === 'string' && typeof s.detalle === 'string')
          .map((s: any) => ({ titulo: polishText(clean(s.titulo)), detalle: polishText(clean(s.detalle)) }))
      : [],
    pies: input.piesFotos.map((fallback, i) => (pies[i] || fallback).replace(/[.]+$/, '')),
    cierre: polishText(clean(parsed.cierre)) || DEFAULT_CLOSING,
    sugerencias: Array.isArray(parsed.sugerencias) ? parsed.sugerencias.map(clean).filter(Boolean).slice(0, 3) : [],
    generadoPorIa: true
  };
}

function buildParts(input: CommuniqueDraftInput): any[] {
  const toPart = (f: { buffer: Buffer; mimeType: string }) => ({ inlineData: { mimeType: f.mimeType, data: f.buffer.toString('base64') } });
  const textDocs = input.documents.filter(d => d.mimeType === 'text/plain').map(d => ({ text: `Documento de referencia "${d.nombre}":\n${d.buffer.toString('utf-8').slice(0, 20000)}` }));
  const binaryDocs = input.documents.filter(d => d.mimeType !== 'text/plain').map(toPart);
  return [...input.images.map(toPart), ...binaryDocs, ...textDocs, { text: buildPrompt(input) }];
}

export async function generateCommuniqueDraft(input: CommuniqueDraftInput): Promise<CommuniqueDraft> {
  const contents = [{ role: 'user', parts: buildParts(input) }];
  const { data, motivo } = await generateJsonWithFallback(contents, p => typeof p.intro === 'string' && Array.isArray(p.pasos) && p.pasos.length > 0, 'el comunicado');
  return data ? draftFromParsed(data, input) : buildFallbackDraft(input, motivo);
}
