import { getGeminiClient } from './geminiClient';
import type { SupplierClaimAction } from './supplierClaimsStore';

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
  return `Eres un Asistente de Calidad de ALCO S.A.S. (fabricante de ventanas y puertas de aluminio y vidrio). Redacta el texto de un "Informe de Calidad — Abastecimiento — No Conformidades Proveedor" a partir de los datos de la inspección de recepción y de las fotos del defecto (si las hay).

DATOS
- Proveedor: ${input.proveedor}
- Materia prima / insumo: ${input.materiaPrima}
- Referencia(s): ${input.referencias}
- Lote(s): ${input.lotes || 'No indicado'}
- Novedad registrada por el inspector: ${input.observacionInspector}

ESTILO (sigue este ejemplo real de Alco)
- defectoTitulo: nombre corto del defecto, p. ej. "Desgarre por Extrusión".
- descripcionNc: 2 párrafos separados por una línea en blanco. El primero describe lo hallado en la inspección de la referencia y cómo se manifiesta el defecto; el segundo indica que, conforme a los Criterios de Aceptación de ALCO S.A.S., el defecto se clasifica como NO CONFORME y que compromete la calidad (estética/funcional/estructural según corresponda).
- observacionesTecnicas: 3 a 4 viñetas cortas (visibilidad a distancia, extensión del defecto, origen probable en el proceso del proveedor, evidencia fotográfica).
- accionesCorrectivas: exactamente 3 objetos { "titulo", "detalle" }: "Análisis de causa raíz", "Control de calidad en origen", "Reemplazo inmediato del material rechazado" — con detalle específico para este defecto, material y referencia.

REGLAS
- Español formal, técnico, en tercera persona. No inventes cantidades, fechas, lotes ni datos que no estén arriba.
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
      `Durante el proceso de inspección de la referencia ${input.referencias} (${input.materiaPrima}) se identificó la siguiente novedad: ${input.observacionInspector}\n\n` +
      'Conforme a los Criterios de Aceptación de ALCO S.A.S., esta novedad se clasifica como NO CONFORME, lo cual compromete la calidad del material recibido y el cumplimiento de los estándares exigidos.',
    observacionesTecnicas: ['Se adjuntan imágenes fotográficas del defecto evidenciado durante la inspección.'],
    accionesCorrectivas: [
      { titulo: 'Análisis de causa raíz', detalle: 'Identificar y documentar la causa de la novedad en el proceso del proveedor.' },
      { titulo: 'Control de calidad en origen', detalle: `Implementar inspección antes del despacho de la referencia ${input.referencias}.` },
      { titulo: 'Reemplazo inmediato del material rechazado', detalle: 'Enviar unidades sin defecto, con previo control de calidad del proveedor.' }
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
      defectoTitulo: typeof parsed.defectoTitulo === 'string' ? parsed.defectoTitulo : '',
      descripcionNc: parsed.descripcionNc,
      observacionesTecnicas: Array.isArray(parsed.observacionesTecnicas) ? parsed.observacionesTecnicas.filter((o: unknown) => typeof o === 'string') : [],
      accionesCorrectivas: Array.isArray(parsed.accionesCorrectivas)
        ? parsed.accionesCorrectivas
            .filter((a: any) => a && typeof a.titulo === 'string' && typeof a.detalle === 'string')
            .map((a: any) => ({ titulo: a.titulo, detalle: a.detalle }))
        : [],
      generadoPorIa: true
    };
  } catch (err: any) {
    console.warn('⚠️ Error generando informe de reclamo a proveedor con IA:', err?.message || err);
    return buildFallbackDraft(input);
  }
}
