// =====================================================
// DEPORTES: una configuración por deporte
// =====================================================
// El sitio sirve para más de un deporte (por ahora tejo y metegol),
// con las mismas páginas, los mismos jugadores y los mismos escudos.
// Lo que cambia de un deporte a otro está todo acá: el archivo de
// partidos, a cuántos goles se gana, los textos y los títulos.
//
// Cuál se muestra lo decide el parámetro ?deporte= de la URL:
//   index.html                  -> tejo (default, los links viejos siguen igual)
//   index.html?deporte=metegol  -> metegol
// Para que el parámetro no se pierda al navegar, los links internos se
// arman con urlDeporte('pagina.html') (el menú ya lo hace).
//
// Tiene que cargarse ANTES que cualquier otro script del sitio: todos
// leen DEPORTE al arrancar.
//
// Textos en el HTML: un elemento con data-dtexto="Ranking FIFA {nombreFifa}"
// se reescribe con los valores del deporte (sirve también en <title>).
// El texto que queda escrito en el HTML es el del tejo, así no hay
// parpadeo en el deporte por defecto. Un elemento con data-solo="tejo"
// se oculta en los demás deportes. Un elemento con data-si-empate se
// saca en los deportes sin empate (y uno con data-sin-empate, al revés):
// sirve para la columna "E" de las tablas escritas en el HTML.
//
// Ojo: las rutas de los archivos están repetidas en lib/deportes.js (el
// lado servidor). Si cambiás una, cambiala en los dos.
// =====================================================

const DEPORTES = {
    tejo: {
        id: 'tejo',
        nombre: 'Tejo',                    // menú, app
        nombreLargo: 'Tejo Hockey',        // título del inicio
        nombreFifa: 'Air Hockey',          // "Ranking FIFA Air Hockey", títulos de páginas
        nombreLiga: 'Tejo Nations League', // liga anual de amistosos
        // Los torneos se llaman "Cuarto torneo de hockey de mesa": la app
        // sugiere el nombre con esto y el sitio lo usa para acortarlo.
        sufijoTorneo: 'torneo de hockey de mesa',
        descripcion: 'El tejo hockey sobre mesa, o air hockey: dos jugadores con mazos le pegan a un disco que flota sobre un colchón de aire.',

        // Reglas
        golesParaGanar: 7,     // el ganador siempre hace exactamente esta cantidad
        diferenciaPaliza: 5,   // "Palizas" en Partido 1vs1: 7-2, 7-1, 7-0
        permiteEmpate: false,  // nunca: siempre se juega hasta que alguien llega a 7
        // Puntos en las tablas de torneo: null = los PTS son los goles a favor
        // (la regla de siempre del tejo). Si no, { victoria, empate, derrota }.
        puntos: null,
        etiquetaPuntos: 'PTS(GF)',
        // Nations League: la tabla se ordena por promedio ajustado de goles
        etiquetaPromedioNL: 'PG*',
        notaNL: 'La tabla se ordena por rendimiento, no por goles totales. * PG ajustado: arranca cerca del promedio general y se acerca a tu promedio real a medida que jugás más partidos, así un partidazo aislado no alcanza para el primer puesto.',
        // Cómo se puede jugar un partido: 'goles' (hasta que alguien llega a
        // golesParaGanar) y/o 'tiempo' (minutosPorPartido de reloj).
        modalidades: ['goles'],
        minutosPorPartido: null,

        // Datos (relativos a la raíz del sitio)
        archivoPartidos: 'enfrentamientos_directos.txt',
        carpetaTorneos: 'torneos',
        archivoJornadas: 'jornadas/index.json',

        // Ranking FIFA: puntos con los que arrancó cada uno. Los partidos
        // del primer torneo ya están reflejados en esta base, así que el
        // cálculo los saltea (ver js/rankingCalculator.js).
        rankingBase: {
            Chama: 100.0,
            Rafa: 80.0,
            Tomy: 60.0,
            Marco: 50.0,
            Facu: 40.0,
            Santi: 30.0,
            Hector: 20.0
        },
        torneoIncluidoEnBase: 'primer torneo de hockey de mesa',

        // Prefijo de las claves de localStorage de la app (tanda, jugadores).
        prefijoStorage: 'tejo'
    },

    metegol: {
        id: 'metegol',
        nombre: 'Metegol',
        nombreLargo: 'Metegol',
        nombreFifa: 'Metegol',
        nombreLiga: 'Metegol Nations League',
        sufijoTorneo: 'torneo de metegol',
        descripcion: 'Metegol (fútbol de mesa) 1 contra 1: cada jugador maneja las cuatro barras de su lado.',

        // Reglas: 1 contra 1, a un solo partido. Cada torneo o jornada elige
        // al crearse cómo se juega:
        //   - a goles: gana el primero que llega a 5 (como un partido ITSF).
        //   - por tiempo: se juegan los 10 minutos enteros (los lugares cobran
        //     por tiempo), sin tope de goles: llegar a 5 no termina el partido.
        //     Gana el que va arriba cuando suena el reloj; iguales es empate.
        // Semis, tercer puesto, final y el eliminatorio no pueden terminar
        // empatados: se desempatan con gol de oro (el próximo gol gana) y se
        // carga el resultado final.
        golesParaGanar: 5,
        diferenciaPaliza: 4,   // 5-1, 5-0
        permiteEmpate: true,
        puntos: { victoria: 3, empate: 1, derrota: 0 }, // como en el fútbol
        etiquetaPuntos: 'PTS',
        // Nations League: con empates y partidos por tiempo los goles dicen
        // poco, así que se ordena por puntos por partido (3-1-0), ajustado
        etiquetaPromedioNL: 'PPP*',
        notaNL: 'La tabla se ordena por puntos por partido (3 por ganar, 1 por empatar), no por puntos totales. * PPP ajustado: arranca cerca del promedio general y se acerca a tu promedio real a medida que jugás más partidos, así un buen día aislado no alcanza para el primer puesto.',
        modalidades: ['goles', 'tiempo'],
        modalidadPorDefecto: 'tiempo', // la que aparece elegida al crear
        minutosPorPartido: 10,
        golesMaximosPorTiempo: 15,     // hasta dónde llegan los botones de goles en la app
        desempatePlayoff: 'gol de oro',

        archivoPartidos: 'metegol/partidos.txt',
        carpetaTorneos: 'metegol/torneos',
        archivoJornadas: 'metegol/jornadas/index.json',

        // Sin historial previo: todos arrancan con los puntos de un jugador nuevo.
        rankingBase: {},
        torneoIncluidoEnBase: null,

        // Es el mismo grupo: la app de carga ofrece también a los jugadores
        // del tejo, así no hay que agregarlos uno por uno al primer partido.
        compartirJugadoresCon: 'tejo',

        prefijoStorage: 'metegol'
    }
};

const DEPORTE_DEFAULT = 'tejo';

const DEPORTE = (() => {
    let id = DEPORTE_DEFAULT;
    try {
        id = (new URLSearchParams(window.location.search).get('deporte') || DEPORTE_DEFAULT).toLowerCase();
    } catch (e) { /* sin URL (tests en Node): queda el default */ }
    return DEPORTES[id] || DEPORTES[DEPORTE_DEFAULT];
})();

// Agrega ?deporte=<id> a un link interno. En el deporte por defecto no
// agrega nada, para que las URLs del tejo queden como siempre.
function urlDeporte(href, deporteId) {
    const id = deporteId || DEPORTE.id;
    const [sinHash, hash] = String(href).split('#');
    const [ruta, query] = sinHash.split('?');
    const params = new URLSearchParams(query || '');
    if (id === DEPORTE_DEFAULT) params.delete('deporte');
    else params.set('deporte', id);
    const qs = params.toString();
    return ruta + (qs ? `?${qs}` : '') + (hash !== undefined ? `#${hash}` : '');
}

// "Ranking FIFA {nombreFifa}" -> "Ranking FIFA Metegol"
function textoDeporte(plantilla) {
    return String(plantilla).replace(/\{(\w+)\}/g, (todo, clave) =>
        (DEPORTE[clave] !== undefined ? DEPORTE[clave] : todo));
}

// Resultado para el jugador 1 a partir de los goles: G, P o E (empate).
function resultadoDeMarcador(g1, g2) {
    return g1 > g2 ? 'G' : (g1 < g2 ? 'P' : 'E');
}

// Puntos que suma un jugador en la tabla de un torneo por un partido. En
// el tejo son sus goles; en el metegol, 3-1-0.
function puntosDePartido(golesPropios, golesRival) {
    const p = DEPORTE.puntos;
    if (!p) return golesPropios;
    if (golesPropios > golesRival) return p.victoria;
    if (golesPropios < golesRival) return p.derrota;
    return p.empate;
}

// Columna "E" (empatados) de las tablas: solo en los deportes con empate,
// así las del tejo quedan exactamente como siempre.
function thEmpates(atributos) {
    return DEPORTE.permiteEmpate ? `<th${atributos ? ' ' + atributos : ''} title="Empatados">E</th>` : '';
}
function tdEmpates(n, atributos) {
    return DEPORTE.permiteEmpate ? `<td${atributos ? ' ' + atributos : ''}>${n || 0}</td>` : '';
}

// Las fases que no pueden terminar empatadas (se desempatan con gol de oro).
function esFaseEliminatoria(fase) {
    const f = String(fase || '').toLowerCase();
    return ['semifinal', 'tercer puesto', 'final', 'eliminatorio'].some(x => f.includes(x));
}

// Primer torneo, segundo torneo... con el nombre del deporte.
function esTorneoDelDeporte(nombre) {
    return String(nombre || '').toLowerCase().includes(DEPORTE.sufijoTorneo.toLowerCase());
}

function aplicarTextosDeporte(raiz) {
    const base = raiz || document;
    base.querySelectorAll('[data-dtexto]').forEach(el => {
        el.textContent = textoDeporte(el.dataset.dtexto);
    });
    base.querySelectorAll('[data-solo]').forEach(el => {
        const ids = el.dataset.solo.split(/[\s,]+/);
        // Lo que no es del tejo puede venir oculto en el HTML (para que no
        // aparezca un instante en el tejo antes de que corra esto): se muestra.
        el.style.display = ids.includes(DEPORTE.id) ? '' : 'none';
    });
    // Columnas y textos que solo tienen sentido si puede haber empates
    if (!DEPORTE.permiteEmpate) {
        base.querySelectorAll('[data-si-empate]').forEach(el => el.remove());
    } else {
        base.querySelectorAll('[data-sin-empate]').forEach(el => el.remove());
    }
    if (document.body) document.body.dataset.deporte = DEPORTE.id;
}

if (typeof window !== 'undefined') {
    Object.assign(window, {
        DEPORTES, DEPORTE, DEPORTE_DEFAULT,
        urlDeporte, textoDeporte, esTorneoDelDeporte, aplicarTextosDeporte,
        resultadoDeMarcador, puntosDePartido, thEmpates, tdEmpates, esFaseEliminatoria
    });
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => aplicarTextosDeporte());
        } else {
            aplicarTextosDeporte();
        }
    }
}
