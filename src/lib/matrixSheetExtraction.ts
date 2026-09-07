import { getGeminiClient } from './geminiClient';

/**
 * Extrae las cotas y tolerancias de la foto de una ficha técnica de
 * matriz (plano de extrusión) usando visión de Gemini con salida JSON
 * estructurada — a diferencia de Base de Conocimiento (que transcribe a
 * Markdown libre), aquí se necesita una lista de valores numéricos
 * utilizables directamente en el checklist de inspección.
 */

const VISION_MODEL = 'gemini-3.6-flash';

const EXTRACTION_PROMPT = `Esta imagen es una ficha técnica de matriz (plano de extrusión) de un perfil de aluminio, con cotas acotadas y sus tolerancias.

Extrae TODAS las cotas dimensionales acotadas en el plano (medidas en mm) y devuelve exclusivamente un JSON con esta forma exacta, sin texto adicional ni bloques de código:

{
  "matrixCode": "código de matriz si aparece visible en el plano, o null",
  "profileName": "nombre o descripción corta del perfil si aparece, o null",
  "flatnessToleranceMm": número de la tolerancia general de planeidad en mm si aparece indicada, o null,
  "eccentricityToleranceMm": número de la tolerancia general de excentricidad en mm si aparece indicada, o null,
  "cotas": [
    { "label": "descripción corta de qué cota es (ej. 'Altura total', 'Ancho total', 'Espesor de pared')", "nominalValueMm": número, "tolerancePlusMm": número, "toleranceMinusMm": número }
  ]
}

Reglas:
- Si una cota se ve como "42.00 ± 0.15", tolerancePlusMm y toleranceMinusMm son ambos 0.15.
- Si una cota no tiene tolerancia explícita junto a ella, usa la tolerancia general de planeidad si aplica, o 0 si no hay ninguna indicación.
- No inventes ni completes valores que no puedas leer con certeza — omite esa cota de la lista en vez de adivinar un número.
- Todos los valores numéricos van en milímetros. Si el plano usa otra unidad, conviértela a mm.
- No agregues comentarios ni explicación fuera del JSON.`;

export interface ExtractedCota {
  label: string;
  nominalValueMm: number;
  tolerancePlusMm: number;
  toleranceMinusMm: number;
}

export interface MatrixSheetExtractionResult {
  matrixCode: string | null;
  profileName: string | null;
  flatnessToleranceMm: number | null;
  eccentricityToleranceMm: number | null;
  cotas: ExtractedCota[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseExtractionResponse(text: string): MatrixSheetExtractionResult {
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  const parsed = JSON.parse(cleaned);

  const cotas: ExtractedCota[] = Array.isArray(parsed.cotas)
    ? parsed.cotas
        .filter((c: any) => typeof c?.label === 'string' && isFiniteNumber(c?.nominalValueMm))
        .map((c: any) => ({
          label: String(c.label).trim(),
          nominalValueMm: c.nominalValueMm,
          tolerancePlusMm: isFiniteNumber(c.tolerancePlusMm) ? c.tolerancePlusMm : 0,
          toleranceMinusMm: isFiniteNumber(c.toleranceMinusMm) ? c.toleranceMinusMm : 0
        }))
    : [];

  return {
    matrixCode: typeof parsed.matrixCode === 'string' ? parsed.matrixCode.trim() : null,
    profileName: typeof parsed.profileName === 'string' ? parsed.profileName.trim() : null,
    flatnessToleranceMm: isFiniteNumber(parsed.flatnessToleranceMm) ? parsed.flatnessToleranceMm : null,
    eccentricityToleranceMm: isFiniteNumber(parsed.eccentricityToleranceMm) ? parsed.eccentricityToleranceMm : null,
    cotas
  };
}

export async function extractCotasFromSheetImage(imageBuffer: Buffer, mimeType: string): Promise<MatrixSheetExtractionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { matrixCode: null, profileName: null, flatnessToleranceMm: null, eccentricityToleranceMm: null, cotas: [] };
  }

  const client = getGeminiClient();
  const response = await client.models.generateContent({
    model: VISION_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
          { text: EXTRACTION_PROMPT }
        ]
      }
    ],
    config: { responseMimeType: 'application/json' }
  });

  const text = response.text?.trim();
  if (!text) {
    return { matrixCode: null, profileName: null, flatnessToleranceMm: null, eccentricityToleranceMm: null, cotas: [] };
  }

  try {
    return parseExtractionResponse(text);
  } catch (err: any) {
    console.warn('⚠️ No se pudo parsear la respuesta de extracción de cotas:', err?.message || err);
    return { matrixCode: null, profileName: null, flatnessToleranceMm: null, eccentricityToleranceMm: null, cotas: [] };
  }
}
