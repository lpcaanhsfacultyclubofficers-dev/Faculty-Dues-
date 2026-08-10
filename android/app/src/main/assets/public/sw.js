const CACHE_NAME = 'faculty-dues-assets-v1';
const PRE_CACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/icon-192-v2.png',
  '/icon-512-v2.png',
  '/apple-touch-icon.png'
];

// Install Event: pre-cache critical shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRE_CACHE_RESOURCES).catch((err) => {
        console.warn("Pre-cache failed for some assets (this is normal in development):", err);
      });
    })
  );
});

// Activate Event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log('Service Worker: clearing old cache', cache);
              return caches.delete(cache);
            }
          })
        );
      })
    ])
  );
});

// Fetch Event: Intelligent offline handler for assets and pages
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Bypass chrome-extension files, internal APIs, and firebase traffic
  if (
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'safari-extension:' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // Strategy 1: Network-First for HTML/document requests (always fetch fresh, fallback to cache)
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Put clone into the cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline fallback
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return caches.match('/index.html') || caches.match('/');
          });
        })
    );
    return;
  }

  // Strategy 2: Stale-While-Revalidate for application assets (JS, CSS, images, etc.)
  const isAsset = 
    url.pathname.includes('/assets/') || 
    url.pathname.endsWith('.js') || 
    url.pathname.endsWith('.css') || 
    url.pathname.endsWith('.svg') || 
    url.pathname.endsWith('.png') || 
    url.pathname.endsWith('.jpg') || 
    url.pathname.endsWith('.jpeg') || 
    url.pathname.endsWith('.ico') || 
    url.pathname.endsWith('.woff') || 
    url.pathname.endsWith('.woff2') ||
    url.hostname.includes('unpkg.com'); // CDN dependencies

  if (isAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Silently swallow fetch errors in background (already offline, served cached asset)
          });
          
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }
});

// Push & Notification Click Handlers (Preserved from original sw.js)
self.addEventListener('push', function(event) {
  let title = 'Faculty Club Notification';
  let body = 'You have a new announcement.';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.message || body;
    } catch (e) {
      body = event.data.text() || body;
    }
  }

  const options = {
    body: body,
    icon: '/vite.svg',
    tag: 'faculty-club-announcement-' + Date.now(),
    vibrate: [200, 100, 200, 100, 200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
