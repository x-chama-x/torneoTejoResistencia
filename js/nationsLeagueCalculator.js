// =====================================================
// TEJO NATIONS LEAGUE - CALCULADORA COMPARTIDA
// =====================================================
// Lógica de cálculo de la liga de amistosos, separada de nations_league.js
// para poder reutilizarla también en index.js (Historial de ganadores),
// sin duplicar la fórmula ni el parseo en dos archivos distintos.
//
// PG* (promedio ajustado): en vez de usar el promedio en bruto (GF/PJ), que
// deja a alguien con 1 solo partidazo en el primer puesto, se usa un
// "promedio ajustado" (la misma idea que usa IMDb para rankear películas
// con pocos votos): a cada jugador se le suman unos "partidos fantasma" con
// el promedio general de la liga, así el que jugó poco arranca cerca del
// promedio y va acercándose a su rendimiento real a medida que juega más.
// No hay ningún corte ni mínimo explícito: todos entran a la misma tabla,
// solo que un partido aislado no alcanza para despegarse del promedio.
//   PG* = (PARTIDOS_FANTASMA × promedioLiga + GF) / (PARTIDOS_FANTASMA + PJ)
//
// Orden de la tabla: PG* desc > DIF por partido desc > WR (% de victorias)
// desc > PTS total desc (como último desempate).
// =====================================================

const PARTIDOS_FANTASMA = 4; // cuántos "partidos promedio" se le asumen a todos antes de confiar en su promedio real

// Parsea el .txt de enfrentamientos_directos y devuelve solo los partidos
// "Amistoso" con su año calendario.
function parsearAmistosos(texto) {
    return texto.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(l => l.split(','))
        .filter(p => p.length >= 7 && p[4].trim().toLowerCase() === 'amistoso')
        .map(p => {
            const j1 = p[0].trim();
            const j2 = p[1].trim();
            const res = p[2].trim();
            const marcador = p[3].trim();
            const fecha = p[5].trim();
            const partesFecha = fecha.split('/').map(n => parseInt(n, 10));
            const anio = partesFecha.length === 3 && !isNaN(partesFecha[2]) ? partesFecha[2] : null;
            return { j1, j2, res, marcador, fecha, anio };
        })
        .filter(p => p.anio !== null);
}

// Calcula la tabla de posiciones de una edición (array de partidos de un año).
function calcularPosicionesNL(partidos) {
    const stats = {};
    let totalGf = 0;
    let totalPj = 0;

    partidos.forEach(m => {
        const g = m.marcador.split('-').map(Number);
        if (g.length !== 2 || isNaN(g[0]) || isNaN(g[1])) return;

        if (!stats[m.j1]) stats[m.j1] = { nombre: m.j1, pj: 0, g: 0, p: 0, gf: 0, gc: 0 };
        if (!stats[m.j2]) stats[m.j2] = { nombre: m.j2, pj: 0, g: 0, p: 0, gf: 0, gc: 0 };

        stats[m.j1].pj++; stats[m.j2].pj++;
        stats[m.j1].gf += g[0]; stats[m.j1].gc += g[1];
        stats[m.j2].gf += g[1]; stats[m.j2].gc += g[0];

        if (m.res === 'G') { stats[m.j1].g++; stats[m.j2].p++; }
        else { stats[m.j2].g++; stats[m.j1].p++; }

        totalGf += g[0] + g[1];
        totalPj += 2;
    });

    // Promedio general de goles por partido en toda la edición (el "m" del promedio ajustado).
    const promedioLiga = totalPj > 0 ? totalGf / totalPj : 0;

    return Object.values(stats)
        .map(s => ({
            ...s,
            dif: s.gf - s.gc,
            pts: s.gf, // PTS = goles a favor (se muestra, pero ya no ordena la tabla)
            pg: s.pj > 0 ? s.gf / s.pj : 0, // promedio real de goles por partido
            pgAjustado: (PARTIDOS_FANTASMA * promedioLiga + s.gf) / (PARTIDOS_FANTASMA + s.pj), // promedio ajustado (ver comentario arriba)
            difPromedio: s.pj > 0 ? (s.gf - s.gc) / s.pj : 0, // diferencia de gol por partido
            wr: s.pj > 0 ? s.g / s.pj : 0 // % de victorias
        }))
        // Ordena por rendimiento ajustado, no por promedio en bruto ni por volumen (total):
        .sort((a, b) => b.pgAjustado - a.pgAjustado || b.difPromedio - a.difPromedio || b.wr - a.wr || b.pts - a.pts);
}
