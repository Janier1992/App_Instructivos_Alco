import 'dotenv/config';
import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createApiApp } from './src/server/createApiApp';

/**
 * Entrypoint para desarrollo local (`npm run dev`) y para hosting tradicional
 * con un proceso Node persistente (`npm start`, Render, Railway, un VPS,
 * etc.) — arranca la app de la API (`createApiApp`) y le agrega el frontend:
 * middlewares de Vite en dev, o los estáticos ya compilados en producción.
 *
 * Esto NO es lo que usa Vercel: Vercel no ejecuta un proceso persistente, así
 * que su entrypoint es `api/index.ts`, que importa `createApiApp` por
 * separado y la expone como función serverless.
 */
async function startServer() {
  const app = await createApiApp();
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Calidad Alco ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

startServer();
