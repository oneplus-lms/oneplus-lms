// OnePLUS LMS — Service Worker
// Caches the app shell for offline use

const CACHE = 'oneplus-lms-v1';
const ASSETS = [
  '/oneplus-lms/',
  '/oneplus-lms/index.html',
  '/oneplus-lms/manifest.json',
  '/oneplus-lms/icon-192.png',
  '/oneplus-lms/icon-512.png',
];

// Install — cache all core assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first for app shell, network-first for Firebase/external
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always go network for Firebase, Google Fonts, external APIs
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('wa.me') ||
    url.hostname.includes('cdnjs')
  ) {
    return; // let browser handle normally
  }

  // Cache-first for everything else (app shell)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        // Cache successful GET responses
        if (e.request.method === 'GET' && response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback — return cached index
        if (e.request.destination === 'document') {
          return caches.match('/oneplus-lms/index.html');
        }
      });
    })
  );
});
