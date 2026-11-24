// =====================================================
// API: Contador de visitas
// =====================================================
// Cuenta las visitas al sitio para el contador del menú lateral
// (js/menu.js). Se cuenta una por pestaña: navegar entre páginas o
// recargar no suma de nuevo.
//
//   GET  /api/visitas  -> { visitas: N }   solo lee el total
//   POST /api/visitas  -> { visitas: N }   suma una y devuelve el total
//
// El número vive en una base Redis (como la que usaban las encuestas) y
// no en el repo: guardarlo con un commit por visita dispararía un deploy
// de Vercel en cada visita. INCR suma de a uno sin pisarse aunque entren
// dos al mismo tiempo.
//
// Variable de entorno: REDIS_URL, que Vercel agrega sola al conectar una
// base Redis al proyecto (Storage / Marketplace). Sin ella responde
// { visitas: null } y el menú no muestra el contador.
// =====================================================

import { createClient } from 'redis';

const CLAVE = 'visitas:sitio';

// La conexión se reusa mientras la función siga "caliente"
let cliente = null;

async function conectar() {
    if (cliente && cliente.isReady) return cliente;
    cliente = createClient({
        url: process.env.REDIS_URL,
        // Si la base no responde, que falle rápido en vez de colgar la función
        socket: { connectTimeout: 4000, reconnectStrategy: false }
    });
    cliente.on('error', err => console.error('Redis (visitas):', err.message));
    await cliente.connect();
    return cliente;
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    if (!process.env.REDIS_URL) {
        return res.status(200).json({ visitas: null });
    }
    if (req.method !== 'GET' && req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Método no permitido' });
    }

    try {
        const redis = await conectar();
        const visitas = req.method === 'POST'
            ? await redis.incr(CLAVE)
            : Number(await redis.get(CLAVE)) || 0;
        return res.status(200).json({ visitas });
    } catch (error) {
        console.error('Error en api/visitas:', error);
        cliente = null;
        return res.status(500).json({ error: 'No se pudo leer el contador' });
    }
}
