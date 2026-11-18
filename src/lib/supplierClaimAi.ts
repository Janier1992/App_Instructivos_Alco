import { MediaResolution, ThinkingLevel } from '@google/genai';
import { getGeminiClient, getGeminiModelChain } from './geminiClient';
import type { SupplierClaimAction, SupplierClaimRejectItem } from './supplierClaimsStore';
import { polishText, stripDashes } from './supplierClaimShared';
import { MATERIAL_TYPES, normalizeMaterialType, type SupplierClaimMaterialType } from './supplierClaimMaterialType';

/**
 * Redacta el texto del informe de No Conformidad a proveedor (mismo tono y
 * estructura del formato oficial de Alco) a partir de lo que registra el
 * inspector: su análisis y las fotos del defecto. Mismo patrón de las demás
 * visiones de la app: modo JSON nativo de Gemini.
 */

// La función serverless de la ruta vive 60 s. Se prueba la cadena de modelos de la app (el principal y sus respaldos)
// dentro de este presupuesto: si Gemini está saturado (503) o tarda, el siguiente modelo responde antes de caer al texto base.
const TOTAL_BUDGET_MS = 52000;
const ATTEMPT_TIMEOUT_MS = 22000;
const MIN_ATTEMPT_MS = 6000;

export interface SupplierClaimDraftInput {
  proveedor: string;
  tipoMaterial?: SupplierClaimMaterialType;
  materiaPrima: string;
  referencias: string;
  lotes: string;
  observacionInspector: string;
  comentariosFotos?: string[];
  /** Unidades rechazadas (referencia, cantidad, acabado, medida): el texto debe ser coherente con esta tabla. */
  rechazoItems?: SupplierClaimRejectItem[];
  images: { buffer: Buffer; mimeType: string }[];
}

export interface SupplierClaimDraft {
  defectoTitulo: string;
  descripcionNc: string;
  observacionesTecnicas: string[];
  accionesCorrectivas: SupplierClaimAction[];
  generadoPorIa: boolean;
}

function describeRejects(items: SupplierClaimRejectItem[] | undefined): string {
  const rows = (items || []).filter(i => Number(i.cantidad) > 0);
  if (rows.length === 0) return '';
  const lines = rows.map(i => `  * ${i.referencia?.trim() || 'Referencia no indicada'}: ${i.cantidad} unidades, acabado ${i.acabado?.trim() || 'no indicado'}, medida ${i.medidaMm?.trim() || 'no indicada'} mm`);
  return `- Unidades rechazadas (tabla del informe):\n${lines.join('\n')}\n`;
}

function buildPrompt(input: SupplierClaimDraftInput): string {
  const type = MATERIAL_TYPES[normalizeMaterialType(input.tipoMaterial)];
  return `Eres un Asistente de Calidad de ALCO S.A.S. (fabricante de ventanas y puertas de aluminio y vidrio). Redacta el texto de un "Informe de Calidad de Abastecimiento, No Conformidades de Proveedor" a partir de los datos de la inspección de recepción (tipo de material: ${type.noun}) y de las fotos del defecto (si las hay).

DATOS
- Proveedor: ${input.proveedor}
- Tipo de material: ${type.label}
- ${type.label}: ${input.materiaPrima}
- Referencia(s): ${input.referencias}
- Lote(s): ${input.lotes || 'No indicado'}
- Novedad registrada por el inspector: ${input.observacionInspector}
${input.comentariosFotos?.length ? `- Comentarios del inspector sobre cada foto: ${input.comentariosFotos.join(' | ')}
` : ''}${describeRejects(input.rechazoItems)}
TIPO DE INFORME: ${type.label.toUpperCase()}
${type.aiFocus}
Adapta el vocabulario, el análisis y las solicitudes a este tipo de material. No uses términos de otro tipo (por ejemplo, no hables de extrusión o perfiles si es un accesorio o un insumo).

PROCESO DE REDACCIÓN (hazlo internamente antes de responder)
1. Interpreta la novedad del inspector: suele venir en lenguaje informal, abreviado o con errores de escritura. Entiende qué defecto describe y reescríbelo en español técnico y formal, sin copiar sus giros coloquiales ni sus errores.
2. Identifica el defecto y úsalo con el mismo nombre y los mismos términos en todas las secciones (título, descripción, observaciones y acciones). No cambies de término a mitad del informe.
3. Si hay varias referencias o filas de unidades rechazadas, trátalas en conjunto: menciona cada referencia afectada por su código y no atribuyas a una lo que corresponde a otra. Si el defecto es el mismo para todas, dilo una sola vez.
4. Redacta, y luego revisa como lo haría un editor: ortografía y tildes, puntuación, concordancia de género y número, mayúscula inicial en cada oración, sin repeticiones entre secciones y sin frases vagas. Cada oración debe aportar un dato o una solicitud concreta.

TONO Y REDACCIÓN
- Lenguaje formal, cordial, respetuoso y amable. El informe debe leerse como una comunicación entre aliados comerciales que buscan mejorar juntos, nunca como un reproche ni una presión sobre el proveedor.
- Describe los hechos de manera objetiva y serena, sin adjetivos fuertes, sin culpar y sin amenazar. Evita expresiones como "inaceptable", "incumplimiento", "exigimos", "deben" o "obligatorio".
- Formula las acciones como solicitudes amables y colaborativas: "Agradecemos su apoyo para...", "Solicitamos amablemente...", "Quedamos atentos a...".
- Usa primera persona del plural cuando corresponda ("observamos", "agradecemos") y mantén el español natural de un profesional colombiano de calidad.
- PROHIBIDO usar guiones largos o medios (— o –). Usa comas, puntos o paréntesis. El guion corto solo se admite dentro de códigos o referencias (por ejemplo A-0046).
- Ortografía impecable según la RAE: tildes, signos de puntuación, uso correcto de mayúsculas y minúsculas (solo nombres propios, siglas y códigos en mayúscula) y números con su unidad (por ejemplo "6000 mm"). Sin anglicismos, sin abreviaturas informales y sin errores de concordancia.
- Cada oración termina en punto. Los párrafos son completos y coherentes entre sí; el segundo continúa el hilo del primero sin repetirlo.
- No uses emojis, viñetas dentro de los párrafos, ni frases típicas de texto automático como "Es importante destacar" o "cabe resaltar".

ESTRUCTURA
- defectoTitulo: nombre corto del defecto, por ejemplo "Desgarre por Extrusión".
- descripcionNc: 2 párrafos separados por una línea en blanco. El primero describe con claridad lo hallado en la inspección de la referencia y cómo se manifiesta el defecto. El segundo explica con amabilidad que, conforme a los Criterios de Aceptación de ALCO S.A.S., esta novedad se clasifica como NO CONFORME y que afecta la calidad del ${type.noun} (estética, funcional o estructural, según corresponda), con la intención de que se pueda revisar en conjunto.
- observacionesTecnicas: 3 a 4 frases cortas y objetivas (${type.aiObservations}).
- accionesCorrectivas: exactamente 3 objetos { "titulo", "detalle" } con los títulos "Análisis de causa raíz", "Control de calidad en origen" y "Reposición del material rechazado". Cada detalle es una solicitud amable y específica para este defecto, material y referencia. Enfoque para este tipo de material: ${type.aiActions}

REGLAS
- No inventes cantidades, fechas, lotes, medidas, causas confirmadas ni datos que no estén arriba. Si mencionas el origen del defecto, plantéalo como posibilidad ("podría estar relacionado con...").
- Si hay unidades rechazadas en la tabla, no repitas el detalle de cada fila en el texto: el informe ya la incluye. Solo haz referencia a las referencias afectadas.
- La reposición debe cubrir las referencias y cantidades de la tabla, sin cifras distintas a las indicadas.
- Basa el defecto en lo que dice el inspector; usa las fotos solo para confirmarlo o precisar su descripción. No contradigas al inspector.

Responde exclusivamente con un JSON de esta forma, sin texto adicional:
{
  "defectoTitulo": "...",
  "descripcionNc": "...",
  "observacionesTecnicas": ["..."],
  "accionesCorrectivas": [{ "titulo": "...", "detalle": "..." }]
}`;
}

function parseJson(text: string | undefined): any | null {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Gemini no respondió en ${ms / 1000} s.`)), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

/** Texto base cuando la IA no está disponible: el informe se puede generar igual y editar después. */
export function buildFallbackDraft(input: SupplierClaimDraftInput): SupplierClaimDraft {
  return {
    defectoTitulo: '',
    descripcionNc:
      `Durante el proceso de inspección de la referencia ${input.referencias} (${input.materiaPrima}) observamos la siguiente novedad: ${input.observacionInspector}

` +
      'Conforme a los Criterios de Aceptación de ALCO S.A.S., esta novedad se clasifica como NO CONFORME y afecta la calidad del suministro recibido. Compartimos esta información con el ánimo de revisarla en conjunto y continuar mejorando.',
    observacionesTecnicas: ['Se adjuntan imágenes fotográficas del hallazgo evidenciado durante la inspección.'],
    accionesCorrectivas: [
      { titulo: 'Análisis de causa raíz', detalle: 'Agradecemos su apoyo para identificar y documentar la causa de la novedad en el proceso de fabricación.' },
      { titulo: 'Control de calidad en origen', detalle: `Solicitamos amablemente considerar una inspección previa al despacho de la referencia ${input.referencias}.` },
      { titulo: 'Reposición del material rechazado', detalle: 'Agradecemos el envío de unidades sin la novedad reportada, con previa verificación de calidad.' }
    ],
    generadoPorIa: false
  };
}

function draftFromParsed(parsed: any): SupplierClaimDraft {
  return {
    defectoTitulo: typeof parsed.defectoTitulo === 'string' ? stripDashes(parsed.defectoTitulo) : '',
    descripcionNc: stripDashes(parsed.descripcionNc).split(/\n\s*\n/).map(polishText).filter(Boolean).join('\n\n'),
    observacionesTecnicas: Array.isArray(parsed.observacionesTecnicas) ? parsed.observacionesTecnicas.filter((o: unknown) => typeof o === 'string').map((o: string) => polishText(stripDashes(o))).filter(Boolean) : [],
    accionesCorrectivas: Array.isArray(parsed.accionesCorrectivas)
      ? parsed.accionesCorrectivas
          .filter((a: any) => a && typeof a.titulo === 'string' && typeof a.detalle === 'string')
          .map((a: any) => ({ titulo: stripDashes(a.titulo), detalle: polishText(stripDashes(a.detalle)) }))
      : [],
    generadoPorIa: true
  };
}

/** Una llamada a Gemini con el modelo indicado. Fotos en resolución baja y poco razonamiento interno: redactar el informe no requiere más y reduce la espera. */
async function callGemini(model: string, contents: any[], timeoutMs: number) {
  const response = await withTimeout(
    getGeminiClient().models.generateContent({
      model,
      contents,
      config: { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW }
    }),
    timeoutMs
  );
  return parseJson(response.text);
}

export async function generateSupplierClaimDraft(input: SupplierClaimDraftInput): Promise<SupplierClaimDraft> {
  if (!process.env.GEMINI_API_KEY) return buildFallbackDraft(input);

  const startedAt = Date.now();
  const imageParts = input.images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.buffer.toString('base64') } }));
  const contents = [{ role: 'user', parts: [...imageParts, { text: buildPrompt(input) }] }];

  for (const model of getGeminiModelChain()) {
    const attemptMs = Math.min(ATTEMPT_TIMEOUT_MS, TOTAL_BUDGET_MS - (Date.now() - startedAt));
    if (attemptMs < MIN_ATTEMPT_MS) break;
    try {
      const parsed = await callGemini(model, contents, attemptMs);
      if (parsed && typeof parsed.descripcionNc === 'string') return draftFromParsed(parsed);
      console.warn(`⚠️ Gemini (${model}) devolvió un informe sin el formato esperado; se prueba el siguiente modelo.`);
    } catch (err: any) {
      console.warn(`⚠️ Error generando informe de reclamo a proveedor con IA (${model}):`, err?.message || err);
    }
  }
  return buildFallbackDraft(input);
}
