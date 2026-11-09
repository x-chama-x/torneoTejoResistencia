// =====================================================
// PROBABILIDAD DE VICTORIA ENTRE DOS JUGADORES
// =====================================================
// Misma fórmula que usa el Creador de Torneo (js/torneo.js) para sus
// simulaciones, extraída acá para poder reusarla en la página de
// torneos sin duplicarla ni inventar otra:
//
//   fuerza = ranking FIFA × 0.4 + winrate global × 100 × 0.6
//
// Después se ajusta por el historial de enfrentamientos directos entre
// esos dos: si uno le gana seguido al otro, se corre la balanza. El peso
// de ese ajuste crece con cuántas veces se enfrentaron, así un 1-0 entre
// dos que jugaron una sola vez pesa mucho menos que un 6-1 entre dos que
// se enfrentaron siete veces.
//
// El peso satura: n / (n + CRUCES_FANTASMA). Antes era n / (el par que
// más se enfrentó en todo el historial), y eso tenía un problema: los
// mismos tres partidos entre dos valían cada vez menos a medida que OTRO
// par seguía jugando. El 3-0 de Marco contra Facu aportaba 15 puntos con
// el máximo en 8, y habría aportado 4 con el máximo en 30, sin que esos
// tres partidos cambiaran en nada. Con la saturación el peso solo depende
// de ese cruce, converge solo y nunca pasa el tope.
//
// Es la misma idea de los partidos fantasma del PG* de la Nations League
// (js/nationsLeagueCalculator.js): pocos datos tiran hacia el centro.
//
// Al final todo pasa por una sigmoide (PROB_K), que convierte la diferencia
// de fuerzas en una probabilidad entre 0 y 1. La sigmoide es lo que hace
// que diferencias chicas muevan poco la aguja y diferencias grandes
// tampoco lleguen nunca al 100%: siempre queda margen para el batacazo.
//
// NOTA: no incluye el ajuste por bicampeonato de js/campeon.js, que el
// Creador aplica después de calibrarlo contra una cuota objetivo. Sin esa
// calibración el número no sería comparable, así que acá se usa la fórmula
// base. Por eso puede haber diferencias chicas contra el Creador cuando
// juega el campeón defensor.
// =====================================================

const PROB_K = 60;                 // suavidad de la sigmoide
const PESO_RANKING = 0.4;
const PESO_WINRATE = 0.6;
const PESO_HISTORIAL = 0.4;        // tope del ajuste por enfrentamiento directo
const CRUCES_FANTASMA = 4;         // a cuantos cruces el ajuste llega a la mitad del tope

// =====================================================
// EL NUCLEO, QUE USAN TODAS LAS PAGINAS
// =====================================================
// Esta formula estaba copiada y pegada en cinco archivos (este,
// torneo.js, simulador.js, partido.js y playoffs.js). Cada vez que se
// tocaba una habia que acordarse de las otras cuatro, y si no, dos
// paginas mostraban numeros distintos para el mismo cruce. Ahora el
// calculo vive aca y los demas lo llaman.
//
// La suavidad es PROB_K en todas: antes los simuladores usaban 30, que
// era el valor original de todo el sitio y quedo ahi cuando las paginas de
// datos pasaron a 60. No habia razon para mantener los dos (ver README).
//
// Lo unico que cambia de pagina en pagina va por opciones:
//   campeon  el ajuste por campeon defensor de js/campeon.js, que solo
//            aplican el Creador de Torneo y el Simulador.

// Ranking y winrate combinados, antes de cualquier ajuste.
function fuerzaBase(ranking, winRate) {
    return (ranking * PESO_RANKING) + (winRate * 100 * PESO_WINRATE);
}

// Lo que suma (o resta) el mano a mano a cada uno. Devuelve [a1, a2].
// El peso satura con la cantidad de cruces: ver el comentario de arriba.
function ajustePorCruce(victorias1, victorias2) {
    const total = (victorias1 || 0) + (victorias2 || 0);
    if (total <= 0) return [0, 0];

    const peso = PESO_HISTORIAL * (total / (total + CRUCES_FANTASMA));
    const wr1 = (victorias1 || 0) / total;
    const wr2 = (victorias2 || 0) / total;

    return [(wr1 - 0.5) * 100 * peso, (wr2 - 0.5) * 100 * peso];
}

// La probabilidad de que gane el primero, entre 0 y 1.
//
//   j1, j2     { nombre, ranking, winRate }
//   historial  { victorias: { nombre: n } } del cruce, o null
//   opciones   { campeon }
function probabilidadEntre(j1, j2, historial, opciones) {
    const op = opciones || {};

    let fuerza1 = fuerzaBase(j1.ranking, j1.winRate);
    let fuerza2 = fuerzaBase(j2.ranking, j2.winRate);

    if (historial && historial.victorias) {
        const [a1, a2] = ajustePorCruce(
            historial.victorias[j1.nombre],
            historial.victorias[j2.nombre]
        );
        fuerza1 += a1;
        fuerza2 += a2;
    }

    // El campeon defensor pesa un poco mas (o menos, en modo maldicion).
    // Calibrado en js/campeon.js, que no todas las paginas cargan.
    if (op.campeon && typeof ajustarFuerzaPorCampeon === 'function') {
        fuerza1 = ajustarFuerzaPorCampeon(fuerza1, j1.nombre);
        fuerza2 = ajustarFuerzaPorCampeon(fuerza2, j2.nombre);
    }

    return 1 / (1 + Math.exp(-(fuerza1 - fuerza2) / PROB_K));
}

// =====================================================
// LO QUE USA ESTA PAGINA: los datos salen del .txt
// =====================================================

const probData = {
    listo: false,
    jugadores: {},                 // nombre -> { ranking, winRate }
    cruces: {}                     // "A_vs_B" -> { victorias: {A: n, B: n}, total }
};

// Carga todo lo que necesita la fórmula a partir del texto del .txt.
// El ranking sale de rankingCalculator.js, el mismo que muestra la home.
function prepararProbabilidades(texto) {
    const ranking = calcularRankingDesdeTexto(texto);

    const stats = {};
    const cruces = {};

    texto.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#') && !l.startsWith('='))
        .map(l => l.split(','))
        .filter(p => p.length >= 7)
        .forEach(p => {
            const j1 = p[0].trim();
            const j2 = p[1].trim();
            const res = p[2].trim();
            const [g1, g2] = p[3].trim().split('-').map(n => parseInt(n, 10));
            if (isNaN(g1) || isNaN(g2)) return;

            if (!stats[j1]) stats[j1] = { pj: 0, g: 0 };
            if (!stats[j2]) stats[j2] = { pj: 0, g: 0 };
            stats[j1].pj++;
            stats[j2].pj++;

            const ganador = res === 'G' ? j1 : (res === 'P' ? j2 : null);
            if (ganador) stats[ganador].g++;

            const clave = [j1, j2].sort().join('_vs_');
            if (!cruces[clave]) cruces[clave] = { victorias: { [j1]: 0, [j2]: 0 }, total: 0 };
            if (ganador) {
                cruces[clave].victorias[ganador] = (cruces[clave].victorias[ganador] || 0) + 1;
                cruces[clave].total++;
            }
        });

    probData.jugadores = {};
    ranking.forEach(r => {
        const s = stats[r.nombre];
        probData.jugadores[r.nombre] = {
            ranking: r.ranking,
            winRate: s && s.pj > 0 ? s.g / s.pj : 0
        };
    });

    probData.cruces = cruces;
    probData.listo = true;
}

// Probabilidad de que gane el primero, entre 0 y 1.
// Devuelve null si no se puede calcular (jugador desconocido o datos sin cargar).
function probabilidadGana1(nombre1, nombre2) {
    if (!probData.listo) return null;

    const a = probData.jugadores[nombre1];
    const b = probData.jugadores[nombre2];
    if (!a || !b) return null;

    return probabilidadEntre(
        { nombre: nombre1, ranking: a.ranking, winRate: a.winRate },
        { nombre: nombre2, ranking: b.ranking, winRate: b.winRate },
        probData.cruces[[nombre1, nombre2].sort().join('_vs_')]
    );
}

// Cuántas veces se enfrentaron, para poder mostrar el historial al lado.
function historialEntre(nombre1, nombre2) {
    const cruce = probData.cruces[[nombre1, nombre2].sort().join('_vs_')];
    if (!cruce || cruce.total === 0) return null;
    return {
        total: cruce.total,
        victorias1: cruce.victorias[nombre1] || 0,
        victorias2: cruce.victorias[nombre2] || 0
    };
}

// Probabilidad de que cada uno salga campeón, a partir de los dos cruces de
// semifinales. No hace falta simular: con cuatro jugadores se calcula exacto.
//
//   P(A campeón) = P(A gana su semi) × [ P(C gana la otra) × P(A le gana a C)
//                                      + P(D gana la otra) × P(A le gana a D) ]
//
// Acepta los cruces como pares ([[a,b],[c,d]], que es como se guardan en el
// JSON del torneo) o como objetos ([{j1,j2},{j1,j2}]).
//
// `ganadores` (opcional) es [ganadorSF1, ganadorSF2], con null donde la semi
// todavía no se jugó. Una semi ya jugada deja de ser un azar: el que ganó pasa
// con probabilidad 1 y el que perdió queda en 0, y las cuentas de la final se
// recalculan solas con eso.
//
// Devuelve [{ nombre, campeon, final, eliminado }] ordenado de mayor a menor.
function probabilidadesDeCampeon(semis, ganadores) {
    if (!semis || semis.length !== 2) return null;

    const comoPar = s => Array.isArray(s) ? s : [s.j1, s.j2];
    const [a, b] = comoPar(semis[0]);
    const [c, d] = comoPar(semis[1]);
    if (!a || !b || !c || !d) return null;

    const g = ganadores || [null, null];

    // Si la semi ya se jugó, no hay nada que estimar
    const pA = g[0] ? (g[0] === a ? 1 : 0) : probabilidadGana1(a, b);
    const pC = g[1] ? (g[1] === c ? 1 : 0) : probabilidadGana1(c, d);
    if (pA === null || pC === null) return null;

    const llegaFinal = { [a]: pA, [b]: 1 - pA, [c]: pC, [d]: 1 - pC };

    // Para cada uno, se promedia contra los dos rivales posibles del otro cruce,
    // pesando por la chance de que a cada uno le toque enfrentarlo.
    const campeon = {};
    [[a, b, c, d], [c, d, a, b]].forEach(([x, y, r1, r2]) => {
        [x, y].forEach(jug => {
            const pRival1 = llegaFinal[r1];
            const pRival2 = llegaFinal[r2];
            campeon[jug] = llegaFinal[jug] * (
                pRival1 * probabilidadGana1(jug, r1) +
                pRival2 * probabilidadGana1(jug, r2)
            );
        });
    });

    return [a, b, c, d]
        .map(nombre => ({
            nombre,
            campeon: campeon[nombre],
            final: llegaFinal[nombre],
            eliminado: llegaFinal[nombre] === 0
        }))
        .sort((x, y) => y.campeon - x.campeon);
}

// =====================================================
// DIBUJO: la barra de probabilidad
// =====================================================
// El bloque "fulano X% - Y% mengano" que se usa en las tarjetas del
// bracket, en las filas de Resultados de un torneo y en los partidos que
// faltan de una jornada de la Nations League. Los estilos estan en
// css/probabilidades.css.

// Clase de color segun la probabilidad, igual que en la pagina de Playoffs.
function claseProb(p) {
    if (p >= 0.65) return 'alta';
    if (p >= 0.45) return 'media-alta';
    if (p >= 0.25) return 'media';
    return 'baja';
}

function porcentaje(p) {
    return (p * 100).toFixed(1) + '%';
}

// `compacta` es para cuando el bloque va dentro de una celda de tabla.
function barraProbabilidad(j1, j2, compacta = false) {
    const prob = probabilidadGana1(j1, j2);
    if (prob === null) {
        return `<div class="prob-sin-datos">Sin datos para estimar</div>`;
    }

    const c1 = claseProb(prob);
    const c2 = claseProb(1 - prob);

    return `
        <div class="prob-bloque${compacta ? ' compacta' : ''}">
            <div class="sf-split-bar">
                <div class="split-segment ${c1}" style="width:${prob * 100}%"></div>
                <div class="split-segment ${c2}" style="width:${(1 - prob) * 100}%"></div>
            </div>
            <div class="prob-badges">
                <span class="sf-prob-badge ${c1}">${porcentaje(prob)}</span>
                <span class="sf-prob-badge ${c2}">${porcentaje(1 - prob)}</span>
            </div>
        </div>`;
}
