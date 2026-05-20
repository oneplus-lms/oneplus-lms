// LabFlow Service Worker — labflow-v21.37
const CACHE_NAME = 'labflow-v21.37';

const PRECACHE = [
  '/oneplus-lms/manifest.json',
  '/oneplus-lms/icon-192.png',
  '/oneplus-lms/icon-512.png',
];

self.addEventListener('install', event => {
  // skipWaiting here is INTENTIONAL and PERMANENT for this app.
  // The message-based approach cannot work because the old SW serves the old
  // index.html from cache — the new index.html (which sends SKIP_WAITING) never
  // loads. skipWaiting in install is the only reliable way to force updates.
  // The controllerchange handler in index.html guards against mid-booking reloads.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE).catch(() => {});
    })
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
  // Never intercept Firebase/Google requests
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('gstatic.com')) return;
  if (url.hostname.includes('firebaseio.com')) return;
  if (url.hostname.includes('firebaseapp.com')) return;

  // index.html — always network first, no cache fallback
  // This ensures the app shell is always fresh after a SW update
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else — network first, cache fallback
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

// Listen for skip waiting message from app (belt-and-suspenders)
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting().then(() => self.clients.claim());
  }
});
