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
      .catch(() =>
        caches.match(event.request).then((cached) => cached || Response.error())
      )
  );
});

// Notificaciones push: el payload lo arma sendPushForCircular() en el
// servidor (src/lib/pushSubscriptionsStore.ts) como { title, body, url }.
self.addEventListener('push', (event) => {
  let data = { title: 'Control de Calidad Alco', body: 'Hay una publicación nueva.', url: '/' };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Si el payload no es JSON válido, se usa el mensaje genérico de arriba.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      data: { url: data.url || '/' }
    })
  );
});

// Al tocar la notificación: si ya hay una pestaña de la app abierta, la
// enfoca y la navega ahí; si no, abre una nueva.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
