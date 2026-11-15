// =====================================================
// ESCUDOS DE LOS JUGADORES
// =====================================================
// Cada jugador puede tener su escudo en img/escudos/. El que todavia no
// tiene el suyo usa el generico (_generico.svg), que es un escudo neutro
// con la corona, el borde dorado y el tejo adentro.
//
// PARA AGREGAR UN ESCUDO NUEVO, dos pasos:
//   1. Guardar la imagen en img/escudos/<nombre en minuscula>.png
//      (o .svg, .jpg, .webp: lo que importa es que la extension coincida
//      con la de la lista de abajo).
//   2. Agregar el nombre del jugador a CON_ESCUDO.
//
// OJO: con el paso 1 solo, el escudo NO aparece. El jugador sigue con el
// generico hasta que este en la lista.
//
// El segundo paso parece de mas, pero evita que el navegador pida 10
// archivos que no existen cada vez que se abre una pagina: sin la lista,
// la unica forma de saber si un escudo existe es pedirlo y que falle.
//
// LA IMAGEN, RECORTADA Y CHICA. Dos cosas que no se ven en el archivo
// pero si en la pagina:
//   - Sin margen transparente alrededor. El escudo se ajusta al alto de
//     su casillero contando el margen, asi que uno con margen se ve mas
//     chico que los demas (el de Santi llenaba el 87% del alto).
//   - De 256 px de alto alcanza: se muestra a 30-80 px. El original de
//     Mateo pesaba 1,8 MB; recortado y a 256 px pesa 86 KB.
//
// Los nombres van como figuran en enfrentamientos_directos.txt.

const CON_ESCUDO = {
    'Chama': 'chama.png',
    'Mateo': 'mateo.png',
    'Santi': 'santi.png',
    'Facu':  'facu.png',
    'Marco': 'marco.png',
    'Lucas': 'lucas.png',
    'Kovic': 'kovic.png'
    // 'Tomy':  'tomy.png',
    // ...
};

const ESCUDO_GENERICO = '_generico.svg';

// Carpeta de los escudos. Las paginas de la raiz no tocan nada; una que
// viva en una subcarpeta (app/) pone window.ESCUDOS_BASE antes de cargar
// este archivo.
const ESCUDOS_BASE = (typeof window !== 'undefined' && window.ESCUDOS_BASE)
    ? window.ESCUDOS_BASE
    : 'img/escudos/';

// Normaliza para que "chama", "Chama" y "CHAMA" den lo mismo.
const _ESCUDOS_INDICE = {};
for (const nombre in CON_ESCUDO) {
    _ESCUDOS_INDICE[nombre.trim().toLowerCase()] = CON_ESCUDO[nombre];
}

// Ruta del escudo de un jugador, o la del generico si no tiene.
function rutaEscudo(nombre) {
    const archivo = _ESCUDOS_INDICE[String(nombre || '').trim().toLowerCase()];
    return ESCUDOS_BASE + (archivo || ESCUDO_GENERICO);
}

// ¿Este jugador ya tiene escudo propio?
function tieneEscudoPropio(nombre) {
    return !!_ESCUDOS_INDICE[String(nombre || '').trim().toLowerCase()];
}

// El <img> solo. `clase` agrega clases extra (ej. 'escudo-grande').
//
// El alt va vacio a proposito: el escudo esta siempre al lado del nombre
// escrito, asi que para un lector de pantalla es decoracion, y repetir
// "escudo de Chama" antes de "Chama" solo molesta.
function escudoImg(nombre, clase) {
    // 'escudo-propio' los muestra un 12% mas grandes que el generico (ver CSS)
    const cls = 'escudo'
        + (tieneEscudoPropio(nombre) ? ' escudo-propio' : '')
        + (clase ? ' ' + clase : '');
    return `<img class="${cls}" src="${rutaEscudo(nombre)}" alt="" loading="lazy">`;
}

// El nombre con su escudo adelante, listo para meter en una celda.
//
//   conEscudo('Chama')                      -> escudo + Chama
//   conEscudo('Chama', { negrita: true })   -> el nombre en <strong>
//   conEscudo('Chama', { derecha: true })   -> escudo a la DERECHA del
//                                              nombre, para la columna
//                                              "Local" de los resultados,
//                                              que esta alineada a la
//                                              derecha y quedaria con el
//                                              escudo despegado del nombre.
//   conEscudo('Chama', { bloque: true })    -> escudo ARRIBA del nombre.
//                                              Para las tarjetas del
//                                              bracket, que en celular
//                                              miden 126px de ancho: ahi
//                                              el escudo al costado no
//                                              entra, pero arriba cuesta
//                                              alto y no ancho.
//
// El <span> es inline-flex y no deja que el nombre se corte en dos
// lineas debajo del escudo.
function conEscudo(nombre, opciones) {
    const op = opciones || {};
    const texto = op.negrita ? `<strong>${nombre}</strong>` : nombre;
    const img = escudoImg(nombre, op.clase);

    if (op.bloque) {
        return `<span class="con-escudo con-escudo-bloque">${img}${texto}</span>`;
    }

    const clase = 'con-escudo' + (op.derecha ? ' con-escudo-der' : '');
    return op.derecha
        ? `<span class="${clase}">${texto}${img}</span>`
        : `<span class="${clase}">${img}${texto}</span>`;
}

// Iguala el ancho de todos los "escudo + nombre" de cada columna de una
// tabla al del mas ancho. Asi la columna se puede centrar como bloque, con
// el titulo centrado encima, sin que los escudos queden en zigzag.
//
// Hace falta en las tablas de campeones: ahi el titulo ("Subcampeon") es
// mas ancho que los nombres, y con CSS solo no hay forma de centrar el
// bloque sin saber cuanto mide el nombre mas largo. En las de posiciones
// no se usa: alcanza con el CSS (ver "Tablas con columna de jugador").
//
// El ancho va en em, asi acompaña cuando la letra cambia con el ancho de
// pantalla, y se vuelve a medir al cambiar el tamaño (el escudo cambia de
// tamaño en algunos cortes) y cuando terminan de cargar las fuentes.
function igualarColumnasDeEscudos(tabla) {
    if (!tabla) return;
    const medir = () => {
        const filas = [...tabla.querySelectorAll('tbody tr')];
        const columnas = Math.max(0, ...filas.map(tr => tr.children.length));
        for (let c = 0; c < columnas; c++) {
            const spans = filas
                .map(tr => tr.children[c] && tr.children[c].querySelector(':scope > .con-escudo'))
                .filter(Boolean);
            spans.forEach(s => { s.style.minWidth = ''; });
            if (spans.length < 2) continue;              // una fila sola: nada que alinear
            const px = Math.max(...spans.map(s => s.getBoundingClientRect().width));
            if (!px) continue;                           // la tabla esta oculta
            const letra = parseFloat(getComputedStyle(spans[0]).fontSize) || 16;
            spans.forEach(s => { s.style.minWidth = (px / letra).toFixed(3) + 'em'; });
        }
    };
    medir();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);
    let pendiente = false;
    window.addEventListener('resize', () => {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(() => { pendiente = false; medir(); });
    });
}

if (typeof window !== 'undefined') {
    window.igualarColumnasDeEscudos = igualarColumnasDeEscudos;
    window.rutaEscudo = rutaEscudo;
    window.tieneEscudoPropio = tieneEscudoPropio;
    window.escudoImg = escudoImg;
    window.conEscudo = conEscudo;
}
