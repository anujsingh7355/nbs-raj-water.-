const CACHE_NAME = 'nbs-aquaveda-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/animations.css',
  '/js/config.js',
  '/js/products.js',
  '/js/cart.js',
  '/js/checkout.js',
  '/js/orders.js',
  '/js/app.js',
  '/assets/logo.svg',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

// Install: Cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Pre-cache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Network-first for fresh updates, falling back to cache
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET requests and http/https scheme
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        // Cache successful responses for GET
        if (networkRes && networkRes.status === 200) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, resClone);
          });
        }
        return networkRes;
      })
      .catch(() => {
        return caches.match(req).then((cachedRes) => {
          if (cachedRes) return cachedRes;
          // If HTML page request failed and no cache, fallback to index.html
          if (req.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
          }
        });
      })
  );
});
