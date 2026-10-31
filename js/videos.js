// =====================================================
// VIDEOS DE LOS PARTIDOS
// =====================================================
// Los videos NO viven en el repo. Los originales de las finales pesan
// ~300 MB cada uno y GitHub rechaza cualquier archivo de más de 100 MB
// (Vercel tampoco sirve estáticos de ese tamaño). Así que están en un
// store público de Vercel Blob y la página los pide por URL.
//
// Antes de subirlos hay que recomprimirlos: los que salen del celular
// suelen venir en HEVC/H.265, que no reproduce cualquier navegador, y
// a 12 Mbps. Con esto quedan en ~35 MB y andan en todos lados:
//
//   ffmpeg -i original.mp4 -vf "scale=-2:720" -r 30 \
//          -c:v libx264 -preset veryfast -crf 27 -pix_fmt yuv420p \
//          -c:a aac -b:a 96k -movflags +faststart salida.mp4
//
// El -movflags +faststart es el que permite que el video arranque sin
// bajarse entero.
//
// Para agregar uno nuevo: subir el mp4 al store de Blob y pegar la URL
// acá, con el nombre del torneo tal cual está en la columna "torneo" de
// enfrentamientos_directos.txt y el nombre exacto de la fase. Sirve para
// cualquier partido, no solo las finales.
// =====================================================

const BLOB = 'https://4ns5q5w3gtzupx63.public.blob.vercel-storage.com';

const VIDEOS_DE_PARTIDOS = {
    'Primer torneo de hockey de mesa': {
        'Final': `${BLOB}/torneo1-final.mp4`
    },
    'Segundo torneo de hockey de mesa': {
        'Final': `${BLOB}/torneo2-final.mp4`
    },
    'Tercer torneo de hockey de mesa': {
        'Final': `${BLOB}/torneo3-final.mp4`
    }
};

// Devuelve la URL del video de ese partido, o null si no hay.
function videoDelPartido(partido) {
    if (!partido || !partido.torneo || !partido.fase) return null;

    const delTorneo = VIDEOS_DE_PARTIDOS[partido.torneo];
    if (!delTorneo) return null;

    const url = delTorneo[partido.fase];
    return url ? url : null;
}

// Cómo se llama el botón según la instancia.
function etiquetaDeVideo(fase) {
    if (fase === 'Final') return 'Ver la final';
    if (fase === 'Tercer Puesto') return 'Ver el tercer puesto';
    return 'Ver el partido';
}
