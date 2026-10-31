// =====================================================
// API: Jornadas de la Tejo Nations League
// =====================================================
// Una jornada es un día que el grupo se junta a jugar amistosos. Este
// endpoint guarda las que están abiertas, o sea las que todavía tienen
// partidos por jugar.
//
//   GET    /api/jornada   -> { jornadas: [...] }
//   PUT    /api/jornada   -> abre o actualiza { fecha, jugadores }
//   DELETE /api/jornada   -> cierra { fecha }
//
// Qué guarda y qué NO guarda, igual que con los torneos: acá va solo la
// FECHA y QUIÉNES VINIERON. Los cruces no se guardan, se deducen (son
// todos contra todos entre esos jugadores), y los resultados tampoco:
// viven en enfrentamientos_directos.txt, que sigue siendo la única
// fuente de verdad. La app cruza una cosa con la otra para saber qué
// falta jugar, así que se puede cerrar la app, cambiar de teléfono o
// seguir desde otro lado sin perder nada.
//
// Todas las jornadas abiertas entran en un solo archivo porque son
// cuatro datos: no vale la pena un archivo por jornada más un índice,
// como sí pasa con los torneos. El sitio es estático y no puede listar
// una carpeta, así que un único archivo también es lo más fácil de leer
// desde la página.
// =====================================================

import {
    getConfig,
    obtenerArchivoActual,
    commitearArchivo,
    errorHttp
} from '../lib/github.js';

const ARCHIVO = 'jornadas/index.json';

function parsearLista(contenido) {
    if (!contenido) return [];
    try {
        const parsed = JSON.parse(contenido);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return []; // archivo corrupto: se rehace
    }
}

// Las fechas se guardan como D/M/AAAA, igual que en el .txt.
function validarFecha(fecha) {
    if (typeof fecha !== 'string' || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha.trim())) {
        throw errorHttp(400, 'Fecha inválida: tiene que ser D/M/AAAA');
    }
    const [dia, mes, anio] = fecha.trim().split('/').map(n => parseInt(n, 10));
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12 || anio < 2000 || anio > 2100) {
        throw errorHttp(400, 'Fecha fuera de rango');
    }
    return fecha.trim();
}

function validarJugadores(jugadores) {
    if (!Array.isArray(jugadores)) {
        throw errorHttp(400, 'Faltan los jugadores de la jornada');
    }
    const limpios = jugadores.map(j => String(j || '').trim()).filter(Boolean);
    if (limpios.length < 2) {
        throw errorHttp(400, 'La jornada necesita al menos dos jugadores');
    }
    if (limpios.some(j => j.includes(','))) {
        throw errorHttp(400, 'Hay nombres de jugador inválidos (no pueden tener comas)');
    }
    if (new Set(limpios).size !== limpios.length) {
        throw errorHttp(400, 'Hay jugadores repetidos');
    }
    return limpios;
}

export default async function handler(req, res) {
    const config = getConfig();
    if (!config.token) {
        return res.status(500).json({
            error: 'Falta configurar la variable de entorno GITHUB_TOKEN en Vercel'
        });
    }

    try {
        if (req.method === 'GET') {
            const { contenido } = await obtenerArchivoActual(config, ARCHIVO);
            return res.status(200).json({ jornadas: parsearLista(contenido) });
        }

        if (req.method === 'PUT') {
            const fecha = validarFecha((req.body || {}).fecha);
            const jugadores = validarJugadores((req.body || {}).jugadores);

            const { contenido, sha } = await obtenerArchivoActual(config, ARCHIVO);
            const lista = parsearLista(contenido).filter(j => j && j.fecha !== fecha);
            const existia = parsearLista(contenido).some(j => j && j.fecha === fecha);

            lista.push({ fecha, jugadores });
            lista.sort((a, b) => claveFecha(a.fecha) - claveFecha(b.fecha));

            await commitearArchivo(
                config,
                JSON.stringify(lista, null, 2) + '\n',
                sha,
                existia
                    ? `Actualizar jornada del ${fecha}`
                    : `Abrir jornada del ${fecha} (${jugadores.length} jugadores)`,
                ARCHIVO
            );
            return res.status(200).json({ success: true, fecha, jugadores, creada: !existia });
        }

        if (req.method === 'DELETE') {
            const fecha = validarFecha((req.body || {}).fecha);

            const { contenido, sha } = await obtenerArchivoActual(config, ARCHIVO);
            const lista = parsearLista(contenido);
            if (!lista.some(j => j && j.fecha === fecha)) {
                return res.status(404).json({ error: 'No hay ninguna jornada abierta en esa fecha' });
            }

            await commitearArchivo(
                config,
                JSON.stringify(lista.filter(j => j && j.fecha !== fecha), null, 2) + '\n',
                sha,
                `Cerrar jornada del ${fecha}`,
                ARCHIVO
            );
            return res.status(200).json({ success: true, fecha });
        }

        res.setHeader('Allow', 'GET, PUT, DELETE');
        return res.status(405).json({ error: 'Método no permitido' });
    } catch (error) {
        const status = error.statusCode || 500;
        if (status >= 500) console.error('Error en api/jornada:', error);
        return res.status(status).json({ error: error.message || 'Error al procesar el pedido' });
    }
}

// D/M/AAAA -> AAAAMMDD, para ordenar sin depender del formato del texto.
function claveFecha(fecha) {
    const [d, m, a] = String(fecha).split('/').map(n => parseInt(n, 10));
    return (a || 0) * 10000 + (m || 0) * 100 + (d || 0);
}
