// ============================================
// SERVICE WORKER — PWA offline + caché por perfil
//
// Responsabilidades:
//   - Cachear recursos estáticos en instalación (STATIC_CACHE)
//   - Cachear recursos de runtime por perfil activo (runtime cache por slug)
//   - Limpiar caches de versiones anteriores en activación
//   - Notificar a los clientes cuando hay una nueva versión lista
//   - Recibir mensajes desde la app: SET_PERFIL_CACHE, SKIP_WAITING
// ============================================

const APP_CACHE_VERSION = '4';
const STATIC_CACHE = `cache-perfil-global-v${APP_CACHE_VERSION}`;

let runtimeSlug = 'default';

function nombreRuntimeCache() {
    const slug = (runtimeSlug || 'default').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48);
    return `cache-perfil-${slug}-v${APP_CACHE_VERSION}`;
}

const STATIC_CACHE_URLS = [
    './',
    './index.html',
    './estilos.css',
    './app.js',
    './perfilManager.js',
    './ingresos.js',
    './gastos.js',
    './reportes.js',
    './exportaciones.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',
    'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    'https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.min.js'
];

// Patrón que identifica todos los caches de versiones anteriores de esta app
const CACHE_PREFIX_PROPIO = 'cache-perfil-';
const CACHE_LEGACY_PATTERN = /^contabilidad(-runtime)?-v\d+$/;

self.addEventListener('message', (event) => {
    const d = event.data;
    if (!d) return;

    if (d.type === 'SET_PERFIL_CACHE' && typeof d.slug === 'string' && d.slug.length > 0) {
        runtimeSlug = d.slug;
        return;
    }

    // La app envía SKIP_WAITING cuando el usuario acepta el banner de actualización
    if (d.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(STATIC_CACHE)
            .then((cache) =>
                Promise.allSettled(
                    STATIC_CACHE_URLS.map((url) =>
                        cache.add(url).catch(() => null)
                    )
                )
            )
        // No llamamos skipWaiting() aquí: esperamos que el usuario confirme
        // la actualización vía el banner. Solo si no hay clientes activos
        // el SW tomará control de inmediato.
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames.map((cacheName) => {
                        const esStaticActual = cacheName === STATIC_CACHE;
                        const esRuntimeActual = cacheName === nombreRuntimeCache();

                        if (esStaticActual || esRuntimeActual) {
                            return Promise.resolve();
                        }

                        // Eliminar caches propios de versiones anteriores y legados
                        const esPropioViejo = cacheName.startsWith(CACHE_PREFIX_PROPIO);
                        const esLegacy = CACHE_LEGACY_PATTERN.test(cacheName);

                        if (esPropioViejo || esLegacy) {
                            return caches.delete(cacheName);
                        }

                        return Promise.resolve();
                    })
                )
            )
            .then(() => self.clients.claim())
            .then(() => notificarClientes())
    );
});

// Notifica a todas las pestañas abiertas que hay una versión nueva activa
function notificarClientes() {
    return self.clients.matchAll({ type: 'window' }).then((clientes) => {
        clientes.forEach((cliente) => {
            cliente.postMessage({ type: 'SW_ACTUALIZADO', version: APP_CACHE_VERSION });
        });
    });
}

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }

    if (
        event.request.url.startsWith('chrome-extension://') ||
        event.request.url.startsWith('moz-extension://')
    ) {
        return;
    }

    const runtimeCache = nombreRuntimeCache();

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request)
                .then((response) => {
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    const responseToCache = response.clone();

                    caches.open(runtimeCache).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                    return response;
                })
                .catch(() => {
                    const accept = event.request.headers.get('accept');
                    if (accept && accept.includes('text/html')) {
                        return caches.match('./index.html');
                    }
                    throw new Error('offline');
                });
        })
    );
});
