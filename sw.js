// LabFlow Service Worker — v19.18
const CACHE_NAME = 'labflow-v19.18';

const PRECACHE = [
  '/oneplus-lms/index.html',
  '/oneplus-lms/manifest.json',
  '/oneplus-lms/icon-192.png',
  '/oneplus-lms/icon-512.png',
  '/oneplus-lms/catalogue.json',
  '/oneplus-lms/panels.json',
  '/oneplus-lms/preanalytical.json',
];

const CDN_CACHE = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Pass through all non-GET
  if (event.request.method !== 'GET') return;

  // Pass through ALL Google/Firebase API calls — never intercept these
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('firebaseio.com')) return;
  if (url.hostname.includes('firebase.com')) return;

  const isCDN = CDN_CACHE.some(u => event.request.url.startsWith(u));

  if (isCDN) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
  } else {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});
