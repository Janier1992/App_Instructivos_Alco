import { getGeminiClient } from './geminiClient';
import type { SupplierClaimAction } from './supplierClaimsStore';
import { stripDashes } from './supplierClaimShared';

/**
 * Redacta el texto del informe de No Conformidad a proveedor (mismo tono y
 * estructura del formato oficial de Alco) a partir de lo que registra el
 * inspector: su análisis y las fotos del defecto. Mismo patrón de las demás
 * visiones de la app: modo JSON nativo de Gemini.
 */

const MODEL = 'gemini-3.6-flash';

export interface SupplierClaimDraftInput {
  proveedor: string;
  materiaPrima: string;
  referencias: string;
  lotes: string;
  observacionInspector: string;
  images: { buffer: Buffer; mimeType: string }[];
}

export interface SupplierClaimDraft {
  defectoTitulo: string;
  descripcionNc: string;
  observacionesTecnicas: string[];
  accionesCorrectivas: SupplierClaimAction[];
  generadoPorIa: boolean;
}

function buildPrompt(input: SupplierClaimDraftInput): string {
  return `Eres un Asistente de Calidad de ALCO S.A.S. (fabricante de ventanas y puertas de aluminio y vidrio). Redacta el texto de un "Informe de Calidad de Abastecimiento, No Conformidades de Proveedor" a partir de los datos de la inspección de recepción y de las fotos del defecto (si las hay).

DATOS
- Proveedor: ${input.proveedor}
- Materia prima / insumo: ${input.materiaPrima}
- Referencia(s): ${input.referencias}
- Lote(s): ${input.lotes || 'No indicado'}
- Novedad registrada por el inspector: ${input.observacionInspector}

TONO Y REDACCIÓN
- Lenguaje formal, cordial, respetuoso y amable. El informe debe leerse como una comunicación entre aliados comerciales que buscan mejorar juntos, nunca como un reproche ni una presión sobre el proveedor.
- Describe los hechos de manera objetiva y serena, sin adjetivos fuertes, sin culpar y sin amenazar. Evita expresiones como "inaceptable", "incumplimiento", "exigimos", "deben" o "obligatorio".
- Formula las acciones como solicitudes amables y colaborativas: "Agradecemos su apoyo para...", "Solicitamos amablemente...", "Quedamos atentos a...".
- Usa primera persona del plural cuando corresponda ("observamos", "agradecemos") y mantén el español natural de un profesional colombiano de calidad.
- PROHIBIDO usar guiones largos o medios (— o –). Usa comas, puntos o paréntesis. El guion corto solo se admite dentro de códigos o referencias (por ejemplo A-0046).
- No uses emojis, viñetas dentro de los párrafos, ni frases típicas de texto automático como "Es importante destacar" o "cabe resaltar".

ESTRUCTURA
- defectoTitulo: nombre corto del defecto, por ejemplo "Desgarre por Extrusión".
- descripcionNc: 2 párrafos separados por una línea en blanco. El primero describe con claridad lo hallado en la inspección de la referencia y cómo se manifiesta el defecto. El segundo explica con amabilidad que, conforme a los Criterios de Aceptación de ALCO S.A.S., esta novedad se clasifica como NO CONFORME y que afecta la calidad del material (estética, funcional o estructural, según corresponda), con la intención de que se pueda revisar en conjunto.
- observacionesTecnicas: 3 a 4 frases cortas y objetivas (visibilidad a distancia, extensión del defecto, posible origen en el proceso, evidencia fotográfica adjunta).
- accionesCorrectivas: exactamente 3 objetos { "titulo", "detalle" } con los títulos "Análisis de causa raíz", "Control de calidad en origen" y "Reposición del material rechazado". Cada detalle es una solicitud amable y específica para este defecto, material y referencia.

REGLAS
- No inventes cantidades, fechas, lotes ni datos que no estén arriba.
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

/** Texto base cuando la IA no está disponible: el informe se puede generar igual y editar después. */
export function buildFallbackDraft(input: SupplierClaimDraftInput): SupplierClaimDraft {
  return {
    defectoTitulo: '',
    descripcionNc:
      `Durante el proceso de inspección de la referencia ${input.referencias} (${input.materiaPrima}) observamos la siguiente novedad: ${input.observacionInspector}

` +
      'Conforme a los Criterios de Aceptación de ALCO S.A.S., esta novedad se clasifica como NO CONFORME y afecta la calidad del material recibido. Compartimos esta información con el ánimo de revisarla en conjunto y continuar mejorando.',
    observacionesTecnicas: ['Se adjuntan imágenes fotográficas del hallazgo evidenciado durante la inspección.'],
    accionesCorrectivas: [
      { titulo: 'Análisis de causa raíz', detalle: 'Agradecemos su apoyo para identificar y documentar la causa de la novedad en el proceso de fabricación.' },
      { titulo: 'Control de calidad en origen', detalle: `Solicitamos amablemente considerar una inspección previa al despacho de la referencia ${input.referencias}.` },
      { titulo: 'Reposición del material rechazado', detalle: 'Agradecemos el envío de unidades sin la novedad reportada, con previa verificación de calidad.' }
    ],
    generadoPorIa: false
  };
}

export async function generateSupplierClaimDraft(input: SupplierClaimDraftInput): Promise<SupplierClaimDraft> {
  if (!process.env.GEMINI_API_KEY) return buildFallbackDraft(input);

  try {
    const imageParts = input.images.map(img => ({ inlineData: { mimeType: img.mimeType, data: img.buffer.toString('base64') } }));
    const response = await getGeminiClient().models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [...imageParts, { text: buildPrompt(input) }] }],
      config: { responseMimeType: 'application/json' }
    });

    const parsed = parseJson(response.text);
    if (!parsed || typeof parsed.descripcionNc !== 'string') return buildFallbackDraft(input);

    return {
      defectoTitulo: typeof parsed.defectoTitulo === 'string' ? stripDashes(parsed.defectoTitulo) : '',
      descripcionNc: stripDashes(parsed.descripcionNc),
      observacionesTecnicas: Array.isArray(parsed.observacionesTecnicas) ? parsed.observacionesTecnicas.filter((o: unknown) => typeof o === 'string').map(stripDashes) : [],
      accionesCorrectivas: Array.isArray(parsed.accionesCorrectivas)
        ? parsed.accionesCorrectivas
            .filter((a: any) => a && typeof a.titulo === 'string' && typeof a.detalle === 'string')
            .map((a: any) => ({ titulo: stripDashes(a.titulo), detalle: stripDashes(a.detalle) }))
        : [],
      generadoPorIa: true
    };
  } catch (err: any) {
    console.warn('⚠️ Error generando informe de reclamo a proveedor con IA:', err?.message || err);
    return buildFallbackDraft(input);
  }
}
