
const CACHE_NAME = 'tetris-game-cache-v2';
const ASSET_CACHE_NAME = 'tetris-assets-cache-v2';

// Install: Cache the main shell of the app
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache the main entry points. These paths are typical for a Vite build.
      return cache.addAll([
        '/',
        '/index.html',
        '/favicon.ico'
        // Built assets with hashes are cached at runtime below
      ]);
    })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => {
          return name !== CACHE_NAME && name !== ASSET_CACHE_NAME;
        }).map(name => caches.delete(name))
      );
    })
  );
});

// Fetch: Serve from cache, fallback to network, and cache new assets
self.addEventListener('fetch', event => {
  const { request } = event;

  // For navigation requests, use a network-first strategy to ensure users get the latest HTML.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For other requests (assets), use a cache-first strategy
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then(networkResponse => {
        // Check for a valid response to cache
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            if(request.url.includes('supabase')) return networkResponse; // Don't cache opaque responses from supabase
        }

        // Cache assets like JS, CSS, images, fonts, and music
        if (request.url.match(/\.(css|js|png|jpg|jpeg|svg|ico|woff2|mp3)$/)) {
          const responseToCache = networkResponse.clone();
          caches.open(ASSET_CACHE_NAME).then(cache => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
