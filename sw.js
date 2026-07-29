// LabFlow Service Worker — labflow-v21.66
const CACHE_NAME = 'labflow-v21.66';

// v21.62: these were '/oneplus-lms/icon-192.png' but the real files are
// icon192.png / icon512.png (no hyphen). cache.addAll() rejects atomically on
// any single 404, so the whole precache silently failed on every install —
// the .catch(() => {}) swallowed it.
const PRECACHE = [
  '/oneplus-lms/manifest.json',
  '/oneplus-lms/icon192.png',
  '/oneplus-lms/icon512.png',
];

// Static data that never changes within a release. catalogue/panels/
// preanalytical are fetched with an APP_VERSION cache-bust query, and
// CACHE_NAME is bumped every release and old caches purged on activate — so
// serving these cache-first can never go stale across a deploy.
const STATIC_RE = /\.(json|png|jpg|jpeg|svg|ico|webp)$/i;

self.addEventListener('install', event => {
  // skipWaiting here is INTENTIONAL and PERMANENT for this app.
  // The message-based approach cannot work because the old SW serves the old
  // index.html from cache — the new index.html (which sends SKIP_WAITING) never
  // loads. skipWaiting in install is the only reliable way to force updates.
  // The controllerchange handler in index.html guards against mid-booking reloads.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // addAll is atomic — use individual puts so one missing icon can't
      // wipe out the whole precache the way it did before v21.62.
      Promise.all(PRECACHE.map(u =>
        cache.add(u).catch(err => console.warn('[SW] precache miss:', u, err))
      ))
    )
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

  // v21.62 — CACHE FIRST for static data (catalogue 150KB, panels 123KB,
  // preanalytical 59KB, doctors 754KB, icons). These were previously
  // network-first, so every single app load re-downloaded ~330KB (and 754KB
  // more once doctor search warmed) even though the bytes were already on
  // disk. The cache was only ever an offline fallback and never made the app
  // faster. Serving these from cache is the main startup win.
  if (STATIC_RE.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(hit => {
          if (hit) return hit;
          return fetch(event.request).then(res => {
            if (res && res.ok) cache.put(event.request, res.clone());
            return res;
          });
        })
      ).catch(() => fetch(event.request))
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
