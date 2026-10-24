// =====================================================
// FORMATOS DE TORNEO: fixture, fases y cruces
// =====================================================
// Lógica pura (sin DOM y sin red) para armar un torneo desde cero:
// qué partidos hay que jugar, en qué fase va cada uno y cómo se
// siembran los playoffs a partir de las tablas.
//
// La usa la app de carga (/app) para el modo Torneo. Es un script
// clásico (no módulo), así que se puede incluir con <script src>
// igual que el resto del sitio.
//
// IMPORTANTE: los nombres de fase que salen de acá se escriben tal cual
// en enfrentamientos_directos.txt y no son cosméticos:
//   - historial_torneos.js detecta si el torneo fue liga o grupos
//     preguntando si alguna fase es exactamente "Fase de Liga".
//   - rankingCalculator.js reparte los puntos base del Ranking FIFA
//     mirando la fase (30 para semifinal/tercer puesto/final/eliminatorio,
//     2 para amistosos, 20 para el resto).
// Si se cambian estas cadenas, se rompen las dos cosas en silencio.
// =====================================================

const FASE_LIGA = 'Fase de Liga';
const FASE_SEMIFINAL = 'Semifinal';
const FASE_TERCER_PUESTO = 'Tercer Puesto';
const FASE_FINAL = 'Final';
const FASE_REPECHAJE_2 = 'Repechaje 2° Puestos';
const FASE_REPECHAJE_3 = 'Repechaje 3° Puestos';
const FASE_ELIMINATORIO = 'Partido Eliminatorio';

const LETRAS_GRUPO = ['A', 'B', 'C'];

// Los cinco formatos que banca el torneo, según cuántos jugadores haya.
// "tamanos" define cómo se reparten los jugadores en los grupos.
const FORMATOS = {
    6:  { tipo: 'liga',   tamanos: [6],       etiqueta: 'Liga de 6 (todos contra todos)' },
    7:  { tipo: 'liga',   tamanos: [7],       etiqueta: 'Liga de 7 (todos contra todos)' },
    8:  { tipo: 'grupos', tamanos: [4, 4],    etiqueta: '2 grupos de 4' },
    9:  { tipo: 'grupos', tamanos: [3, 3, 3], etiqueta: '3 grupos de 3 + repechajes', repechajes: true },
    10: { tipo: 'grupos', tamanos: [5, 5],    etiqueta: '2 grupos de 5' }
};

function getFormato(numJugadores) {
    return FORMATOS[numJugadores] || null;
}

// Reparte los jugadores (ya mezclados) en los grupos del formato.
// Para liga devuelve { all: [...] }, igual que hace torneo.js en el sitio.
function repartirEnGrupos(jugadores, numJugadores) {
    const formato = getFormato(numJugadores);
    if (!formato) return null;

    if (formato.tipo === 'liga') {
        return { all: jugadores.slice() };
    }

    const grupos = {};
    let desde = 0;
    formato.tamanos.forEach((tam, i) => {
        grupos[LETRAS_GRUPO[i]] = jugadores.slice(desde, desde + tam);
        desde += tam;
    });
    return grupos;
}

// Todos contra todos dentro de una lista de jugadores.
function roundRobin(jugadores, fase) {
    const partidos = [];
    for (let i = 0; i < jugadores.length; i++) {
        for (let j = i + 1; j < jugadores.length; j++) {
            partidos.push({ j1: jugadores[i], j2: jugadores[j], fase });
        }
    }
    return partidos;
}

// Fixture de la fase regular (liga o grupos). Los repechajes y los playoffs
// no salen de acá porque dependen de cómo vayan quedando las tablas.
function generarFixtureRegular(grupos) {
    if (grupos.all) {
        return roundRobin(grupos.all, FASE_LIGA);
    }

    const partidos = [];
    Object.keys(grupos).sort().forEach(letra => {
        partidos.push(...roundRobin(grupos[letra], `Fase de Grupos (${letra})`));
    });
    return partidos;
}

// Nombre de la fase regular que le toca a un grupo.
function faseDelGrupo(letra) {
    return letra === 'all' ? FASE_LIGA : `Fase de Grupos (${letra})`;
}

// =====================================================
// Clasificación a playoffs
// =====================================================
// Devuelve los 4 clasificados a semifinales, o null si la fase previa
// todavía no terminó. `tablaDe(jugadores, fase)` la provee quien llama
// (la app usa processStandings de historial_torneos.js, así la tabla es
// exactamente la misma que muestra el sitio).
//
// - Liga: entran los 4 primeros.
// - 2 grupos: entran los 2 primeros de cada uno.
// - 3 grupos (formato de 9): entran los 3 ganadores de grupo + el ganador
//   del partido eliminatorio entre los repechajes.
function calcularClasificados(grupos, tablas, ganadorEliminatorio) {
    if (grupos.all) {
        const t = tablas['all'] || [];
        if (t.length < 4) return null;
        return [t[0].nombre, t[1].nombre, t[2].nombre, t[3].nombre];
    }

    const letras = Object.keys(grupos).sort();

    if (letras.length === 2) {
        const [a, b] = letras.map(l => tablas[l] || []);
        if (a.length < 2 || b.length < 2) return null;
        return [a[0].nombre, a[1].nombre, b[0].nombre, b[1].nombre];
    }

    // Tres grupos: ganadores + el que salga del eliminatorio
    const ganadores = letras.map(l => (tablas[l] || [])[0]);
    if (ganadores.some(g => !g)) return null;
    if (!ganadorEliminatorio) return null;
    return [...ganadores.map(g => g.nombre), ganadorEliminatorio];
}

// Los cruces de semifinales.
//
// - Liga: 1 vs 4 y 2 vs 3.
// - 2 grupos: A1 vs B2 y B1 vs A2 (clásico cruzado, para que los dos
//   primeros no se encuentren antes de la final).
// - 3 grupos: el mejor ganador de grupo se cruza con el que entró por
//   repechaje, y los otros dos ganadores entre sí. Es una decisión nuestra:
//   formatos.md no dice cómo sembrar este caso, y premiar al mejor primero
//   con el rival que llegó por la ventana es lo más parecido al resto.
function calcularSemifinales(grupos, tablas, ganadorEliminatorio) {
    if (grupos.all) {
        const t = tablas['all'] || [];
        if (t.length < 4) return null;
        return [
            { j1: t[0].nombre, j2: t[3].nombre, fase: FASE_SEMIFINAL },
            { j1: t[1].nombre, j2: t[2].nombre, fase: FASE_SEMIFINAL }
        ];
    }

    const letras = Object.keys(grupos).sort();

    if (letras.length === 2) {
        const [a, b] = letras.map(l => tablas[l] || []);
        if (a.length < 2 || b.length < 2) return null;
        return [
            { j1: a[0].nombre, j2: b[1].nombre, fase: FASE_SEMIFINAL },
            { j1: b[0].nombre, j2: a[1].nombre, fase: FASE_SEMIFINAL }
        ];
    }

    const ganadores = letras.map(l => (tablas[l] || [])[0]);
    if (ganadores.some(g => !g) || !ganadorEliminatorio) return null;

    // Mejor ganador de grupo primero (mismos criterios que la tabla)
    const ordenados = ganadores.slice().sort(
        (x, y) => y.pts - x.pts || y.dif - x.dif || y.gf - x.gf
    );
    return [
        { j1: ordenados[0].nombre, j2: ganadorEliminatorio, fase: FASE_SEMIFINAL },
        { j1: ordenados[1].nombre, j2: ordenados[2].nombre, fase: FASE_SEMIFINAL }
    ];
}

// Dado un partido ya jugado, quién ganó y quién perdió.
function ganadorDe(partido) {
    const [g1, g2] = String(partido.marcador).split('-').map(Number);
    return g1 > g2 ? partido.j1 : partido.j2;
}

function perdedorDe(partido) {
    const [g1, g2] = String(partido.marcador).split('-').map(Number);
    return g1 > g2 ? partido.j2 : partido.j1;
}

// La final y el tercer puesto salen de las dos semis ya jugadas.
// El tercer puesto va siempre: en el Tercer torneo se lo saltearon por
// olvido y quedó incompleto, así que acá se genera sí o sí.
function calcularDefiniciones(semisJugadas) {
    if (semisJugadas.length < 2) return [];

    const [s1, s2] = semisJugadas;
    return [
        { j1: ganadorDe(s1), j2: ganadorDe(s2), fase: FASE_FINAL },
        { j1: perdedorDe(s1), j2: perdedorDe(s2), fase: FASE_TERCER_PUESTO }
    ];
}

// =====================================================
// Repechajes (solo formato de 9)
// =====================================================
// Los tres segundos juegan entre sí, los tres terceros también, y los
// dos ganadores definen el último lugar de playoffs en un partido.
function calcularRepechajes(grupos, tablas) {
    const letras = Object.keys(grupos).sort();
    if (letras.length !== 3) return [];

    const segundos = letras.map(l => (tablas[l] || [])[1]).filter(Boolean);
    const terceros = letras.map(l => (tablas[l] || [])[2]).filter(Boolean);
    if (segundos.length !== 3 || terceros.length !== 3) return [];

    return [
        ...roundRobin(segundos.map(s => s.nombre), FASE_REPECHAJE_2),
        ...roundRobin(terceros.map(s => s.nombre), FASE_REPECHAJE_3)
    ];
}

// El eliminatorio cruza a los ganadores de las dos mini-ligas.
function calcularEliminatorio(tablaRepechaje2, tablaRepechaje3) {
    if (!tablaRepechaje2?.length || !tablaRepechaje3?.length) return null;
    return {
        j1: tablaRepechaje2[0].nombre,
        j2: tablaRepechaje3[0].nombre,
        fase: FASE_ELIMINATORIO
    };
}

// Mezcla al azar (Fisher-Yates), para el sorteo de grupos.
function mezclar(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Nombre sugerido para el torneo siguiente, mirando cuántos ya hay.
const ORDINALES = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto', 'Sexto',
                   'Séptimo', 'Octavo', 'Noveno', 'Décimo'];

function nombreSugerido(cantidadDeTorneosPrevios) {
    const ordinal = ORDINALES[cantidadDeTorneosPrevios] || `Torneo ${cantidadDeTorneosPrevios + 1}`;
    return `${ordinal} torneo de hockey de mesa`;
}

// Nombre de archivo para el JSON de estado: "Cuarto torneo de hockey de
// mesa" -> "torneos/cuarto-torneo-de-hockey-de-mesa.json"
function rutaEstado(nombreTorneo) {
    const slug = String(nombreTorneo)
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // saca acentos
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return `torneos/${slug}.json`;
}

// Para que lo vean tanto el navegador como los tests en Node.
if (typeof window !== 'undefined') {
    Object.assign(window, {
        FASE_LIGA, FASE_SEMIFINAL, FASE_TERCER_PUESTO, FASE_FINAL,
        FASE_REPECHAJE_2, FASE_REPECHAJE_3, FASE_ELIMINATORIO,
        FORMATOS, getFormato, repartirEnGrupos, roundRobin,
        generarFixtureRegular, faseDelGrupo, calcularClasificados,
        calcularSemifinales, calcularDefiniciones, calcularRepechajes,
        calcularEliminatorio, ganadorDe, perdedorDe, mezclar,
        nombreSugerido, rutaEstado
    });
}
