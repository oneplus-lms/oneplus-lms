// LabFlow Service Worker — v21.00
const CACHE_NAME = 'labflow-v21.12';

const PRECACHE = [
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/doctors.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache core files — doctors.json may not exist yet, don't fail if missing
      return cache.addAll([
        '/index.html',
        '/manifest.json',
        '/icon-192.png',
        '/icon-512.png',
      ]).then(() => {
        // Cache doctors.json separately — optional, won't block install
        return cache.add('/doctors.json').catch(() => {
          console.log('SW: doctors.json not yet available — will cache on first fetch');
        });
      });
    })
    // skipWaiting intentionally removed — update flow is message-based (SKIP_WAITING)
    // The app sends it from updatefound handler (safe screens) or user taps "Update now".
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('gstatic.com')) return;
  if (url.hostname.includes('firebaseio.com')) return;

  // Network first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Listen for skip waiting message from app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting().then(() => self.clients.claim());
  }
});
