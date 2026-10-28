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
// de ese ajuste es proporcional a cuántas veces se enfrentaron contra el
// máximo del grupo, así un 1-0 entre dos que jugaron una sola vez pesa
// mucho menos que un 6-1 entre dos que se enfrentaron siete veces.
//
// Al final todo pasa por una sigmoide (k=30), que convierte la diferencia
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

const PROB_K = 30;                 // suavidad de la sigmoide
const PESO_RANKING = 0.4;
const PESO_WINRATE = 0.6;
const PESO_HISTORIAL = 0.4;        // tope del ajuste por enfrentamiento directo

const probData = {
    listo: false,
    jugadores: {},                 // nombre -> { ranking, winRate }
    cruces: {},                    // "A_vs_B" -> { victorias: {A: n, B: n}, total }
    maxCruces: 1
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
    probData.maxCruces = Math.max(1, ...Object.values(cruces).map(c => c.total));
    probData.listo = true;
}

// Probabilidad de que gane el primero, entre 0 y 1.
// Devuelve null si no se puede calcular (jugador desconocido o datos sin cargar).
function probabilidadGana1(nombre1, nombre2) {
    if (!probData.listo) return null;

    const a = probData.jugadores[nombre1];
    const b = probData.jugadores[nombre2];
    if (!a || !b) return null;

    let fuerza1 = (a.ranking * PESO_RANKING) + (a.winRate * 100 * PESO_WINRATE);
    let fuerza2 = (b.ranking * PESO_RANKING) + (b.winRate * 100 * PESO_WINRATE);

    const cruce = probData.cruces[[nombre1, nombre2].sort().join('_vs_')];
    if (cruce && cruce.total > 0) {
        const wr1 = (cruce.victorias[nombre1] || 0) / cruce.total;
        const wr2 = (cruce.victorias[nombre2] || 0) / cruce.total;
        const peso = PESO_HISTORIAL * (cruce.total / probData.maxCruces);

        fuerza1 += (wr1 - 0.5) * 100 * peso;
        fuerza2 += (wr2 - 0.5) * 100 * peso;
    }

    return 1 / (1 + Math.exp(-(fuerza1 - fuerza2) / PROB_K));
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
// Devuelve [{ nombre, campeon, final }] ordenado de mayor a menor, donde
// "final" es la probabilidad de llegar a la final.
function probabilidadesDeCampeon(semis) {
    if (!semis || semis.length !== 2) return null;

    const comoPar = s => Array.isArray(s) ? s : [s.j1, s.j2];
    const [a, b] = comoPar(semis[0]);
    const [c, d] = comoPar(semis[1]);
    if (!a || !b || !c || !d) return null;

    const pA = probabilidadGana1(a, b);
    const pC = probabilidadGana1(c, d);
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
        .map(nombre => ({ nombre, campeon: campeon[nombre], final: llegaFinal[nombre] }))
        .sort((x, y) => y.campeon - x.campeon);
}
