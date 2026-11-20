import { MediaResolution, ThinkingLevel } from '@google/genai';
import { getGeminiClient, getGeminiModelChain } from './geminiClient';

/**
 * Pide a Gemini una respuesta JSON recorriendo la cadena de modelos de la app.
 * La función serverless de las rutas vive 60 s: si el modelo principal está
 * saturado (503) o tarda, el siguiente responde antes de agotar el
 * presupuesto. Si ninguno entrega un JSON válido devuelve data null y el
 * motivo; quien llama decide el texto de respaldo.
 */

const TOTAL_BUDGET_MS = 48000;
const ATTEMPT_TIMEOUT_MS = 27000;
const MIN_ATTEMPT_MS = 6000;

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

/** Fotos en resolución baja y poco razonamiento interno: redactar texto no requiere más y reduce la espera. */
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

/** Motivo del fallo en lenguaje claro para mostrarlo al colaborador, sin tener que revisar los logs. */
export function describeGeminiFailure(error: unknown): string {
  const message = String((error as any)?.message || error || '');
  if (/503|UNAVAILABLE|high demand/i.test(message)) return 'Gemini está saturado (alta demanda)';
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(message)) return 'se agotó la cuota de Gemini';
  if (/no respondió/i.test(message)) return 'Gemini tardó demasiado en responder';
  if (/API key|API_KEY|401|403|PERMISSION_DENIED/i.test(message)) return 'la clave de Gemini no es válida o no tiene permiso';
  if (/400|INVALID_ARGUMENT/i.test(message)) return 'Gemini rechazó la solicitud (revisa el tamaño o el formato de los adjuntos)';
  return message.replace(/\s+/g, ' ').slice(0, 120) || 'error desconocido';
}

export interface GeminiJsonResult {
  data: any | null;
  /** Por qué no hubo respuesta, cuando data es null. */
  motivo?: string;
}

export async function generateJsonWithFallback(contents: any[], isValid: (parsed: any) => boolean, label: string): Promise<GeminiJsonResult> {
  if (!process.env.GEMINI_API_KEY) return { data: null, motivo: 'falta configurar la clave de Gemini en el servidor' };

  let motivo = 'Gemini no devolvió el formato esperado';
  const startedAt = Date.now();
  for (const model of getGeminiModelChain()) {
    const attemptMs = Math.min(ATTEMPT_TIMEOUT_MS, TOTAL_BUDGET_MS - (Date.now() - startedAt));
    if (attemptMs < MIN_ATTEMPT_MS) break;
    try {
      const parsed = await callGemini(model, contents, attemptMs);
      if (parsed && isValid(parsed)) return { data: parsed };
      console.warn(`⚠️ Gemini (${model}) devolvió ${label} sin el formato esperado; se prueba el siguiente modelo.`);
    } catch (err: any) {
      motivo = describeGeminiFailure(err);
      console.warn(`⚠️ Error generando ${label} con IA (${model}):`, err?.message || err);
    }
  }
  return { data: null, motivo };
}
