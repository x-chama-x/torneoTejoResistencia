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
// se oculta en los demás deportes.
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

        // TODO reglas: todavía no están definidas. Por ahora a 5 goles y
        // a un solo partido, como el reglamento ITSF (partidos a 5 goles).
        // El ITSF además juega al mejor de 3 o de 5 partidos y en el partido
        // decisivo hay que ganar por 2 (tope 8): si adoptan eso, el ganador
        // ya no hace siempre la misma cantidad de goles y la app tiene que
        // dejar de asumirlo (ver golesParaGanar en app/app.js).
        golesParaGanar: 5,
        diferenciaPaliza: 4,   // 5-1, 5-0

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
        if (!ids.includes(DEPORTE.id)) el.style.display = 'none';
    });
    if (document.body) document.body.dataset.deporte = DEPORTE.id;
}

if (typeof window !== 'undefined') {
    Object.assign(window, {
        DEPORTES, DEPORTE, DEPORTE_DEFAULT,
        urlDeporte, textoDeporte, esTorneoDelDeporte, aplicarTextosDeporte
    });
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => aplicarTextosDeporte());
        } else {
            aplicarTextosDeporte();
        }
    }
}
