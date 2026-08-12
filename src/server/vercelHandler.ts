import type { IncomingMessage, ServerResponse } from 'http';
import { createApiApp } from './createApiApp';

/**
 * Fuente del handler serverless de Vercel. Este archivo NO se despliega tal
 * cual — `vercel.json` lo empaqueta con esbuild (mismo enfoque ya usado para
 * `dist/server.cjs`) en un único `api/index.js` autocontenido, sin imports
 * relativos sin resolver.
 *
 * Por qué el empaquetado es obligatorio y no opcional: Vercel transpila cada
 * archivo `api/*.ts` de forma independiente (no los agrupa), y el resolver
 * ESM nativo de Node exige que los imports relativos incluyan la extensión
 * de archivo (`./createApiApp.js`, no `./createApiApp`) — algo que
 * TypeScript permite omitir pero Node en producción no. Sin empaquetar, cada
 * request fallaba con `ERR_MODULE_NOT_FOUND` antes de llegar a cualquier
 * ruta, dejando el frontend completamente en blanco.
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
