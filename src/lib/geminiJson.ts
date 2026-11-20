import { MediaResolution, ThinkingLevel } from '@google/genai';
import { getGeminiClient, getGeminiModelChain } from './geminiClient';

/**
 * Pide a Gemini una respuesta JSON recorriendo la cadena de modelos de la app.
 * La función serverless de las rutas vive 60 s: si el modelo principal está
 * saturado (503) o tarda, el siguiente responde antes de agotar el
 * presupuesto. Devuelve null si ninguno entrega un JSON válido; quien llama
 * decide el texto de respaldo.
 */

const TOTAL_BUDGET_MS = 52000;
const ATTEMPT_TIMEOUT_MS = 22000;
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

export async function generateJsonWithFallback(contents: any[], isValid: (parsed: any) => boolean, label: string): Promise<any | null> {
  if (!process.env.GEMINI_API_KEY) return null;

  const startedAt = Date.now();
  for (const model of getGeminiModelChain()) {
    const attemptMs = Math.min(ATTEMPT_TIMEOUT_MS, TOTAL_BUDGET_MS - (Date.now() - startedAt));
    if (attemptMs < MIN_ATTEMPT_MS) break;
    try {
      const parsed = await callGemini(model, contents, attemptMs);
      if (parsed && isValid(parsed)) return parsed;
      console.warn(`⚠️ Gemini (${model}) devolvió ${label} sin el formato esperado; se prueba el siguiente modelo.`);
    } catch (err: any) {
      console.warn(`⚠️ Error generando ${label} con IA (${model}):`, err?.message || err);
    }
  }
  return null;
}
