import { getGeminiClient } from './geminiClient';

/**
 * Dos usos de visión para la validación en planta, cada uno con un límite
 * explícito para no fabricar precisión que no existe:
 *
 * 1) Chequeo de FORMA: compara la geometría del perfil fotografiado contra
 *    el corte transversal dibujado en la ficha — nunca da una cifra en mm,
 *    solo si la forma parece coincidir o no (detecta el caso real de sacar
 *    el perfil de la matriz equivocada del estante).
 * 2) Lectura del calibrador: OCR del número mostrado en la pantalla del
 *    instrumento — esto sí es confiable (leer dígitos impresos/LCD es
 *    fundamentalmente distinto a estimar una medida desde una foto sin
 *    referencia de escala).
 */

const VISION_MODEL = 'gemini-3.6-flash';

export type ShapeCheckResult = 'coincide' | 'no_coincide' | 'no_concluyente';

const SHAPE_CHECK_PROMPT = `Tienes dos imágenes: la PRIMERA es una foto del corte transversal de un perfil de aluminio físico. La SEGUNDA es el plano/ficha técnica de la matriz de extrusión que se supone que ese perfil debe corresponder.

Tu única tarea es comparar la FORMA/GEOMETRÍA general (número de paredes, proporciones generales, presencia de patas o salientes característicos) — NUNCA compares ni menciones medidas en milímetros, la foto del perfil no tiene una referencia de escala así que cualquier medida que "leas" de ella sería inventada.

Responde exclusivamente con un JSON de esta forma, sin texto adicional:
{
  "result": "coincide" | "no_coincide" | "no_concluyente",
  "notes": "explicación breve en 1-2 frases de por qué, en español, mencionando solo características de forma"
}

Usa "no_concluyente" si la foto del perfil no tiene suficiente calidad/ángulo para comparar la forma con confianza — nunca fuerces un veredicto que no puedas sustentar visualmente.`;

const CALIPER_OCR_PROMPT = `Esta imagen muestra la pantalla de un calibrador digital (pie de rey) mostrando una lectura numérica en milímetros.

Responde exclusivamente con un JSON de esta forma, sin texto adicional:
{ "value": número leído en la pantalla, o null si no se alcanza a leer con certeza }

No inventes ni redondees un valor que no puedas leer con certeza — responde null en ese caso.`;

function parseJsonResponse(text: string | undefined): any | null {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function checkProfileShapeMatch(
  profileImageBuffer: Buffer,
  profileMimeType: string,
  sheetImageBuffer: Buffer,
  sheetMimeType: string
): Promise<{ result: ShapeCheckResult; notes: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { result: 'no_concluyente', notes: 'Servicio de visión no configurado.' };

  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: VISION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: profileMimeType, data: profileImageBuffer.toString('base64') } },
            { inlineData: { mimeType: sheetMimeType, data: sheetImageBuffer.toString('base64') } },
            { text: SHAPE_CHECK_PROMPT }
          ]
        }
      ],
      config: { responseMimeType: 'application/json' }
    });

    const parsed = parseJsonResponse(response.text);
    const result: ShapeCheckResult = ['coincide', 'no_coincide', 'no_concluyente'].includes(parsed?.result) ? parsed.result : 'no_concluyente';
    const notes = typeof parsed?.notes === 'string' ? parsed.notes : 'No se pudo determinar.';
    return { result, notes };
  } catch (err: any) {
    console.warn('⚠️ Error en chequeo de forma del perfil:', err?.message || err);
    return { result: 'no_concluyente', notes: 'Error al procesar la comparación de forma.' };
  }
}

export async function readCaliperDisplay(imageBuffer: Buffer, mimeType: string): Promise<number | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: VISION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
            { text: CALIPER_OCR_PROMPT }
          ]
        }
      ],
      config: { responseMimeType: 'application/json' }
    });

    const parsed = parseJsonResponse(response.text);
    return typeof parsed?.value === 'number' && Number.isFinite(parsed.value) ? parsed.value : null;
  } catch (err: any) {
    console.warn('⚠️ Error leyendo pantalla de calibrador:', err?.message || err);
    return null;
  }
}
