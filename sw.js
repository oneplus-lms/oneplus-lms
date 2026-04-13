// LabFlow Service Worker — minimal
// Cache name must change to force update on all devices
const CACHE_NAME = 'labflow-v20';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// No caching — pure network. App works fine without SW cache.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).hostname.includes('googleapis.com')) return;
  if (new URL(event.request.url).hostname.includes('gstatic.com')) return;
  if (new URL(event.request.url).hostname.includes('firebaseio.com')) return;
});
