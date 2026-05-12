/* =====================================================
   Service Worker — Mary App
   Versión del cache: cámbiala cada vez que subas cambios
   a GitHub Pages para disparar el banner de actualización.
   ===================================================== */

const CACHE_VERSION = 'mary-v1.0.0'; // ← CAMBIA ESTO al subir cambios
const CACHE_NAME = CACHE_VERSION;

const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&family=Source+Sans+3:wght@400;500;600&display=swap',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap'
];

// ── Instalación: pre-cachea los assets principales ──
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando versión:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cachea los assets locales primero (ignoramos errores de fuentes externas)
      return cache.addAll(['./index.html', './manifest.json']).catch(() => {});
    })
  );
  // NO llamar skipWaiting() aquí — queremos que el usuario confirme la actualización
});

// ── Activación: borra caches viejos ──
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando versión:', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Borrando cache antiguo:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── Fetch: Network First con fallback a cache ──
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo interceptamos GET
  if (request.method !== 'GET') return;

  // Para navegación (HTML): network first, cache como fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Para otros assets: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});

// ── Mensaje desde la app para forzar activación inmediata ──
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Aplicando actualización...');
    self.skipWaiting();
  }
});
