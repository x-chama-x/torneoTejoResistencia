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

// =====================================================
// Orden de juego: que nadie juegue dos partidos seguidos
// =====================================================
// Como se juega en una sola mesa, los partidos van uno atras del otro. Si el
// fixture sale en el orden "natural" (todos los de Chama, despues todos los
// de Rafa...), a alguno le toca jugar dos veces seguidas. En los tres torneos
// anteriores paso 3, 4 y 3 veces.
//
// Esto reordena la lista para que dos partidos consecutivos nunca compartan
// jugador. Cuando hay varios grupos ayuda muchisimo poder intercalarlos: los
// jugadores del grupo A y los del B son distintos, asi que alternar entre
// grupos ya resuelve casi todo.
//
// El algoritmo es una busqueda en profundidad con una heuristica: en cada
// paso prueba primero el partido cuyos jugadores hace mas tiempo que no
// juegan, asi ademas de no repetir, el descanso queda repartido. Si se traba,
// vuelve atras y prueba otra rama.
//
// Es determinista a proposito: la app y el sitio arman el fixture por
// separado a partir del mismo sorteo, asi que tienen que llegar al mismo
// orden sin ponerse de acuerdo.
//
// Cuando NO se puede evitar del todo:
// con pocos jugadores no existe ningun orden perfecto, no es cuestion de
// buscar mejor. Con 3 hay 3 partidos y los tres comparten a alguien. Con 4
// hay 6 partidos y cada uno tiene exactamente un rival disjunto (la pareja
// complementaria): el "grafo de compatibilidad" son tres aristas sueltas,
// asi que no hay forma de recorrer los 6 encadenados. Lo mejor posible con
// 4 jugadores son 2 repeticiones.
//
// Por eso la busqueda es por presupuesto: primero intenta con cero
// repeticiones y, si no existe, vuelve a intentar permitiendo una, dos, etc.
// Devuelve el primer orden que encuentra, que es el que menos repite. Antes
// devolvia la lista sin tocar, que es justo el peor orden (todos los de uno,
// despues todos los del otro): con 4 jugadores daba 4 repeticiones en vez
// de las 2 inevitables.
//
// Esto importa desde que existe el modo Jornada, donde se puede jugar con
// cualquier cantidad de gente. En los formatos de torneo no pasaba nunca.
function compartenJugador(a, b) {
    return a.j1 === b.j1 || a.j1 === b.j2 || a.j2 === b.j1 || a.j2 === b.j2;
}

function ordenarParaQueDescansen(partidos) {
    const n = partidos.length;
    if (n <= 2) return partidos.slice();

    const orden = new Array(n);
    const usado = new Array(n).fill(false);
    const ultimaVez = {};           // jugador -> posicion en la que jugo por ultima vez
    const SIN_JUGAR = -1000;        // para que el que nunca jugo tenga prioridad
    let nodos = 0;
    const MAX_NODOS = 300000;       // tope por si algun caso raro explota

    // `presupuesto` es cuantas repeticiones quedan permitidas. Con 0 el
    // comportamiento es el de siempre: solo acepta ordenes perfectos.
    function buscar(pos, presupuesto) {
        if (pos === n) return true;
        if (++nodos > MAX_NODOS) return false;

        const previo = pos > 0 ? orden[pos - 1] : null;

        const candidatos = [];
        for (let i = 0; i < n; i++) {
            if (usado[i]) continue;
            const p = partidos[i];
            const choca = !!previo && compartenJugador(previo, p);
            if (choca && presupuesto <= 0) continue;

            // Descanso = hace cuanto que juega el que jugo mas recientemente
            const descanso = Math.min(
                pos - (ultimaVez[p.j1] ?? SIN_JUGAR),
                pos - (ultimaVez[p.j2] ?? SIN_JUGAR)
            );
            candidatos.push({ i, descanso, choca });
        }

        // Primero los que no repiten; despues, mas descanso primero; ante
        // igualdad, el orden original (para que sea determinista)
        candidatos.sort((a, b) =>
            (a.choca ? 1 : 0) - (b.choca ? 1 : 0) || b.descanso - a.descanso || a.i - b.i);

        for (const { i, choca } of candidatos) {
            const p = partidos[i];
            const previa1 = ultimaVez[p.j1];
            const previa2 = ultimaVez[p.j2];

            usado[i] = true;
            orden[pos] = p;
            ultimaVez[p.j1] = pos;
            ultimaVez[p.j2] = pos;

            if (buscar(pos + 1, presupuesto - (choca ? 1 : 0))) return true;

            usado[i] = false;
            if (previa1 === undefined) delete ultimaVez[p.j1]; else ultimaVez[p.j1] = previa1;
            if (previa2 === undefined) delete ultimaVez[p.j2]; else ultimaVez[p.j2] = previa2;
        }

        return false;
    }

    // Primero el orden perfecto; si no existe, se va permitiendo una
    // repeticion mas por vuelta. El tope es por las dudas: con 5 jugadores
    // o mas siempre se resuelve en la primera.
    const MAX_REPETICIONES = 6;
    for (let presupuesto = 0; presupuesto <= MAX_REPETICIONES; presupuesto++) {
        nodos = 0;
        usado.fill(false);
        for (const k of Object.keys(ultimaVez)) delete ultimaVez[k];
        if (buscar(0, presupuesto)) return orden.slice();
    }

    return partidos.slice();
}

// Cuenta cuantas veces alguien jugaria dos partidos seguidos en un orden dado.
// Lo usan los tests y sirve para verificar un fixture.
function contarPartidosSeguidos(partidos) {
    let n = 0;
    for (let i = 1; i < partidos.length; i++) {
        if (compartenJugador(partidos[i - 1], partidos[i])) n++;
    }
    return n;
}

// Fixture de la fase regular (liga o grupos). Los repechajes y los playoffs
// no salen de acá porque dependen de cómo vayan quedando las tablas.
//
// Los grupos se arman por separado y después se mezclan en un solo orden de
// juego, para poder intercalarlos y que nadie repita.
function generarFixtureRegular(grupos) {
    if (grupos.all) {
        return ordenarParaQueDescansen(roundRobin(grupos.all, FASE_LIGA));
    }

    const partidos = [];
    Object.keys(grupos).sort().forEach(letra => {
        partidos.push(...roundRobin(grupos[letra], `Fase de Grupos (${letra})`));
    });
    return ordenarParaQueDescansen(partidos);
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
// NO se siembran solos: se sortean. Los tres torneos anteriores los sortearon
// (ninguno uso 1v4 y 2v3), asi que la app muestra un boton de sorteo cuando
// termina la fase regular y recien ahi quedan definidos.
//
// Como el sorteo es al azar, hay que GUARDARLO en el JSON del torneo: si no,
// la app y el sitio armarian cada uno un bracket distinto. Esta funcion
// entonces solo reconstruye los cruces a partir de lo sorteado; devuelve null
// mientras no se haya sorteado.
function calcularSemifinales(grupos, tablas, ganadorEliminatorio, semisSorteadas) {
    if (!semisSorteadas || semisSorteadas.length !== 2) return null;

    return semisSorteadas.map(par => ({
        j1: par[0],
        j2: par[1],
        fase: FASE_SEMIFINAL
    }));
}

// Sortea los cuatro clasificados en dos cruces. Devuelve [[a,b],[c,d]].
function sortearSemifinales(clasificados) {
    if (!clasificados || clasificados.length !== 4) return null;
    const m = mezclar(clasificados);
    return [[m[0], m[1]], [m[2], m[3]]];
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

    // Las dos mini-ligas se intercalan: son jugadores distintos, asi que
    // alternando entre ellas nadie juega dos veces seguidas (por separado
    // seria imposible, porque un grupo de 3 no tiene orden valido).
    return ordenarParaQueDescansen([
        ...roundRobin(segundos.map(s => s.nombre), FASE_REPECHAJE_2),
        ...roundRobin(terceros.map(s => s.nombre), FASE_REPECHAJE_3)
    ]);
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

// =====================================================
// DESEMPATE EN LAS TABLAS
// =====================================================
// Orden: puntos, diferencia de gol, goles a favor y partidos ganados. Si
// quedan EXACTAMENTE dos empatados en todo eso, decide el enfrentamiento
// directo entre ellos: los goles de sus partidos dentro de esta fase (en
// liga es uno solo, asi que es quien gano ese partido).
//
// En el tejo los puntos son los goles a favor, asi que ese criterio no
// desempata nada y en la practica queda: puntos, diferencia, ganados y
// directo. En el metegol (3-1-0) los goles a favor si cuentan.
//
// Los ganados casi siempre van de la mano de la diferencia, pero no
// siempre: dos pueden tener los mismos goles a favor y en contra con
// distinta cantidad de victorias (uno gano apretado y perdio por mucho, el
// otro al reves). Ahi gana el que gano mas partidos, antes de mirar el
// directo. Se cuentan con los partidos de la fase (un empate no suma).
//
// Con tres o mas el mano a mano no sirve, porque puede ser circular (A le
// gana a B, B a C y C a A). En el tejo se ordenan por el RANKING FIFA CON
// EL QUE LLEGARON AL TORNEO (opciones.rankingDe, ver ordenarPorRanking mas
// abajo), asi no hace falta jugar partidos extra. Donde no hay ranking (el
// metegol, o el Torneo 1, que ya viene sumado en la base del ranking)
// quedan en el orden en que vinieron y se devuelven en `empatesSinResolver`
// para avisar en pantalla.
//
// La usan las tablas de los torneos (processStandings, en
// js/historial_torneos.js, que tambien usa la app) y el simulador, asi
// los dos ordenan igual. Antes el simulador tenia su propio orden (puntos,
// partidos ganados, diferencia) y nunca miraba el enfrentamiento directo.
//
//   filas:    [{ nombre, pts, gf, gc, ... }]   no se modifican
//   partidos: [{ j1, j2, g1, g2 }]             los de esta fase
//   opciones: { rankingDe }                    nombre -> puntos del ranking
//             con el que llego al torneo (rankingParaDesempate, en
//             js/rankingCalculator.js). Sin eso, como antes.
//
// Devuelve la tabla ordenada con tres cosas colgadas, para los avisos de
// abajo de la tabla (htmlAvisosDeDesempate):
//   .desempatadosPorRanking  los grupos de 3 o mas que ordeno el ranking
//   .empatesSinResolver      los que siguen empatados y hay que definir a mano
//   .rankingAplicado         si se le paso un ranking
function ordenarPosiciones(filas, partidos, opciones = {}) {
    const rankingDe = opciones && typeof opciones.rankingDe === 'function' ? opciones.rankingDe : null;
    const dif = s => s.gf - s.gc;
    const ganados = contarGanados(partidos);
    const g = s => ganados[s.nombre] || 0;
    const tabla = filas.slice().sort((a, b) =>
        b.pts - a.pts || dif(b) - dif(a) || b.gf - a.gf || g(b) - g(a));

    const empatesSinResolver = [];
    const desempatadosPorRanking = [];
    let i = 0;
    while (i < tabla.length) {
        let fin = i;
        while (fin + 1 < tabla.length && empatanEnTodo(tabla[fin], tabla[fin + 1], ganados)) fin++;

        const empatados = fin - i + 1;
        if (empatados === 2) {
            // Si el de abajo gano el mano a mano, se intercambian
            if (ganoElDirecto(tabla[i + 1].nombre, tabla[i].nombre, partidos)) {
                [tabla[i], tabla[i + 1]] = [tabla[i + 1], tabla[i]];
            }
        } else if (empatados > 2) {
            // Al arranque de un torneo estan todos en cero: a los que todavia
            // no jugaron no se los toca ni se avisa, seria puro ruido
            const grupo = tabla.slice(i, fin + 1);
            const jugo = s => partidos.some(m => m.j1 === s.nombre || m.j2 === s.nombre);
            if (grupo.some(jugo)) {
                if (rankingDe) {
                    const r = ordenarPorRanking(grupo, partidos, rankingDe);
                    tabla.splice(i, grupo.length, ...r.orden);
                    desempatadosPorRanking.push(r.aviso);
                    empatesSinResolver.push(...r.sinResolver);
                } else {
                    empatesSinResolver.push(grupo.map(s => s.nombre));
                }
            }
        }
        i = fin + 1;
    }

    // Colgado del array para no cambiar lo que devuelve (la usan varios lados)
    tabla.empatesSinResolver = empatesSinResolver;
    tabla.desempatadosPorRanking = desempatadosPorRanking;
    tabla.rankingAplicado = !!rankingDe;
    return tabla;
}

// Tres o mas empatados en todo (tejo): van de mayor a menor ranking FIFA con
// el que llegaron al torneo. Si dos llegaron con exactamente el mismo
// ranking (por ejemplo, dos que debutan, los dos con 15), entre ellos
// decide el partido que jugaron, como en cualquier empate de a dos. Si son
// tres o mas con el mismo ranking, o ese partido no define, ese tramo queda
// para definir a mano.
function ordenarPorRanking(grupo, partidos, rankingDe) {
    const orden = grupo.slice().sort((a, b) => rankingDe(b.nombre) - rankingDe(a.nombre));
    const sinResolver = [];
    const porDirecto = [];
    let k = 0;
    while (k < orden.length) {
        let f = k;
        while (f + 1 < orden.length && rankingDe(orden[f + 1].nombre) === rankingDe(orden[k].nombre)) f++;
        if (f - k === 1) {
            if (ganoElDirecto(orden[f].nombre, orden[k].nombre, partidos)) {
                [orden[k], orden[f]] = [orden[f], orden[k]];
            }
            if (ganoElDirecto(orden[k].nombre, orden[f].nombre, partidos)) {
                porDirecto.push([orden[k].nombre, orden[f].nombre]);
            } else {
                sinResolver.push([orden[k].nombre, orden[f].nombre]);
            }
        } else if (f - k > 1) {
            sinResolver.push(orden.slice(k, f + 1).map(s => s.nombre));
        }
        k = f + 1;
    }
    return {
        orden,
        sinResolver,
        aviso: { jugadores: orden.map(s => ({ nombre: s.nombre, ranking: rankingDe(s.nombre) })), porDirecto }
    };
}

// "A", "A y B", "A, B y C"
function listaConY(nombres) {
    return nombres.length > 1
        ? `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
        : (nombres[0] || '');
}

// Textos de los avisos de abajo de una tabla (en HTML). Los usan las tablas
// de los torneos, el simulador y la app, asi dicen lo mismo en todos lados.
//   porRanking:  los grupos que se ordenaron por el ranking (tejo)
//   sinResolver: los que hay que definir a mano
function textosDeDesempate(tabla) {
    const porRanking = ((tabla && tabla.desempatadosPorRanking) || []).map(d => {
        const quienes = listaConY(d.jugadores.map(j => j.nombre));
        const puntos = listaConY(d.jugadores.map(j => `${j.nombre} ${j.ranking}`));
        const directo = d.porDirecto.map(([ganador, perdedor]) =>
            ` ${ganador} y ${perdedor} llegaron con el mismo ranking, así que entre ellos decidió el partido que jugaron.`).join('');
        return `⚖️ <strong>${quienes}</strong> quedaron empatados en puntos, diferencia, goles a favor y partidos ganados, así que se ordenaron por el ranking FIFA con el que llegaron al torneo: ${puntos}.${directo}`;
    });
    const sinResolver = ((tabla && tabla.empatesSinResolver) || []).map(grupo => tabla.rankingAplicado
        ? `⚠️ <strong>${listaConY(grupo)}</strong> además llegaron al torneo con el mismo ranking FIFA${grupo.length === 2 ? ' y el partido entre ellos no definió' : ''}, así que entre ellos el orden hay que definirlo a mano.`
        : `⚠️ <strong>${grupo.join(', ')}</strong> quedaron empatados en puntos, diferencia, goles a favor y partidos ganados. El enfrentamiento directo solo desempata entre dos, así que este orden hay que definirlo a mano.`);
    return { porRanking, sinResolver };
}

// Los mismos avisos como cajas, para las tablas del sitio (torneos y
// simulador): azul el que explica el orden por ranking, amarillo el que
// pide definir a mano. Devuelve '' si no hay nada que avisar.
function htmlAvisosDeDesempate(tabla) {
    const { porRanking, sinResolver } = textosDeDesempate(tabla);
    const caja = (clase, color, fondo, borde, textos) => textos.length
        ? `<div class="${clase}" style="margin-top: 10px; font-size: 0.85rem; color: ${color}; background: ${fondo}; border: 1px solid ${borde}; border-radius: 8px; padding: 10px 12px;">${textos.join('<br>')}</div>`
        : '';
    return caja('aviso-desempate-ranking', '#79c0ff', 'rgba(56, 139, 253, 0.1)', 'rgba(56, 139, 253, 0.35)', porRanking) +
        caja('aviso-empate-multiple', '#d29922', 'rgba(210, 153, 34, 0.1)', 'rgba(210, 153, 34, 0.35)', sinResolver);
}

// Ocupan la misma posicion si empatan en puntos, diferencia, goles a favor
// y partidos ganados. `ganados` es lo que devuelve contarGanados(); sin eso
// compara solo los tres primeros, como antes.
function empatanEnTodo(a, b, ganados) {
    const g = s => (ganados && ganados[s.nombre]) || 0;
    return a.pts === b.pts && (a.gf - a.gc) === (b.gf - b.gc) && a.gf === b.gf &&
        (!ganados || g(a) === g(b));
}

// Partidos ganados de cada jugador en una lista de partidos { j1, j2, g1, g2 }.
// Salen de los partidos y no de la tabla porque las tablas no los nombran
// igual (w en la de los torneos, pg en la del simulador).
function contarGanados(partidos) {
    const ganados = {};
    (partidos || []).forEach(m => {
        if (m.g1 > m.g2) ganados[m.j1] = (ganados[m.j1] || 0) + 1;
        else if (m.g2 > m.g1) ganados[m.j2] = (ganados[m.j2] || 0) + 1;
    });
    return ganados;
}

// ¿"jugador" le gano el mano a mano a "rival"? (goles de todos sus cruces)
function ganoElDirecto(jugador, rival, partidos) {
    let golesJugador = 0, golesRival = 0;
    partidos.forEach(m => {
        if (m.j1 === jugador && m.j2 === rival) { golesJugador += m.g1; golesRival += m.g2; }
        else if (m.j1 === rival && m.j2 === jugador) { golesJugador += m.g2; golesRival += m.g1; }
    });
    return golesJugador > golesRival;
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

// El sufijo y la carpeta salen del deporte (js/deportes.js). Sin DEPORTE
// cargado (tests en Node) quedan los del tejo.
function deporteActual() {
    return (typeof DEPORTE !== 'undefined' && DEPORTE)
        || { sufijoTorneo: 'torneo de hockey de mesa', carpetaTorneos: 'torneos' };
}

function nombreSugerido(cantidadDeTorneosPrevios) {
    const ordinal = ORDINALES[cantidadDeTorneosPrevios] || `Torneo ${cantidadDeTorneosPrevios + 1}`;
    return `${ordinal} ${deporteActual().sufijoTorneo}`;
}

// Nombre de archivo para el JSON de estado: "Cuarto torneo de hockey de
// mesa" -> "torneos/cuarto-torneo-de-hockey-de-mesa.json"
function rutaEstado(nombreTorneo) {
    const slug = String(nombreTorneo)
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '') // saca acentos
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return `${deporteActual().carpetaTorneos}/${slug}.json`;
}

// Para que lo vean tanto el navegador como los tests en Node.
if (typeof window !== 'undefined') {
    Object.assign(window, {
        FASE_LIGA, FASE_SEMIFINAL, FASE_TERCER_PUESTO, FASE_FINAL,
        FASE_REPECHAJE_2, FASE_REPECHAJE_3, FASE_ELIMINATORIO,
        FORMATOS, getFormato, repartirEnGrupos, roundRobin,
        generarFixtureRegular, faseDelGrupo, calcularClasificados,
        ordenarParaQueDescansen, contarPartidosSeguidos, compartenJugador,
        calcularSemifinales, sortearSemifinales, calcularDefiniciones, calcularRepechajes,
        calcularEliminatorio, ganadorDe, perdedorDe, mezclar,
        nombreSugerido, rutaEstado,
        ordenarPosiciones, empatanEnTodo, contarGanados, ganoElDirecto,
        ordenarPorRanking, listaConY, textosDeDesempate, htmlAvisosDeDesempate
    });
}
