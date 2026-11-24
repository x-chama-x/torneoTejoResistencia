// =====================================================
// API: Contador de visitas
// =====================================================
// Cuenta cuántas personas distintas entraron al sitio en el mes, para el
// "Contador de visitas: N" del menú lateral (js/menu.js).
//
//   GET  /api/visitas  -> { visitas: N, mes: 'AAAA-MM' }  solo lee
//   POST /api/visitas  -> { visitas: N, mes: 'AAAA-MM' }  anota al que entra
//                                                        y devuelve el total
//
// Se cuenta por IP: cada una suma una sola vez en el mes, por más que
// recargue, cambie de página o vuelva otro día. Cada mes tiene su propio
// conjunto en Redis (visitas:ips:2026-11, visitas:ips:2026-12, ...): el 1°
// de cada mes (hora argentina) se empieza a anotar en uno nuevo y vacío,
// así que el contador vuelve a cero solo. Los meses viejos se borran solos.
//
// Una IP no es exactamente una persona: los que comparten el wifi de una
// casa cuentan como una, y alguien que entra con datos y después con wifi
// cuenta como dos.
//
// No se guarda la IP tal cual sino una huella (SHA-256): alcanza para saber
// si esa IP ya entró en el mes, sin dejar la dirección escrita en la base.
//
// El número vive en Redis y no en el repo: guardarlo con un commit por
// visita dispararía un deploy de Vercel en cada visita.
//
// Variable de entorno: REDIS_URL, que Vercel agrega sola al conectar una
// base Redis al proyecto (Storage / Marketplace). Sin ella responde
// { visitas: null } y el menú no muestra el contador.
// =====================================================

import { createClient } from 'redis';
import { createHash } from 'node:crypto';

// Cuánto vive el conjunto de un mes: 45 días desde la última visita, así
// que se borra solo durante el mes siguiente
const VIDA_DEL_MES = 45 * 24 * 60 * 60; // en segundos

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

// Mes actual en hora argentina (UTC-3, sin horario de verano): 'AAAA-MM'
function mesActual() {
    return new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 7);
}

// IP del que entra. En Vercel la pone la plataforma en x-forwarded-for (y
// pisa lo que mande el navegador, así que no se puede falsear).
function ipDe(req) {
    const reenviada = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return reenviada || String(req.headers['x-real-ip'] || '').trim() ||
        (req.socket && req.socket.remoteAddress) || '';
}

// En IPv6 el mismo celular o compu va cambiando el final de su dirección
// cada tanto (por privacidad), y contaría varias veces en el mes. Lo que
// queda fijo es la primera mitad (el /64), que es la de su conexión: se
// cuenta por esa mitad. Las IPv4 quedan como están.
function normalizarIp(ip) {
    ip = ip.trim().toLowerCase();
    if (ip.startsWith('::ffff:') && ip.includes('.')) ip = ip.slice(7); // IPv4 escrita como IPv6
    if (!ip.includes(':')) return ip;
    const [izq, der = ''] = ip.split('::');
    const a = izq ? izq.split(':') : [];
    const b = der ? der.split(':') : [];
    const grupos = ip.includes('::')
        ? [...a, ...Array(Math.max(0, 8 - a.length - b.length)).fill('0'), ...b]
        : a;
    return grupos.slice(0, 4).map(g => (parseInt(g, 16) || 0).toString(16)).join(':') + '::/64';
}

function huella(ip) {
    return createHash('sha256').update(normalizarIp(ip) || 'sin-ip').digest('hex').slice(0, 32);
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

    const mes = mesActual();
    const clave = `visitas:ips:${mes}`;
    try {
        const redis = await conectar();
        let visitas;
        if (req.method === 'POST') {
            // Anotarla (si ya estaba no suma), contar y renovar el vencimiento
            const [, total] = await redis.multi()
                .sAdd(clave, huella(ipDe(req)))
                .sCard(clave)
                .expire(clave, VIDA_DEL_MES)
                .exec();
            visitas = Number(total);
        } else {
            visitas = Number(await redis.sCard(clave)) || 0;
        }
        return res.status(200).json({ visitas, mes });
    } catch (error) {
        console.error('Error en api/visitas:', error);
        cliente = null;
        return res.status(500).json({ error: 'No se pudo leer el contador' });
    }
}
