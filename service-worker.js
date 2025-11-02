// ============================================
// SERVICE WORKER - PWA OFFLINE
// ============================================

const CACHE_NAME = 'contabilidad-v1';
const RUNTIME_CACHE = 'contabilidad-runtime-v1';

// Archivos a cachear en la instalación
const STATIC_CACHE_URLS = [
  './',
  './index.html',
  './estilos.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // CDNs externos
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

// Instalación: Cachear archivos estáticos
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Service Worker: Cacheando archivos estáticos');
        // Cachear archivos estáticos, ignorando errores de CDN
        return Promise.allSettled(
          STATIC_CACHE_URLS.map((url) => {
            return cache.add(url).catch((err) => {
              console.warn(`⚠️ No se pudo cachear ${url}:`, err);
              return null;
            });
          })
        );
      })
      .then(() => {
        // Forzar activación inmediata
        return self.skipWaiting();
      })
  );
});

// Activación: Limpiar caches antiguos
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activando...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
            })
            .map((cacheName) => {
              console.log('🗑️ Service Worker: Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Tomar control de todas las páginas
        return self.clients.claim();
      })
  );
});

// Estrategia: Cache First (Offline primero, Online si falla)
self.addEventListener('fetch', (event) => {
  // Solo cachear peticiones GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar peticiones a extensiones del navegador
  if (event.request.url.startsWith('chrome-extension://') ||
      event.request.url.startsWith('moz-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Si está en cache, devolverlo
        if (cachedResponse) {
          console.log('📦 Service Worker: Sirviendo desde cache:', event.request.url);
          return cachedResponse;
        }

        // Si no está en cache, intentar obtenerlo de la red
        return fetch(event.request)
          .then((response) => {
            // No cachear respuestas inválidas
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar la respuesta para cachearla
            const responseToCache = response.clone();

            // Cachear en runtime cache
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                console.log('💾 Service Worker: Cacheando respuesta de red:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.error('❌ Service Worker: Error de red:', error);
            // Si falla y es una página HTML, devolver index.html
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('./index.html');
            }
            // Para otros tipos, devolver error
            throw error;
          });
      })
  );
});

