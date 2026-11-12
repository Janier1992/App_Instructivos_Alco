/**
 * Límite de intentos en memoria por clave (IP). Best effort en serverless:
 * cada instancia lleva su propio contador.
 */
const WINDOW_MS = 15 * 60 * 1000;
const hits = new Map<string, { count: number; firstAt: number }>();

/** Registra un intento y devuelve true si la clave superó el máximo en la ventana. */
export function isRateLimited(key: string, maxAttempts: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    hits.set(key, { count: 1, firstAt: now });
    return false;
  }
  entry.count += 1;
  return entry.count > maxAttempts;
}

export function getClientKey(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}
