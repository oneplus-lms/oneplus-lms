// LabFlow Service Worker — OnePLUS Ultrasound Lab
// Caches the app shell for offline loading
// Version: bump this string to force cache refresh on deploy
var CACHE_NAME = 'labflow-v3';

var APP_SHELL = [
  '/oneplus-lms/',
  '/oneplus-lms/index.html',
  '/oneplus-lms/manifest.json',
  '/oneplus-lms/icon-192.png',
  '/oneplus-lms/icon-512.png',
  // Google Fonts
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&family=DM+Mono&display=swap',
  // Firebase SDK — cache so app loads offline
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  // PDF.js
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  // jsPDF
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];

// Install — cache all app shell resources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cache what we can — don't fail install if some CDN resources miss
      return Promise.allSettled(
        APP_SHELL.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('SW: failed to cache', url, err);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting(); // activate immediately
    })
  );
});

// Activate — clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim(); // take control immediately
    })
  );
});

// Fetch — cache-first for app shell, network-first for Firebase API calls
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Never intercept Firebase Auth/Firestore API calls — always network
  if (url.includes('firestore.googleapis.com') ||
      url.includes('identitytoolkit.googleapis.com') ||
      url.includes('securetoken.googleapis.com') ||
      url.includes('firebase.googleapis.com')) {
    return; // let browser handle natively
  }

  // For everything else: cache-first, fall back to network
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        // Cache successful GET responses
        if (event.request.method === 'GET' && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Network failed and not in cache — for navigation requests return index.html
        if (event.request.mode === 'navigate') {
          return caches.match('/oneplus-lms/index.html');
        }
      });
    })
  );
});
