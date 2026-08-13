import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // pdf-parse (y su dependencia @napi-rs/canvas) necesitan quedar fuera del
  // bundle de servidor: si Next.js los empaqueta, pdfjs-dist no encuentra su
  // archivo de worker ("Setting up fake worker failed") y en Vercel además
  // falla con "DOMMatrix is not defined". Al quedar como paquetes externos,
  // se resuelven en tiempo de ejecución directo desde node_modules, igual
  // que cualquier otra dependencia de Node.
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas']
};

export default nextConfig;
