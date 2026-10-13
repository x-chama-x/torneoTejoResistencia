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
// Para listar, editar o borrar partidos, ver api/partidos.js.
//
// La lógica de GitHub y el formato del archivo viven en lib/github.js.
// =====================================================

import {
    getConfig,
    editarArchivoConReintentos,
    construirLinea,
    validarPartido,
    limpiarCampo
} from '../lib/github.js';

// Agrega la nueva línea al final del contenido actual del archivo,
// respetando que termine con un solo salto de línea.
function agregarLineaAlFinal(contenidoActual, nuevaLinea) {
    return contenidoActual.replace(/\s*$/, '') + `\n${nuevaLinea}\n`;
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

    const config = getConfig();
    if (!config.token) {
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
        const { resultado } = await editarArchivoConReintentos(
            config,
            (contenido) => ({
                contenidoNuevo: agregarLineaAlFinal(contenido, nuevaLinea),
                meta: null
            }),
            () => armarMensajeCommit(body)
        );

        return res.status(200).json({
            success: true,
            linea: nuevaLinea,
            commit: resultado.commit ? resultado.commit.sha : null
        });
    } catch (error) {
        console.error('Error en api/cargar-partido:', error);
        return res.status(500).json({ error: 'Error al commitear el partido', details: error.message });
    }
}
