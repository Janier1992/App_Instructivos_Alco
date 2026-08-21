import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Control de Calidad Alco S.A.S.',
    short_name: 'Calidad Alco',
    description: 'Consulta de estándares de calidad, autonomía y documentación por proceso de planta — Alco Windows & Doors.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#f1f5f9',
    theme_color: '#003366',
    icons: [
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
    ]
  };
}
