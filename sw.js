const CACHE_NAME = 'asia-trip-v13-routes';
const OFFLINE_URL = '/asia-trip-planner/';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/asia-trip-planner/',
  '/asia-trip-planner/index.html',
  '/asia-trip-planner/manifest.json',
  '/asia-trip-planner/icons/icon-192.png',
  '/asia-trip-planner/icons/icon-512.png'
];

// External assets to cache on first use
const RUNTIME_CACHE_URLS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Firebase requests (need fresh data)
  if (url.hostname.includes('firebase') || url.hostname.includes('gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          return cachedResponse;
        }

        // Not in cache - fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses for runtime assets
            if (networkResponse && networkResponse.status === 200) {
              const shouldCache = RUNTIME_CACHE_URLS.some(cacheUrl =>
                request.url.includes(cacheUrl) || request.url.startsWith(self.location.origin)
              );

              if (shouldCache) {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, responseClone);
                });
              }
            }
            return networkResponse;
          })
          .catch(() => {
            // Network failed - return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
