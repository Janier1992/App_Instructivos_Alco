// Los modelos gratuitos de OpenRouter pueden congestionarse en horas pico o ser
// retirados sin aviso (ya pasó con varios ":free"). Por eso OPENROUTER_MODEL
// acepta una lista separada por comas que se prueba en orden: si un modelo da
// 404 (retirado), 429 (saturado), error del servidor, timeout o respuesta
// vacía, se pasa al siguiente. Un 401/402 (clave inválida o sin saldo) afecta a
// todos los modelos, así que se corta de inmediato.
const OPENROUTER_TIMEOUT_MS = 22000;
// Tope por modelo cuando hay varios, para que uno colgado no consuma todo el presupuesto.
const PER_MODEL_TIMEOUT_MS = 11000;
const DEFAULT_MODELS = 'google/gemma-4-31b-it:free,google/gemma-4-26b-a4b-it:free,nvidia/nemotron-3.5-lightning:free,nvidia/nemotron-3-ultra-550b-a55b:free';

// Un modelo que responde 404 se omite un rato para no sumar una llamada inútil por pregunta.
const MODEL_UNAVAILABLE_COOLDOWN_MS = 30 * 60 * 1000;
const modelDisabledUntilMs = new Map<string, number>();

type AttemptResult =
  | { kind: 'ok'; text: string }
  | { kind: 'next'; status?: number; reason: string }
  | { kind: 'stop'; status: number; reason: string };

export function getOpenRouterModels(): string[] {
  return (process.env.OPENROUTER_MODEL || DEFAULT_MODELS)
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);
}

function explainStatus(status: number): string {
  if (status === 401) return 'La clave fue rechazada (inválida o eliminada).';
  if (status === 402) return 'Sin saldo: el modelo requiere créditos en OpenRouter.';
  if (status === 404) return 'El modelo no existe o fue retirado.';
  if (status === 429) return 'Modelo saturado o límite de solicitudes alcanzado.';
  return 'OpenRouter devolvió un error.';
}

async function attemptModel(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  timeoutMs: number,
  maxTokens?: number,
  /** En la prueba, un 200 sin texto (modelo de razonamiento sin tokens) cuenta como éxito. */
  acceptEmpty = false
): Promise<AttemptResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'Control de Calidad Alco S.A.S.'
      },
      body: JSON.stringify({ model, messages, temperature: 0.1, ...(maxTokens ? { max_tokens: maxTokens } : {}) })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`⚠️ OpenRouter (${model}) respondió ${res.status}: ${errText.slice(0, 300)}`);
      if (res.status === 401 || res.status === 402) return { kind: 'stop', status: res.status, reason: explainStatus(res.status) };
      if (res.status === 404) modelDisabledUntilMs.set(model, Date.now() + MODEL_UNAVAILABLE_COOLDOWN_MS);
      return { kind: 'next', status: res.status, reason: explainStatus(res.status) };
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text === 'string' && text.trim()) return { kind: 'ok', text };
    if (acceptEmpty) return { kind: 'ok', text: '' };
    return { kind: 'next', status: res.status, reason: 'El modelo respondió vacío.' };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn(`⚠️ OpenRouter (${model}) tardó más de ${timeoutMs / 1000}s.`);
      return { kind: 'next', reason: `No respondió en ${timeoutMs / 1000} s.` };
    }
    console.warn('⚠️ Error de red llamando a OpenRouter:', err?.message || err);
    return { kind: 'next', reason: 'Error de red llamando a OpenRouter.' };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Cliente para OpenRouter (https://openrouter.ai) — API compatible con OpenAI,
 * usado como respaldo con IA real cuando Gemini no está disponible. Prueba en
 * orden los modelos de OPENROUTER_MODEL (lista separada por comas).
 */
export async function callOpenRouterModel(
  systemInstruction: string,
  userPrompt: string,
  historyMessages: { role: 'user' | 'assistant'; content: string }[] = [],
  /** Tope de espera total (lo que quede del presupuesto de la consulta). */
  maxWaitMs: number = OPENROUTER_TIMEOUT_MS
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const messages = [
    { role: 'system', content: systemInstruction },
    ...historyMessages,
    { role: 'user', content: userPrompt }
  ];
  const models = getOpenRouterModels().filter(m => Date.now() >= (modelDisabledUntilMs.get(m) ?? 0));
  const deadline = Date.now() + Math.min(OPENROUTER_TIMEOUT_MS, maxWaitMs);

  for (let i = 0; i < models.length; i++) {
    const remaining = deadline - Date.now();
    if (remaining < 1500) break;
    const timeoutMs = models.length > 1 && i < models.length - 1 ? Math.min(PER_MODEL_TIMEOUT_MS, remaining) : remaining;
    const result = await attemptModel(apiKey, models[i], messages, timeoutMs);
    if (result.kind === 'ok') return result.text;
    if (result.kind === 'stop') return null;
  }
  return null;
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export interface OpenRouterModelTest {
  model: string;
  ok: boolean;
  status?: number;
  detail: string;
}

/**
 * Prueba real (8 tokens de salida como máximo) de cada modelo configurado, para
 * verificar clave y modelos. Nunca devuelve la clave.
 */
export async function testOpenRouterConnection(): Promise<{ ok: boolean; models: OpenRouterModelTest[]; detail: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { ok: false, models: [], detail: 'OPENROUTER_API_KEY no está configurada.' };

  // En paralelo para no pasar el límite de tiempo de la función serverless.
  const models: OpenRouterModelTest[] = await Promise.all(
    getOpenRouterModels().map(async (model): Promise<OpenRouterModelTest> => {
      const r = await attemptModel(apiKey, model, [{ role: 'user', content: 'Responde: ok' }], 15000, 8, true);
      return r.kind === 'ok'
        ? { model, ok: true, detail: 'Funciona correctamente.' }
        : { model, ok: false, status: r.status, detail: r.reason };
    })
  );
  const working = models.filter(m => m.ok).length;
  return {
    ok: working > 0,
    models,
    detail: working > 0 ? `${working} de ${models.length} modelos responden.` : 'Ningún modelo respondió.'
  };
}
