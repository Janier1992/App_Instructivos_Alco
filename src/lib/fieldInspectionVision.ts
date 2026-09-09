import { getGeminiClient } from './geminiClient';

/**
 * Dos análisis de IA para Inspecciones en Campo, portados del proyecto de
 * referencia (que usaba Gemini 1.5 Flash con parseo manual de Markdown) —
 * aquí con el mismo patrón ya usado en el resto de la app: modo JSON nativo
 * de Gemini, sin necesidad de limpiar ```json manualmente.
 */

const VISION_MODEL = 'gemini-3.6-flash';

export type DefectoTipo = 'NINGUNO' | 'RAYAS' | 'GOLPES' | 'DECOLORACION' | 'REVENTON';

export interface DefectAnalysisResult {
  cantTotal: number;
  defecto: DefectoTipo;
  observacion: string;
  estado: 'Aprobado' | 'Aprobado (Condicionado)' | 'Rechazado';
  alertLevel: 'None' | 'Warning' | 'Critical';
  isLocked: boolean;
}

const DEFECT_PROMPT = `Analiza esta imagen de una parte industrial / perfil de aluminio. Actúa como un experto inspector de calidad.

Responde exclusivamente con un JSON de esta forma, sin texto adicional:
{
  "cantTotal": número de unidades visibles (estimado si es difícil de contar con certeza),
  "defecto": uno de "NINGUNO" | "RAYAS" | "GOLPES" | "DECOLORACION" | "REVENTON",
  "observacion": "descripción técnica breve y profesional del hallazgo, en español"
}

Si no se detecta ningún defecto, el campo "defecto" es "NINGUNO". No inventes un defecto que no puedas sustentar visualmente.`;

function parseJson(text: string | undefined): any | null {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function analyzeDefectPhoto(imageBuffer: Buffer, mimeType: string): Promise<DefectAnalysisResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: VISION_MODEL,
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: imageBuffer.toString('base64') } }, { text: DEFECT_PROMPT }] }],
      config: { responseMimeType: 'application/json' }
    });

    const parsed = parseJson(response.text);
    if (!parsed) return null;

    const defecto: DefectoTipo = ['NINGUNO', 'RAYAS', 'GOLPES', 'DECOLORACION', 'REVENTON'].includes(parsed.defecto) ? parsed.defecto : 'NINGUNO';
    let estado: DefectAnalysisResult['estado'] = 'Aprobado';
    let alertLevel: DefectAnalysisResult['alertLevel'] = 'None';
    let isLocked = false;

    if (defecto !== 'NINGUNO') {
      if (defecto === 'REVENTON' || defecto === 'DECOLORACION') {
        estado = 'Rechazado';
        alertLevel = 'Critical';
        isLocked = true;
      } else {
        estado = 'Aprobado (Condicionado)';
        alertLevel = 'Warning';
      }
    }

    return {
      cantTotal: typeof parsed.cantTotal === 'number' ? parsed.cantTotal : 0,
      defecto,
      observacion: typeof parsed.observacion === 'string' ? parsed.observacion : '',
      estado,
      alertLevel,
      isLocked
    };
  } catch (err: any) {
    console.warn('⚠️ Error en análisis de defectos por IA:', err?.message || err);
    return null;
  }
}

export interface DetectedUnit {
  id: number;
  /** [ymin, xmin, ymax, xmax] normalizado 0-1000, convención de Gemini para cajas delimitadoras. */
  box2d: [number, number, number, number];
}

export interface CountAnalysisResult {
  cantTotal: number;
  unidades: DetectedUnit[];
  observacion: string;
}

const COUNT_PROMPT = `Analiza esta foto de perfiles o ventanas de aluminio apiladas/arrumadas en una obra o fábrica. Actúa como un inspector de control de calidad experto en metrología y empaque industrial.

1. Identifica y cuenta con precisión cuántas unidades individuales de ventanas o perfiles apilados están presentes en el arrume.
2. Para cada unidad individual visible, da su caja delimitadora aproximada [ymin, xmin, ymax, xmax] normalizada en escala 0 a 1000 (0 = arriba/izquierda, 1000 = abajo/derecha).

Responde exclusivamente con un JSON de esta forma, sin texto adicional:
{
  "cantTotal": número total de unidades detectadas,
  "unidades": [{ "id": número correlativo, "box2d": [número, número, número, número] }],
  "observacion": "descripción técnica breve en español de cuántas unidades se contaron"
}`;

export async function countStackedUnits(imageBuffer: Buffer, mimeType: string): Promise<CountAnalysisResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: VISION_MODEL,
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: imageBuffer.toString('base64') } }, { text: COUNT_PROMPT }] }],
      config: { responseMimeType: 'application/json' }
    });

    const parsed = parseJson(response.text);
    if (!parsed) return null;

    const unidades: DetectedUnit[] = Array.isArray(parsed.unidades)
      ? parsed.unidades
          .filter((u: any) => Array.isArray(u?.box2d) && u.box2d.length === 4)
          .map((u: any, idx: number) => ({ id: typeof u.id === 'number' ? u.id : idx + 1, box2d: u.box2d }))
      : [];

    return {
      cantTotal: typeof parsed.cantTotal === 'number' ? parsed.cantTotal : unidades.length,
      unidades,
      observacion: typeof parsed.observacion === 'string' ? parsed.observacion : ''
    };
  } catch (err: any) {
    console.warn('⚠️ Error en conteo por IA:', err?.message || err);
    return null;
  }
}
