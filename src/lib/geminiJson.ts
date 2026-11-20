import { MediaResolution, ThinkingLevel } from '@google/genai';
import { getGeminiClient, getGeminiModelChain } from './geminiClient';
import { callOpenRouterModel, isOpenRouterConfigured } from './openRouterClient';

/**
 * Pide una respuesta JSON a la IA con varios modelos en carrera. La función
 * serverless de las rutas vive 60 s y Gemini a veces tarda o está saturado
 * (503), así que los modelos de la cadena de la app arrancan escalonados: el
 * principal al inicio, el siguiente a los pocos segundos y así sucesivamente.
 * Si se envía un texto de respaldo (solo cuando no hay imágenes ni PDF, que un
 * modelo de solo texto no puede leer), OpenRouter entra también a la carrera.
 * Gana la primera respuesta válida. Si ninguna llega, devuelve data null y el
 * motivo; quien llama decide el texto de respaldo.
 */

const TOTAL_BUDGET_MS = 50000;
const MIN_ATTEMPT_MS = 6000;
const STAGGER_MS = 8000;
const OPENROUTER_START_MS = 12000;
const NOT_STARTED = 'no iniciado';

export interface TextFallback {
  system: string;
  prompt: string;
}

export interface GeminiJsonResult {
  data: any | null;
  /** Por qué no hubo respuesta, cuando data es null. */
  motivo?: string;
}

interface Racer {
  startAfterMs: number;
  run: (timeoutMs: number) => Promise<any | null>;
}

/** JSON de un texto de la IA, aunque venga dentro de un bloque de código o con texto alrededor. */
function parseJson(text: string | null | undefined): any | null {
  if (!text) return null;
  const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
  for (const candidate of [cleaned, cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1)]) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* se prueba el siguiente candidato */
    }
  }
  return null;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Gemini no respondió en ${Math.round(ms / 1000)} s.`)), ms);
    promise.then(
      value => { clearTimeout(timer); resolve(value); },
      err => { clearTimeout(timer); reject(err); }
    );
  });
}

/** Fotos en resolución baja y poco razonamiento interno: redactar texto no requiere más y reduce la espera. */
async function callGemini(model: string, contents: any[], timeoutMs: number, thinkingLevel: ThinkingLevel) {
  const response = await withTimeout(
    getGeminiClient().models.generateContent({
      model,
      contents,
      config: { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel }, mediaResolution: MediaResolution.MEDIA_RESOLUTION_LOW }
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

function buildRacers(contents: any[], textFallback?: TextFallback): Racer[] {
  const racers: Racer[] = [];
  if (process.env.GEMINI_API_KEY) {
    getGeminiModelChain().forEach((model, i) =>
      racers.push({ startAfterMs: i * STAGGER_MS, run: ms => callGemini(model, contents, ms, i === 0 ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL) })
    );
  }
  if (textFallback && isOpenRouterConfigured()) {
    racers.push({ startAfterMs: OPENROUTER_START_MS, run: async ms => parseJson(await callOpenRouterModel(textFallback.system, textFallback.prompt, [], ms)) });
  }
  return racers;
}

export async function generateJsonWithFallback(contents: any[], isValid: (parsed: any) => boolean, label: string, textFallback?: TextFallback): Promise<GeminiJsonResult> {
  const racers = buildRacers(contents, textFallback);
  if (racers.length === 0) return { data: null, motivo: 'falta configurar la clave de Gemini en el servidor' };

  const deadlineAt = Date.now() + TOTAL_BUDGET_MS;
  let finished = false;
  const attempt = async (racer: Racer) => {
    await new Promise(resolve => setTimeout(resolve, racer.startAfterMs));
    const remainingMs = deadlineAt - Date.now();
    if (finished || remainingMs < MIN_ATTEMPT_MS) throw new Error(NOT_STARTED);
    const parsed = await racer.run(remainingMs);
    if (!parsed || !isValid(parsed)) throw new Error('la IA no devolvió el formato esperado');
    return parsed;
  };

  try {
    return { data: await Promise.any(racers.map(attempt)) };
  } catch (err) {
    const reasons = ((err as AggregateError).errors || []).filter((e: Error) => e?.message !== NOT_STARTED);
    reasons.forEach((e: Error) => console.warn(`⚠️ Error generando ${label} con IA:`, e?.message || e));
    return { data: null, motivo: describeGeminiFailure(reasons[0] || 'Gemini no respondió en el tiempo disponible') };
  } finally {
    finished = true;
  }
}
