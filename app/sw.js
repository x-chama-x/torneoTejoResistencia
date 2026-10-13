// =====================================================
// SERVICE WORKER - App de carga de partidos
// =====================================================
// Cachea el "shell" de la app (HTML, JS, íconos) para que abra
// rápido y funcione aunque el celular esté con mala señal.
//
// IMPORTANTE: nunca cachea los requests al endpoint /api/, porque
// esos tienen que llegar sí o sí a GitHub. Si no hay internet, el
// request falla y la app te deja el partido en la lista para
// reintentarlo cuando vuelva la señal.
// =====================================================

const CACHE = 'tejo-cargar-v2';
const SHELL = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE)
            .then(c => c.addAll(SHELL))
            .then(() => self.skipWaiting())
            .catch(() => self.skipWaiting()) // si falla el precache, la app igual funciona online
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // El endpoint de carga y la lista de partidos siempre van a la red.
    if (url.pathname.startsWith('/api/') || url.pathname.endsWith('enfrentamientos_directos.txt')) {
        return;
    }

    if (event.request.method !== 'GET') return;

    // Red primero, cache como respaldo (así siempre tenés la última versión de la app).
    event.respondWith(
        fetch(event.request)
            .then(res => {
                const copia = res.clone();
                caches.open(CACHE).then(c => c.put(event.request, copia)).catch(() => {});
                return res;
            })
            .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
    );
});
