// Los modelos gratuitos de OpenRouter pueden congestionarse en horas pico.
// Se corta la espera pasado este tiempo para no dejar al usuario esperando
// y pasar de inmediato al respaldo determinístico.
// Los modelos gratuitos anteriores (openai/gpt-oss-20b:free, luego
// nvidia/nemotron-3-nano-30b-a3b:free) quedaron descontinuados por OpenRouter.
// Con el respaldo vigente (nvidia/nemotron-3-super-120b-a12b:free) se midió
// en vivo 10-16s bajo el contexto RAG completo real de esta app — se deja
// margen extra para no cortarlo a mitad de generación en horas de más carga.
const OPENROUTER_TIMEOUT_MS = 22000;

/**
 * Cliente para OpenRouter (https://openrouter.ai) — API compatible con OpenAI,
 * usado como respaldo con IA real cuando Gemini no está disponible (cuota
 * agotada, error de red, etc.). Modelo configurable vía OPENROUTER_MODEL;
 * por defecto uno gratuito ("):free") de buen desempeño general.
 */
export async function callOpenRouterModel(
  systemInstruction: string,
  userPrompt: string,
  historyMessages: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL || 'openai/gpt-oss-20b:free';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

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
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemInstruction },
          ...historyMessages,
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.1
      })
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`⚠️ OpenRouter respondió ${res.status}: ${errText.slice(0, 300)}`);
      return null;
    }

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === 'string' && text.trim() ? text : null;
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn(`⚠️ OpenRouter (${model}) tardó más de ${OPENROUTER_TIMEOUT_MS / 1000}s, se cancela y se usa el respaldo determinístico.`);
    } else {
      console.warn('⚠️ Error de red llamando a OpenRouter:', err?.message || err);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}
