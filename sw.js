const CACHE_VERSION = 'teleradio-static-v6';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/js/app.js',
  '/js/config.js',
  '/js/configModal.js',
  '/js/pwa.js',
  '/js/router.js',
  '/js/utils.js',
  '/js/whatsapp.js',
  '/js/deliveryModal.js',
  '/js/globalSearchModal.js',
  '/js/domain/orden.js',
  '/js/domain/equipos.js',
  '/js/auth/index.js',
  '/js/auth/authorization.js',
  '/js/auth/lockView.js',
  '/js/services/authStore.js',
  '/js/services/supabaseClient.js',
  '/js/services/ordenesService.js',
  '/js/services/tecnicosService.js',
  '/js/services/clientesService.js',
  '/js/services/realtime.js',
  '/js/services/demoStore.js',
  '/js/services/network.js',
  '/js/views/newOrder.js',
  '/js/views/newOrderTemplate.js',
  '/js/views/newOrderConfirmModal.js',
  '/js/views/returningClientBox.js',
  '/js/views/pendingBoard.js',
  '/js/views/pendingCard.js',
  '/js/views/addTechnicianModal.js',
  '/js/views/activeOrders.js',
  '/js/views/activeOrderCard.js',
  '/js/views/costModal.js',
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
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((oldKey) => caches.delete(oldKey)))
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
  if (url.origin !== self.location.origin) return;

  if (url.pathname === '/env.js' || url.pathname === '/sw.js') {
    event.respondWith(networkFirst(request, { cacheResponse: false }));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, { fallbackToIndex: true, cacheResponse: true }));
    return;
  }
  if (url.pathname.startsWith('/icons/')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
  event.respondWith(networkFirst(request, { cacheResponse: true }));
});
