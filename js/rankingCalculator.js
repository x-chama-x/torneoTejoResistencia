// =====================================================
// CALCULADORA DE RANKING FIFA (SISTEMA ANTI-INFLACIÓN)
// =====================================================
// Calcula el ranking FIFA en vivo a partir del historial de
// partidos (enfrentamientos_directos.txt), en vez de leerlo de
// un archivo ranking.txt subido a mano.
//
// Metodología (ver Ranking_FIFA_EXPLICADO.md):
// 1. Sistema de Suma Cero (puntos ganados = puntos perdidos).
// 2. Multiplicador dinámico por diferencia de puntos (tipo ELO).
// 3. Puntos base reducidos para partidos Amistosos.
// 4. Empates (solo metegol por tiempo): el favorito le pasa al otro hasta
//    la mitad de los puntos base, según la diferencia (entre parejos, nada).
// =====================================================

// Base histórica con la que arranca el ranking de cada deporte (en el
// tejo, la que quedó tras el Torneo 1: sus partidos ya están reflejados
// ahí, por lo que se omiten al procesar el historial). Vive en
// js/deportes.js: rankingBase y torneoIncluidoEnBase.

const NUEVO_JUGADOR_PUNTOS = 15.0; // Puntos con los que ingresa un nuevo jugador
const PISO_MINIMO_PUNTOS = 5.0;    // Protección contra puntos negativos / demasiado bajos

// Parsea una fecha "D/M/YYYY" o "DD/MM/YYYY" a una clave comparable.
function parsearFechaClave(fechaStr) {
    const partes = fechaStr.split('/').map(p => parseInt(p.trim(), 10));
    if (partes.length === 3 && partes.every(p => !isNaN(p))) {
        const [dia, mes, anio] = partes;
        return anio * 10000 + mes * 100 + dia;
    }
    return 0;
}

// Parsea el contenido de enfrentamientos_directos.txt en partidos utilizables
// para el cálculo del ranking (omite los del Torneo 1, ya incorporados en la base).
function parsearPartidosParaRanking(texto) {
    const lineas = texto.split('\n');
    const partidos = [];

    for (const linea of lineas) {
        const lineaTrimmed = linea.trim();
        if (!lineaTrimmed || lineaTrimmed.startsWith('#') || lineaTrimmed.startsWith('=')) {
            continue;
        }

        const partes = lineaTrimmed.split(',');
        if (partes.length < 7) continue;

        const [j1, j2, resJ1, , torneo, fecha, fase] = partes.map(p => p.trim());

        if (DEPORTE.torneoIncluidoEnBase && torneo.toLowerCase() === DEPORTE.torneoIncluidoEnBase) {
            continue;
        }

        partidos.push({ j1, j2, resJ1, torneo, fecha, fase, fechaClave: parsearFechaClave(fecha) });
    }

    // Orden cronológico estable (Array.sort es estable desde ES2019), para
    // aplicar el historial de puntos en el mismo orden que ocurrieron los partidos.
    partidos.sort((a, b) => a.fechaClave - b.fechaClave);

    return partidos;
}

// Calcula el ranking FIFA a partir del texto crudo de enfrentamientos_directos.txt.
// Devuelve un array [{nombre, ranking}] ordenado de mayor a menor.
// Con opciones.antesDe = <nombre de un torneo>, se frena justo antes del
// primer partido de ese torneo: es el ranking con el que se llegó a él.
function calcularRankingDesdeTexto(texto, opciones = {}) {
    const partidos = parsearPartidosParaRanking(texto);
    const ranking = Object.assign({}, DEPORTE.rankingBase);
    const antesDe = opciones && opciones.antesDe;

    for (const partido of partidos) {
        const { j1, j2, resJ1, torneo, fase } = partido;

        if (antesDe && torneo === antesDe) break;

        if (!(j1 in ranking)) ranking[j1] = NUEVO_JUGADOR_PUNTOS;
        if (!(j2 in ranking)) ranking[j2] = NUEVO_JUGADOR_PUNTOS;

        const faseLower0 = fase.toLowerCase();
        const torneoLower0 = torneo.toLowerCase();

        // Empate (solo en el metegol por tiempo): como en el ELO del ajedrez,
        // entre dos parejos no cambia nada, y si uno era favorito le pasa
        // algunos puntos al otro (más cuanto más grande la diferencia, con
        // tope en la mitad de los puntos base del partido).
        if (resJ1.toUpperCase() === 'E') {
            const base = (faseLower0.includes('amistoso') || torneoLower0.includes('amistoso')) ? 2.0 : 20.0;
            const fuerte = ranking[j1] >= ranking[j2] ? j1 : j2;
            const debil = fuerte === j1 ? j2 : j1;
            const D = ranking[fuerte] - ranking[debil];
            const pasa = base * Math.min(0.5, D / 200.0);
            ranking[debil] += pasa;
            ranking[fuerte] = Math.max(PISO_MINIMO_PUNTOS, ranking[fuerte] - pasa);
            continue;
        }

        const ganador = resJ1.toUpperCase() === 'G' ? j1 : j2;
        const perdedor = resJ1.toUpperCase() === 'G' ? j2 : j1;

        const faseLower = fase.toLowerCase();
        const torneoLower = torneo.toLowerCase();

        let basePts;
        if (faseLower.includes('amistoso') || torneoLower.includes('amistoso')) {
            basePts = 2.0;
        } else if (['semifinal', 'tercer puesto', 'final', 'eliminatorio'].some(f => faseLower.includes(f))) {
            // El Partido Eliminatorio del formato de 9 jugadores define un lugar
            // en playoffs a un solo partido, así que vale como partido decisivo.
            basePts = 30.0;
        } else {
            // Fase de Liga, Fase de Grupos y los Repechajes (mini-ligas del
            // formato de 9 jugadores), que son partidos de fase regular.
            basePts = 20.0;
        }

        const ptsGanador = ranking[ganador];
        const ptsPerdedor = ranking[perdedor];

        const fuerte = ptsGanador >= ptsPerdedor ? ganador : perdedor;
        const debil = fuerte === ganador ? perdedor : ganador;
        const D = ranking[fuerte] - ranking[debil];

        // Multiplicador tipo ELO según diferencia de puntos
        const mult = ganador === fuerte
            ? Math.max(0.1, 1.0 - (D / 200.0))   // Victoria esperada: atenuador
            : 1.0 + (D / 100.0);                  // Batacazo / upset: amplificador

        const earned = basePts * mult;

        ranking[ganador] = ptsGanador + earned;
        ranking[perdedor] = Math.max(PISO_MINIMO_PUNTOS, ptsPerdedor - earned);
    }

    return Object.entries(ranking)
        .map(([nombre, puntos]) => ({ nombre, ranking: Math.round(puntos * 10) / 10 }))
        .sort((a, b) => b.ranking - a.ranking);
}

// Fetch + cálculo en un solo paso, para las páginas que solo necesitan el ranking
// (no el historial detallado de partidos).
async function cargarRankingCalculado() {
    const response = await fetch(DEPORTE.archivoPartidos);
    if (!response.ok) {
        throw new Error(`No se pudo cargar el archivo ${DEPORTE.archivoPartidos}`);
    }
    const texto = await response.text();
    return calcularRankingDesdeTexto(texto);
}

// =====================================================
// RANKING CON EL QUE SE LLEGA A UN TORNEO (desempate de las tablas)
// =====================================================
// En el tejo, si tres o más quedan empatados en todo en una tabla, se
// ordenan por el ranking FIFA con el que cada uno llegó al torneo (ver
// ordenarPosiciones en lib/torneo-formatos.js). Es el ranking procesando el
// historial hasta justo antes del primer partido del torneo: no se mueve
// mientras se juega el torneo ni cuando después se suman partidos, así la
// tabla de un torneo ya jugado queda siempre igual. Si el torneo todavía
// no tiene partidos, es el ranking de hoy.
//
// Devuelve una función nombre -> puntos (el que debuta, los 15 con los que
// entra), o null si este deporte no desempata así (DEPORTE.desempatePorRanking)
// o si no hay un ranking previo a ese torneo: el Torneo 1, que ya viene
// sumado en la base del ranking.
function rankingParaDesempate(texto, nombreTorneo) {
    if (!DEPORTE.desempatePorRanking || !texto || !nombreTorneo) return null;
    if (DEPORTE.torneoIncluidoEnBase &&
        String(nombreTorneo).trim().toLowerCase() === DEPORTE.torneoIncluidoEnBase) return null;

    const puntos = {};
    calcularRankingDesdeTexto(texto, { antesDe: String(nombreTorneo).trim() })
        .forEach(r => { puntos[r.nombre] = r.ranking; });
    return nombre => (nombre in puntos ? puntos[nombre] : NUEVO_JUGADOR_PUNTOS);
}

window.calcularRankingDesdeTexto = calcularRankingDesdeTexto;
window.cargarRankingCalculado = cargarRankingCalculado;
window.rankingParaDesempate = rankingParaDesempate;
