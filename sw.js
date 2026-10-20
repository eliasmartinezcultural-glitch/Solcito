/* Solcito: motor de actualización y caché offline. Versión identificable para evitar copias antiguas. */
const CACHE_PREFIX = 'solcito-shell-';
const CACHE_NAME = 'solcito-shell-v4';
const SHELL_URL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(SHELL_URL, { cache: 'reload' });
    if (!response.ok) throw new Error('No se pudo preparar Solcito para uso sin conexión.');
    await cache.put(SHELL_URL, response.clone());
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response && response.ok) await cache.put(SHELL_URL, response.clone());
        return response;
      } catch (_) {
        const saved = await cache.match(SHELL_URL);
        if (saved) return saved;
        return new Response(
          '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Solcito</title><body style="font:18px Arial;padding:24px"><h1>☀️ Solcito</h1><p>La agenda todavía no está guardada para usar sin conexión. Conectate una vez a internet y volvé a abrir esta página.</p></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
        );
      }
    })());
  }
});
