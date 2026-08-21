// Service worker mínimo: habilita que el navegador ofrezca instalar la app
// (requisito técnico de Chrome/Edge para el evento "beforeinstallprompt") y
// da una resiliencia básica sin conexión — red primero, y si falla, lo
// último que se haya visto en caché.
const CACHE_NAME = 'alco-calidad-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo GET, y solo del mismo origen — no interceptar llamadas a APIs
  // externas (Supabase, Gemini, etc.) ni mutaciones.
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
