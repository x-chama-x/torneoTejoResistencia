// =====================================================
// HELPERS DE GITHUB (compartidos por los endpoints de /api)
// =====================================================
// Todo lo que tiene que ver con leer y escribir
// enfrentamientos_directos.txt en el repo via la API de GitHub.
//
// Vive fuera de /api a propósito: cada archivo dentro de /api se
// convierte en una función serverless, así que el código compartido
// va acá y los endpoints lo importan.
//
// Variables de entorno necesarias (configurar en Vercel):
//   GITHUB_TOKEN   -> Personal Access Token con permiso "contents" sobre el repo
//   GITHUB_OWNER   -> usuario/organización dueño del repo (default: x-chama-x)
//   GITHUB_REPO    -> nombre del repo (default: torneoTejoResistencia)
//   GITHUB_BRANCH  -> rama sobre la que se hace el commit (default: master)
// =====================================================

export const FILE_PATH = 'enfrentamientos_directos.txt';
const GITHUB_API = 'https://api.github.com';

export function getConfig() {
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
        'User-Agent': 'torneo-tejo-resistencia-app'
    };
}

function toBase64(str) {
    return Buffer.from(str, 'utf-8').toString('base64');
}

function fromBase64(b64) {
    return Buffer.from(b64, 'base64').toString('utf-8');
}

export async function obtenerArchivoActual({ token, owner, repo, branch }) {
    const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${FILE_PATH}?ref=${encodeURIComponent(branch)}`;
    const res = await fetch(url, { headers: ghHeaders(token), cache: 'no-store' });
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

export async function commitearArchivo({ token, owner, repo, branch }, contenidoNuevo, sha, mensaje) {
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

// Lee el archivo, deja que `transformar(contenido)` devuelva el contenido nuevo
// y lo commitea. Reintenta si otro commit entró en el medio y dejó el sha viejo
// (pasa seguido al cargar varios partidos seguidos desde la app).
//
// `transformar` puede tirar un error con `.statusCode` para abortar sin reintentar
// (ej: la línea que se quería borrar ya no está donde decía el cliente).
export async function editarArchivoConReintentos(config, transformar, armarMensaje, maxIntentos = 4) {
    let ultimoError = null;

    for (let intento = 1; intento <= maxIntentos; intento++) {
        try {
            const { contenido, sha } = await obtenerArchivoActual(config);
            const { contenidoNuevo, meta } = transformar(contenido);
            const resultado = await commitearArchivo(config, contenidoNuevo, sha, armarMensaje(meta));
            return { resultado, meta };
        } catch (err) {
            ultimoError = err;
            // Errores de validación del propio transformar: no tiene sentido reintentar
            if (err.statusCode) throw err;

            const msg = String(err.message);
            if (!msg.includes('409') && !msg.includes('422')) break;
            await new Promise(r => setTimeout(r, 400 * intento));
        }
    }

    throw ultimoError;
}

// =====================================================
// Formato del archivo
// =====================================================
// jugador1,jugador2,resultado_j1,marcador,torneo,fecha,fase

// Escapa comas/saltos de línea accidentales en los valores que vienen del
// formulario, para no romper el formato CSV del archivo.
export function limpiarCampo(valor) {
    return String(valor ?? '').replace(/[,\n\r]/g, ' ').trim();
}

export function construirLinea(body) {
    return [
        limpiarCampo(body.jugador1),
        limpiarCampo(body.jugador2),
        limpiarCampo(body.resultado),
        limpiarCampo(body.marcador),
        limpiarCampo(body.torneo),
        limpiarCampo(body.fecha),
        limpiarCampo(body.fase)
    ].join(',');
}

export function validarPartido(body) {
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
    if ((body.resultado === 'G') !== (g1 > g2)) {
        return 'El resultado no coincide con el marcador';
    }
    if (limpiarCampo(body.jugador1).toLowerCase() === limpiarCampo(body.jugador2).toLowerCase()) {
        return 'Los dos jugadores no pueden ser el mismo';
    }
    return null;
}

// Parsea una línea del archivo. Devuelve null si no es una línea de partido.
export function parsearLinea(linea) {
    const l = linea.trim();
    if (!l || l.startsWith('#')) return null;

    const p = l.split(',');
    if (p.length < 7) return null;

    return {
        jugador1: p[0].trim(),
        jugador2: p[1].trim(),
        resultado: p[2].trim(),
        marcador: p[3].trim(),
        torneo: p[4].trim(),
        fecha: p[5].trim(),
        fase: p[6].trim()
    };
}

// Devuelve todos los partidos con el número de línea real dentro del archivo.
// Ese índice es lo que después usa el cliente para pedir borrar o editar uno.
export function listarPartidos(contenido) {
    const lineas = contenido.split('\n');
    const partidos = [];

    lineas.forEach((linea, indice) => {
        const datos = parsearLinea(linea);
        if (datos) {
            partidos.push({ indice, linea: linea.trim(), ...datos });
        }
    });

    return partidos;
}

// Error con status HTTP, para cortar el flujo con un mensaje claro.
export function errorHttp(statusCode, mensaje) {
    const err = new Error(mensaje);
    err.statusCode = statusCode;
    return err;
}

// Verifica que en `indice` esté exactamente la línea que el cliente cree que está.
// Es la red de seguridad contra borrar el partido equivocado: si el archivo cambió
// desde que la app listó los partidos (o hay líneas repetidas, que las hay), los
// índices se corren y esto lo detecta en vez de pisar otra fila.
export function verificarLinea(lineas, indice, lineaEsperada) {
    if (!Number.isInteger(indice) || indice < 0 || indice >= lineas.length) {
        throw errorHttp(400, 'El partido indicado no existe (índice fuera de rango)');
    }
    if (lineas[indice].trim() !== String(lineaEsperada).trim()) {
        throw errorHttp(
            409,
            'El archivo cambió desde que abriste la lista. Recargá los partidos y probá de nuevo.'
        );
    }
}
