import type { IncomingMessage, ServerResponse } from 'http';
import { createApiApp } from '../src/server/createApiApp';

/**
 * Entrypoint serverless de Vercel. Vercel no ejecuta un proceso Node
 * persistente (`app.listen`) — invoca este handler por cada request. La app
 * Express se construye una sola vez por instancia "caliente" (memoizada) y se
 * reutiliza entre invocaciones; solo se reconstruye en un cold start.
 *
 * Antes de este archivo, la app no tenía ningún handler serverless: sin
 * `vercel.json` ni carpeta `api/`, Vercel solo servía el build estático de
 * Vite y nunca ejecutaba `server.ts` — por eso ninguna ruta `/api/*`
 * respondía en producción y el frontend (que depende de ellas para listar
 * procesos y métricas del dashboard) se veía completamente vacío.
 */
let appPromise: ReturnType<typeof createApiApp> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = createApiApp();
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  app(req as any, res as any);
}
