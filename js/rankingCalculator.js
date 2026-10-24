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
// =====================================================

// Base histórica tras el Torneo 1 (sus partidos ya están reflejados acá,
// por lo que se omiten al procesar el historial).
const POST_TORNEO_1_BASE = {
    Chama: 100.0,
    Rafa: 80.0,
    Tomy: 60.0,
    Marco: 50.0,
    Facu: 40.0,
    Santi: 30.0,
    Hector: 20.0
};

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

        if (torneo.toLowerCase() === 'primer torneo de hockey de mesa') {
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
function calcularRankingDesdeTexto(texto) {
    const partidos = parsearPartidosParaRanking(texto);
    const ranking = Object.assign({}, POST_TORNEO_1_BASE);

    for (const partido of partidos) {
        const { j1, j2, resJ1, torneo, fase } = partido;

        if (!(j1 in ranking)) ranking[j1] = NUEVO_JUGADOR_PUNTOS;
        if (!(j2 in ranking)) ranking[j2] = NUEVO_JUGADOR_PUNTOS;

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
    const response = await fetch('enfrentamientos_directos.txt');
    if (!response.ok) {
        throw new Error('No se pudo cargar el archivo enfrentamientos_directos.txt');
    }
    const texto = await response.text();
    return calcularRankingDesdeTexto(texto);
}

window.calcularRankingDesdeTexto = calcularRankingDesdeTexto;
window.cargarRankingCalculado = cargarRankingCalculado;
