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

const CACHE = 'tejo-cargar-v6';
const SHELL = [
    './',
    './index.html',
    './app.js',
    './torneo.js',
    './jornada.js',
    '../js/deportes.js',
    '../js/historial_torneos.js',
    '../lib/torneo-formatos.js',
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

// =====================================================
// Aviso del fin del reloj (partidos por tiempo)
// =====================================================
// La app le pasa la hora en que termina el partido; cuando llega, si la app
// no está a la vista (celu bloqueado, otra app), se muestra una notificación.
// El navegador puede cerrar el service worker si está mucho rato sin hacer
// nada; event.waitUntil le pide que lo mantenga vivo hasta el aviso, pero no
// hay garantía (por eso la app también programa el suyo).
let relojProgramado = null; // { finEn, timeout }

self.addEventListener('message', (event) => {
    const msg = event.data || {};
    if (msg.tipo === 'reloj-cancelar') {
        if (relojProgramado) clearTimeout(relojProgramado.timeout);
        relojProgramado = null;
        return;
    }
    if (msg.tipo !== 'reloj-programar' || !msg.finEn) return;

    if (relojProgramado) clearTimeout(relojProgramado.timeout);
    event.waitUntil(new Promise(resolve => {
        const timeout = setTimeout(async () => {
            const sigue = relojProgramado && relojProgramado.finEn === msg.finEn;
            relojProgramado = null;
            if (sigue) {
                const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
                const aLaVista = ventanas.some(c => c.visibilityState === 'visible');
                if (!aLaVista) {
                    await self.registration.showNotification(msg.titulo || '⏱️ ¡Tiempo!', {
                        body: msg.cuerpo || 'Terminó el partido.',
                        tag: 'reloj-partido',
                        icon: 'icon-192.png',
                        vibrate: [500, 200, 500, 200, 900],
                        requireInteraction: true
                    }).catch(() => {});
                }
            }
            resolve();
        }, Math.max(0, msg.finEn - Date.now()));
        relojProgramado = { finEn: msg.finEn, timeout };
    }));
});

// Tocar la notificación abre (o trae al frente) la app.
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil((async () => {
        const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const app = ventanas.find(c => new URL(c.url).pathname.includes('/app'));
        if (app) return app.focus();
        return self.clients.openWindow('./');
    })());
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // El endpoint de carga y los archivos de partidos (uno por deporte:
    // enfrentamientos_directos.txt, metegol/partidos.txt) siempre van a la red.
    if (url.pathname.startsWith('/api/') || url.pathname.endsWith('.txt')) {
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
