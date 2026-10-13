// =====================================================
// API: Cargar Partido (commit directo a GitHub)
// =====================================================
// Recibe los datos de un partido jugado y los agrega como
// nueva línea en enfrentamientos_directos.txt, haciendo un
// commit directo al repo vía la API de GitHub. Así el archivo
// del repo (única fuente de verdad del ranking y las tablas)
// queda actualizado sin necesidad de tocar una computadora.
//
// Lo usa la app de carga (/app) desde el celular.
//
// Variables de entorno necesarias (configurar en Vercel):
//   GITHUB_TOKEN   -> Personal Access Token con permiso "contents" sobre el repo
//   GITHUB_OWNER   -> usuario/organización dueño del repo (default: x-chama-x)
//   GITHUB_REPO    -> nombre del repo (default: torneoTejoResistencia)
//   GITHUB_BRANCH  -> rama sobre la que se hace el commit (default: master)
// =====================================================

const FILE_PATH = 'enfrentamientos_directos.txt';
const GITHUB_API = 'https://api.github.com';

function getConfig() {
    return {
        token: process.env.GITHUB_TOKEN,
        owner: process.env.GITHUB_OWNER || 'x-chama-x',
        repo: process.env.GITHUB_REPO || 'torneoTejoResistencia',
        branch: process.env.GITHUB_BRANCH || 'master'
    };
}

function ghHeaders(token) {
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'torneo-tejo-resistencia-cargar-partido'
    };
}

// Codifica un string UTF-8 a base64 (Buffer está disponible en el runtime Node de Vercel)
function toBase64(str) {
    return Buffer.from(str, 'utf-8').toString('base64');
}

function fromBase64(b64) {
    return Buffer.from(b64, 'base64').toString('utf-8');
}

// Escapa comas/saltos de línea accidentales en los valores que vienen del formulario,
// para no romper el formato CSV del archivo.
function limpiarCampo(valor) {
    return String(valor ?? '').replace(/[,\n\r]/g, ' ').trim();
}

function validarPartido(body) {
    const requeridos = ['jugador1', 'jugador2', 'resultado', 'marcador', 'torneo', 'fecha', 'fase'];
    for (const campo of requeridos) {
        if (!body[campo] || String(body[campo]).trim() === '') {
            return `Falta el campo "${campo}"`;
        }
    }
    if (!['G', 'P'].includes(body.resultado)) {
        return 'El campo "resultado" debe ser "G" o "P"';
    }
    if (!/^\d+-\d+$/.test(String(body.marcador).trim())) {
        return 'El marcador debe tener el formato "N-N" (ej: 7-5)';
    }
    if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(body.fecha).trim())) {
        return 'La fecha debe tener el formato "D/M/AAAA" (ej: 13/10/2026)';
    }
    const [g1, g2] = String(body.marcador).trim().split('-').map(Number);
    if (g1 === g2) {
        return 'El marcador no puede terminar empatado';
    }
    // El resultado declarado tiene que coincidir con el marcador (G = ganó el jugador 1)
    const ganoJ1 = g1 > g2;
    if ((body.resultado === 'G') !== ganoJ1) {
        return 'El resultado no coincide con el marcador';
    }
    if (limpiarCampo(body.jugador1).toLowerCase() === limpiarCampo(body.jugador2).toLowerCase()) {
        return 'Los dos jugadores no pueden ser el mismo';
    }
    return null;
}

function construirLinea(body) {
    const partes = [
        limpiarCampo(body.jugador1),
        limpiarCampo(body.jugador2),
        limpiarCampo(body.resultado),
        limpiarCampo(body.marcador),
        limpiarCampo(body.torneo),
        limpiarCampo(body.fecha),
        limpiarCampo(body.fase)
    ];
    return partes.join(',');
}

// Agrega la nueva línea al final del contenido actual del archivo,
// respetando que termine con un solo salto de línea.
function agregarLineaAlFinal(contenidoActual, nuevaLinea) {
    let contenido = contenidoActual.replace(/\s*$/, ''); // recorta espacios/saltos finales
    contenido += `\n${nuevaLinea}\n`;
    return contenido;
}

async function obtenerArchivoActual({ token, owner, repo, branch }) {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${FILE_PATH}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, { headers: ghHeaders(token) });
    if (!res.ok) {
        const detalle = await res.text();
        throw new Error(`No se pudo leer ${FILE_PATH} desde GitHub (status ${res.status}): ${detalle}`);
    }
    const data = await res.json();
    return {
        contenido: fromBase64(data.content),
        sha: data.sha
    };
}

async function commitearArchivo({ token, owner, repo, branch }, contenidoNuevo, sha, mensaje) {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${FILE_PATH}`;
    const res = await fetch(url, {
        method: 'PUT',
        headers: { ...ghHeaders(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
            message: mensaje,
            content: toBase64(contenidoNuevo),
            sha,
            branch
        })
    });
    if (!res.ok) {
        const detalle = await res.text();
        throw new Error(`No se pudo commitear en GitHub (status ${res.status}): ${detalle}`);
    }
    return res.json();
}

// Arma el mensaje del commit. Para amistosos queda más lindo mencionar
// la Nations League, que es donde se cuentan.
function armarMensajeCommit(body) {
    const j1 = limpiarCampo(body.jugador1);
    const j2 = limpiarCampo(body.jugador2);
    const marcador = limpiarCampo(body.marcador);
    const torneo = limpiarCampo(body.torneo);
    const fase = limpiarCampo(body.fase);
    const fecha = limpiarCampo(body.fecha);

    if (torneo.toLowerCase() === 'amistoso') {
        return `Amistoso ${fecha}: ${j1} ${marcador} ${j2} (Tejo Nations League)`;
    }
    return `Partido: ${j1} ${marcador} ${j2} (${torneo} - ${fase})`;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    const { token, owner, repo, branch } = getConfig();
    if (!token) {
        return res.status(500).json({
            error: 'Falta configurar la variable de entorno GITHUB_TOKEN en Vercel'
        });
    }

    const body = req.body || {};
    const errorValidacion = validarPartido(body);
    if (errorValidacion) {
        return res.status(400).json({ error: errorValidacion });
    }

    const nuevaLinea = construirLinea(body);

    try {
        // Reintenta si el sha quedó desactualizado (otro commit entró en el medio).
        // Pasa seguido al cargar varios partidos seguidos desde la app.
        let intentos = 0;
        let ultimoError = null;

        while (intentos < 4) {
            intentos++;
            try {
                const { contenido, sha } = await obtenerArchivoActual({ token, owner, repo, branch });
                const contenidoNuevo = agregarLineaAlFinal(contenido, nuevaLinea);
                const resultado = await commitearArchivo(
                    { token, owner, repo, branch },
                    contenidoNuevo,
                    sha,
                    armarMensajeCommit(body)
                );

                return res.status(200).json({
                    success: true,
                    linea: nuevaLinea,
                    commit: resultado.commit ? resultado.commit.sha : null
                });
            } catch (err) {
                ultimoError = err;
                const msg = String(err.message);
                // 409 (conflicto de sha) y 422 (sha desactualizado) son reintentables
                if (!msg.includes('409') && !msg.includes('422')) break;
                // Espera corta y creciente antes de reintentar
                await new Promise(r => setTimeout(r, 400 * intentos));
            }
        }

        throw ultimoError;
    } catch (error) {
        console.error('Error en api/cargar-partido:', error);
        return res.status(500).json({ error: 'Error al commitear el partido', details: error.message });
    }
}
