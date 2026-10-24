// =====================================================
// API: Estado del torneo
// =====================================================
// Guarda y lee el JSON de un torneo en curso, en torneos/<slug>.json.
//
//   GET    /api/torneo-estado            -> lista los torneos guardados
//   GET    /api/torneo-estado?ruta=...   -> devuelve ese torneo
//   PUT    /api/torneo-estado            -> crea o actualiza { ruta, estado }
//   DELETE /api/torneo-estado            -> borra { ruta } (el sorteo, no los partidos)
//
// Qué guarda y qué NO guarda:
// el JSON tiene solo el SORTEO (nombre, formato, fecha y quién quedó en
// qué grupo), que es lo único que no se puede deducir de otro lado. Los
// resultados NO se guardan acá: viven en enfrentamientos_directos.txt,
// que sigue siendo la única fuente de verdad. La app cruza el fixture
// (que sale del sorteo) contra el .txt para saber qué falta jugar.
//
// Gracias a eso, si se pierde el celular a mitad del torneo alcanza con
// abrir la app en otro: baja el sorteo de acá, los resultados del .txt,
// y sigue exactamente donde estaba.
// =====================================================

import {
    getConfig,
    obtenerArchivoActual,
    commitearArchivo,
    borrarArchivo,
    errorHttp
} from '../lib/github.js';

const CARPETA = 'torneos';
const INDICE = 'torneos/index.json';
const GITHUB_API = 'https://api.github.com';

// El sitio es estático: desde el navegador no se puede listar la carpeta
// torneos/, así que se mantiene un índice en torneos/index.json con los
// torneos sorteados. Eso es lo que le permite a torneos.html mostrar un
// torneo recién sorteado, cuando todavía no tiene ni un partido jugado
// (y por lo tanto no aparece en enfrentamientos_directos.txt).
//
// Se actualiza acá, del lado del servidor, para que la app no tenga que
// saber que existe. Si la escritura del índice falla, el torneo igual
// queda creado: el índice es una comodidad para el sitio, no la verdad.
async function actualizarIndice(config, cambio) {
    try {
        const { contenido, sha } = await obtenerArchivoActual(config, INDICE);

        let lista = [];
        if (contenido) {
            try {
                const parsed = JSON.parse(contenido);
                if (Array.isArray(parsed)) lista = parsed;
            } catch {
                lista = []; // índice corrupto: se rehace
            }
        }

        lista = lista.filter(t => t && t.ruta !== cambio.ruta);
        if (cambio.accion === 'agregar') {
            lista.push({ nombre: cambio.nombre, ruta: cambio.ruta, formato: cambio.formato });
        }

        await commitearArchivo(
            config,
            JSON.stringify(lista, null, 2) + '\n',
            sha,
            cambio.accion === 'agregar'
                ? `Indexar torneo: ${cambio.nombre}`
                : `Sacar del índice: ${cambio.ruta}`,
            INDICE
        );
    } catch (err) {
        console.error('No se pudo actualizar el índice de torneos:', err);
    }
}

// Solo dejamos escribir dentro de torneos/ y con nombre de archivo sano,
// para que un ruta: "../../algo" no pueda pisar otro archivo del repo.
function validarRuta(ruta) {
    if (typeof ruta !== 'string' || !/^torneos\/[a-z0-9-]+\.json$/.test(ruta)) {
        throw errorHttp(400, 'Ruta inválida: tiene que ser torneos/<nombre>.json');
    }
    return ruta;
}

function validarEstado(estado) {
    if (!estado || typeof estado !== 'object') {
        return 'Falta el objeto "estado"';
    }
    if (!estado.nombre || String(estado.nombre).trim() === '') {
        return 'El torneo necesita un nombre';
    }
    if (!estado.grupos || typeof estado.grupos !== 'object') {
        return 'El torneo necesita los grupos del sorteo';
    }
    const jugadores = Object.values(estado.grupos).flat();
    if (jugadores.length < 2) {
        return 'El torneo necesita al menos dos jugadores';
    }
    if (jugadores.some(j => typeof j !== 'string' || j.includes(','))) {
        return 'Hay nombres de jugador inválidos (no pueden tener comas)';
    }
    if (new Set(jugadores).size !== jugadores.length) {
        return 'Hay jugadores repetidos en el sorteo';
    }
    return null;
}

async function listarTorneosGuardados({ token, owner, repo, branch }) {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${CARPETA}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': 'torneo-tejo-resistencia-app'
        },
        cache: 'no-store'
    });

    // Todavía no existe la carpeta: no hay ningún torneo guardado
    if (res.status === 404) return [];
    if (!res.ok) {
        throw new Error(`No se pudo listar ${CARPETA} (status ${res.status})`);
    }

    const data = await res.json();
    return (Array.isArray(data) ? data : [])
        .filter(f => f.type === 'file' && f.name.endsWith('.json') && f.name !== 'index.json')
        .map(f => ({ ruta: `${CARPETA}/${f.name}` }));
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
            const ruta = req.query?.ruta;

            if (!ruta) {
                const torneos = await listarTorneosGuardados(config);
                return res.status(200).json({ torneos });
            }

            validarRuta(ruta);
            const { contenido, existe } = await obtenerArchivoActual(config, ruta);
            if (!existe) {
                return res.status(404).json({ error: 'Ese torneo no está guardado' });
            }

            let estado;
            try {
                estado = JSON.parse(contenido);
            } catch {
                throw errorHttp(500, 'El archivo del torneo está corrupto');
            }
            return res.status(200).json({ estado });
        }

        if (req.method === 'PUT') {
            const { ruta, estado } = req.body || {};
            validarRuta(ruta);

            const errorValidacion = validarEstado(estado);
            if (errorValidacion) throw errorHttp(400, errorValidacion);

            const { sha, existe } = await obtenerArchivoActual(config, ruta);
            const contenidoNuevo = JSON.stringify(estado, null, 2) + '\n';
            const mensaje = existe
                ? `Actualizar torneo: ${estado.nombre}`
                : `Crear torneo: ${estado.nombre} (${estado.formato} jugadores)`;

            await commitearArchivo(config, contenidoNuevo, sha, mensaje, ruta);
            await actualizarIndice(config, {
                accion: 'agregar',
                ruta,
                nombre: estado.nombre,
                formato: estado.formato
            });
            return res.status(200).json({ success: true, ruta, creado: !existe });
        }

        if (req.method === 'DELETE') {
            const { ruta } = req.body || {};
            validarRuta(ruta);

            const { sha, existe } = await obtenerArchivoActual(config, ruta);
            if (!existe) {
                return res.status(404).json({ error: 'Ese torneo no está guardado' });
            }

            await borrarArchivo(config, ruta, sha);
            await actualizarIndice(config, { accion: 'sacar', ruta });
            return res.status(200).json({ success: true, ruta });
        }

        res.setHeader('Allow', 'GET, PUT, DELETE');
        return res.status(405).json({ error: 'Método no permitido' });
    } catch (error) {
        const status = error.statusCode || 500;
        if (status >= 500) console.error('Error en api/torneo-estado:', error);
        return res.status(status).json({ error: error.message || 'Error al procesar el pedido' });
    }
}
