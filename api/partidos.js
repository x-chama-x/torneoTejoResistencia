// =====================================================
// API: Partidos (listar / editar / borrar)
// =====================================================
// Complementa a api/cargar-partido.js (que solo agrega).
//
//   GET    /api/partidos?limit=25&torneo=Amistoso
//          -> lista los partidos más recientes con su índice de línea
//   PUT    /api/partidos   { indice, lineaEsperada, partido: {...} }
//          -> reemplaza esa línea
//   DELETE /api/partidos   { indice, lineaEsperada }
//          -> borra esa línea
//
// El índice es el número de línea dentro del archivo. Como el archivo
// tiene líneas repetidas (hay partidos idénticos jugados el mismo día),
// identificar por contenido solo sería ambiguo. Por eso se manda índice
// + contenido esperado: el índice dice cuál, y el contenido confirma que
// el archivo no cambió en el medio.
// =====================================================

import {
    getConfig,
    obtenerArchivoActual,
    editarArchivoConReintentos,
    listarPartidos,
    construirLinea,
    validarPartido,
    verificarLinea,
    errorHttp,
    limpiarCampo
} from '../lib/github.js';

const LIMITE_DEFAULT = 25;
const LIMITE_MAX = 200;

async function manejarGet(req, res, config) {
    const { contenido } = await obtenerArchivoActual(config);
    let partidos = listarPartidos(contenido);

    // Filtro opcional por torneo (la app usa ?torneo=Amistoso)
    const filtroTorneo = req.query?.torneo;
    if (filtroTorneo) {
        const f = String(filtroTorneo).toLowerCase();
        partidos = partidos.filter(p => p.torneo.toLowerCase() === f);
    }

    const total = partidos.length;

    let limite = parseInt(req.query?.limit, 10);
    if (!Number.isInteger(limite) || limite <= 0) limite = LIMITE_DEFAULT;
    limite = Math.min(limite, LIMITE_MAX);

    // Los más nuevos están al final del archivo: los devolvemos primero.
    const recientes = partidos.slice(-limite).reverse();

    return res.status(200).json({ partidos: recientes, total, mostrados: recientes.length });
}

async function manejarDelete(req, res, config) {
    const { indice, lineaEsperada } = req.body || {};

    if (lineaEsperada === undefined) {
        throw errorHttp(400, 'Falta "lineaEsperada"');
    }

    const { meta } = await editarArchivoConReintentos(
        config,
        (contenido) => {
            const lineas = contenido.split('\n');
            verificarLinea(lineas, indice, lineaEsperada);

            const borrada = lineas[indice].trim();
            lineas.splice(indice, 1);

            return {
                contenidoNuevo: normalizarFinal(lineas.join('\n')),
                meta: { borrada }
            };
        },
        (meta) => `Borrar partido: ${resumen(meta.borrada)}`
    );

    return res.status(200).json({ success: true, borrada: meta.borrada });
}

async function manejarPut(req, res, config) {
    const { indice, lineaEsperada, partido } = req.body || {};

    if (lineaEsperada === undefined) {
        throw errorHttp(400, 'Falta "lineaEsperada"');
    }
    if (!partido) {
        throw errorHttp(400, 'Falta el objeto "partido"');
    }

    const errorValidacion = validarPartido(partido);
    if (errorValidacion) {
        throw errorHttp(400, errorValidacion);
    }

    const lineaNueva = construirLinea(partido);

    const { meta } = await editarArchivoConReintentos(
        config,
        (contenido) => {
            const lineas = contenido.split('\n');
            verificarLinea(lineas, indice, lineaEsperada);

            const anterior = lineas[indice].trim();
            lineas[indice] = lineaNueva;

            return {
                contenidoNuevo: normalizarFinal(lineas.join('\n')),
                meta: { anterior, nueva: lineaNueva }
            };
        },
        (meta) => `Editar partido: ${resumen(meta.anterior)} -> ${resumen(meta.nueva)}`
    );

    return res.status(200).json({ success: true, anterior: meta.anterior, nueva: meta.nueva });
}

// Deja el archivo terminando siempre con un solo salto de línea.
function normalizarFinal(contenido) {
    return contenido.replace(/\s*$/, '') + '\n';
}

// "Chama,Mateo,G,7-1,Amistoso,13/10/2026,Amistoso" -> "Chama 7-1 Mateo (13/10/2026)"
function resumen(linea) {
    const p = String(linea).split(',');
    if (p.length < 7) return limpiarCampo(linea);
    return `${p[0].trim()} ${p[3].trim()} ${p[1].trim()} (${p[5].trim()})`;
}

export default async function handler(req, res) {
    const config = getConfig();
    if (!config.token) {
        return res.status(500).json({
            error: 'Falta configurar la variable de entorno GITHUB_TOKEN en Vercel'
        });
    }

    try {
        switch (req.method) {
            case 'GET':
                return await manejarGet(req, res, config);
            case 'PUT':
                return await manejarPut(req, res, config);
            case 'DELETE':
                return await manejarDelete(req, res, config);
            default:
                res.setHeader('Allow', 'GET, PUT, DELETE');
                return res.status(405).json({ error: 'Método no permitido' });
        }
    } catch (error) {
        const status = error.statusCode || 500;
        if (status >= 500) console.error('Error en api/partidos:', error);
        return res.status(status).json({
            error: error.message || 'Error al procesar el pedido'
        });
    }
}
