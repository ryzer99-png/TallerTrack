const CACHE_VERSION = 'teleradio-static-v4';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/js/app.js',
  '/js/auth.js',
  '/js/config.js',
  '/js/pwa.js',
  '/js/utils.js',
  '/js/supabaseClient.js',
  '/js/ordersService.js',
  '/js/whatsapp.js',
  '/js/deliveryModal.js',
  '/js/globalSearchModal.js',
  '/js/views/newOrder.js',
  '/js/views/pendingBoard.js',
  '/js/views/activeOrders.js',
  '/js/views/deliveredOrders.js',
  '/js/views/publicOrder.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((oldKey) => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

  async function networkFirst(request, { fallbackToIndex = false, cacheResponse = false } = {}) {
    try {
      const response = await fetch(request);
      if (cacheResponse && response && response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_VERSION);
        cache.put(request, response.clone());
      }
      return response;
    } catch (err) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (fallbackToIndex) {
        const indexFallback = await caches.match('/index.html');
        if (indexFallback) return indexFallback;
      }
      throw err;
    }
  }

  async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);

    const networkFetch = fetch(request).then((response) => {
      if (response && response.ok && response.type === 'basic') {
        cache.put(request, response.clone());
      }
      return response;
    });

    if (cached) {
      networkFetch.catch(() => null);
      return cached;
    }

    return networkFetch;
  }

  self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

      // Dejar que CDNs externos (Tailwind, Google Fonts, jsdelivr, Supabase) pasen directo al navegador
      if (url.origin !== self.location.origin) return;

      // Nunca cachear credenciales ni el propio Service Worker
      if (url.pathname === '/env.js' || url.pathname === '/sw.js') {
        event.respondWith(networkFirst(request, { cacheResponse: false }));
        return;
      }

      // Navegaciones HTML: Network-First con respaldo offline
      if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, { fallbackToIndex: true, cacheResponse: true }));
        return;
      }

        // Iconos: Stale-While-Revalidate
        if (url.pathname.startsWith('/icons/')) {
          event.respondWith(staleWhileRevalidate(request));
          return;
        }

        // Resto de assets propios (CSS, JS, manifest, HTML): Network-First para evitar desfase de versiones
        event.respondWith(networkFirst(request, { cacheResponse: true }));
      });
