const CACHE_VERSION = 'teleradio-static-v3';

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

function isDynamicRequest(request, url) {
  if (url.pathname === '/env.js') return true;
  if (url.hostname.endsWith('.supabase.co')) return true;
  if (url.hostname.endsWith('.supabase.in')) return true;
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/realtime/')) return true;
  if (request.mode === 'navigate') return true;
  return false;
}

async function networkFirst(request, { fallbackToIndex = false } = {}) {
  try {
    return await fetch(request);
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

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type !== 'opaque') {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await networkPromise);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Datos dinámicos (Supabase, /env.js, navegaciones): siempre Network-First
  if (isDynamicRequest(request, url)) {
    event.respondWith(
      networkFirst(request, { fallbackToIndex: request.mode === 'navigate' })
    );
    return;
  }

  // Assets estáticos locales y fuentes: Stale-While-Revalidate
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticAsset =
    isSameOrigin ||
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com' ||
    url.hostname === 'cdn.tailwindcss.com';

  if (isStaticAsset) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

