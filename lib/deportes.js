// =====================================================
// DEPORTES (lado servidor, para los endpoints de /api)
// =====================================================
// Dónde guarda sus datos cada deporte dentro del repo. La app manda
// ?deporte=<id> en cada pedido; si no viene, es el tejo (así los links
// y la app vieja siguen andando igual que antes).
//
// La configuración completa de cada deporte (textos, títulos, a cuántos
// goles se gana, ranking base...) vive en js/deportes.js, que es la que
// usan las páginas. Acá van solo las rutas y lo poco que necesitan los
// mensajes de commit. Si sumás un deporte o cambiás una ruta, cambialo
// en los dos archivos: el navegador no puede importar un módulo de Node
// ni al revés sin cambiar cómo se cargan todos los scripts del sitio.
// =====================================================

import { errorHttp } from './github.js';

export const DEPORTES = {
    tejo: {
        id: 'tejo',
        archivoPartidos: 'enfrentamientos_directos.txt',
        carpetaTorneos: 'torneos',
        archivoJornadas: 'jornadas/index.json',
        nombreLiga: 'Tejo Nations League'
    },
    metegol: {
        id: 'metegol',
        archivoPartidos: 'metegol/partidos.txt',
        carpetaTorneos: 'metegol/torneos',
        archivoJornadas: 'metegol/jornadas/index.json',
        nombreLiga: 'Metegol Nations League'
    }
};

export const DEPORTE_DEFAULT = 'tejo';

// Devuelve la config del deporte pedido en ?deporte=. Un id desconocido
// es un error (400) en vez de caer en el tejo: mejor cortar que escribir
// partidos de metegol en el archivo del tejo por un typo.
export function deporteDelPedido(req) {
    const id = String(req.query?.deporte || DEPORTE_DEFAULT).toLowerCase();
    const deporte = DEPORTES[id];
    if (!deporte) {
        throw errorHttp(400, `Deporte desconocido: "${id}"`);
    }
    return deporte;
}

// Para distinguir en el historial de commits los que no son del tejo:
// "[metegol] Borrar partido: ...". En el deporte por defecto no agrega
// nada, así los mensajes del tejo quedan como siempre.
export function prefijoCommit(deporte) {
    return deporte.id === DEPORTE_DEFAULT ? '' : `[${deporte.id}] `;
}
