// ================================================
// COPA DE CAMPEONES
// Torneo de 4 jugadores: los primeros 4 campeones distintos de los
// torneos regulares. Semifinal 1, Semifinal 2 y Final, cada cruce
// jugado a Ida y Vuelta (2 fechas distintas). Si el global termina
// empatado se define con un partido extra de GOL DE ORO.
//
// Fases a usar en enfrentamientos_directos.txt:
//   "Semifinal 1 - Ida" / "Semifinal 1 - Vuelta" / "Semifinal 1 - Desempate"
//   "Semifinal 2 - Ida" / "Semifinal 2 - Vuelta" / "Semifinal 2 - Desempate"
//   "Final - Ida" / "Final - Vuelta" / "Final - Desempate"
// (el torneo de esas filas debe llamarse exactamente "Copa de Campeones")
// ================================================

const NOMBRE_COPA_CAMPEONES = "Copa de Campeones";
const CUPOS_COPA_CAMPEONES = 4;

function parsearLineasPartidos(texto) {
    return texto.split("\n")
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("#"))
        .map(l => {
            const p = l.split(",");
            return { j1: p[0], j2: p[1], res: p[2], marcador: p[3], torneo: p[4], fecha: p[5], fase: p[6] };
        });
}

function parseFechaOrdenCopa(fechaStr) {
    if (!fechaStr) return 0;
    const partes = fechaStr.split('/').map(x => parseInt(x.trim(), 10));
    if (partes.length === 3 && partes.every(n => !isNaN(n))) {
        const [d, m, y] = partes;
        return y * 10000 + m * 100 + d;
    }
    return 0;
}

// ================================================
// BLOQUE 1 — PLAYOFFS A IDA Y VUELTA
// ================================================

function cargarCopaCampeones(nombreTorneo) {
    fetch("enfrentamientos_directos.txt")
        .then(res => res.text())
        .then(texto => {
            const matches = parsearLineasPartidos(texto).filter(m => m.torneo === nombreTorneo);
            renderPlayoffsIdaVuelta(matches);
        });
}

function crearFilaIdaVuelta(m, etiqueta) {
    if (!m) {
        return `
            <div class="leg-row">
                <span class="leg-label">${etiqueta}</span>
                <div class="leg-empty">Por definirse</div>
            </div>`;
    }
    const g = m.marcador.split("-").map(Number);
    const w1 = g[0] > g[1];
    const w2 = g[1] > g[0];
    return `
        <div class="leg-row">
            <span class="leg-label">${etiqueta}${m.fecha ? ` <em>(${m.fecha})</em>` : ""}</span>
            <div class="leg-score">
                <span class="leg-player ${w1 ? "leg-winner" : ""}">${conEscudo(m.j1, { derecha: true })}</span>
                <span class="leg-marcador">${g[0]} - ${g[1]}</span>
                <span class="leg-player ${w2 ? "leg-winner" : ""}">${conEscudo(m.j2)}</span>
            </div>
        </div>`;
}

function createSeriesCard(legs, tituloSerie, esFinal) {
    const { ida, vuelta, desempate } = legs;

    let footerHtml = "";

    if (desempate) {
        const g = desempate.marcador.split("-").map(Number);
        const ganador = g[0] > g[1] ? desempate.j1 : desempate.j2;
        footerHtml = `
            <div class="agg-empate">⚡ Definido por Gol de Oro</div>
            <div class="winner-badge">${esFinal ? "👑 CAMPEÓN: " : "🏆 Avanza a la Final: "}${ganador}</div>`;
    } else if (ida && vuelta) {
        const goles = {};
        [ida, vuelta].forEach(m => {
            const g = m.marcador.split("-").map(Number);
            goles[m.j1] = (goles[m.j1] || 0) + g[0];
            goles[m.j2] = (goles[m.j2] || 0) + g[1];
        });
        const jugadores = Object.keys(goles);
        if (jugadores.length === 2) {
            const [pA, pB] = jugadores;
            const gA = goles[pA], gB = goles[pB];
            if (gA === gB) {
                footerHtml = `
                    <div class="agg-row">Global: ${pA} ${gA} - ${gB} ${pB}</div>
                    <div class="agg-empate">🟡 Empate en el global — se define por Desempate (Gol de Oro)</div>`;
            } else {
                const ganador = gA > gB ? pA : pB;
                footerHtml = `
                    <div class="agg-row">Global: ${pA} ${gA} - ${gB} ${pB}</div>
                    <div class="winner-badge">${esFinal ? "👑 CAMPEÓN: " : "🏆 Avanza a la Final: "}${ganador}</div>`;
            }
        }
    } else if (ida && !vuelta) {
        footerHtml = `<div class="agg-row agg-parcial">Vuelta pendiente</div>`;
    }

    return `
        <div class="match-card serie-card">
            <div class="match-number">${tituloSerie}</div>
            ${crearFilaIdaVuelta(ida, "Ida")}
            ${crearFilaIdaVuelta(vuelta, "Vuelta")}
            ${desempate ? crearFilaIdaVuelta(desempate, "Desempate (Gol de Oro)") : ""}
            ${footerHtml}
        </div>
    `;
}

function renderPlayoffsIdaVuelta(matches) {
    const bracket = document.getElementById("playoff-bracket");
    if (!bracket) return;

    function obtenerCruce(faseBase) {
        return {
            ida: matches.find(m => m.fase === `${faseBase} - Ida`) || null,
            vuelta: matches.find(m => m.fase === `${faseBase} - Vuelta`) || null,
            desempate: matches.find(m => m.fase === `${faseBase} - Desempate`) || null
        };
    }

    const sf1 = obtenerCruce("Semifinal 1");
    const sf2 = obtenerCruce("Semifinal 2");
    const final = obtenerCruce("Final");

    bracket.innerHTML = `
        <div class="bracket-fixture">
            <div class="bracket-col-semis">
                <h3 class="round-title">Semifinales</h3>
                <div id="sf1-wrap">${createSeriesCard(sf1, "Semifinal 1", false)}</div>
                <div id="sf2-wrap">${createSeriesCard(sf2, "Semifinal 2", false)}</div>
            </div>
            <div class="bracket-connector-col" id="bracket-connector-col">
                <svg id="bracket-svg" style="width:100%; height:100%; display:block; overflow:visible;"></svg>
            </div>
            <div class="bracket-col-final">
                <h3 class="round-title">Final</h3>
                <div id="final-wrap">${createSeriesCard(final, "Final", true)}</div>
            </div>
        </div>
    `;
    requestAnimationFrame(() => drawBracketLines());
    window.addEventListener('resize', drawBracketLines);
}

function drawBracketLines() {
    const sf1El = document.getElementById("sf1-wrap");
    const sf2El = document.getElementById("sf2-wrap");
    const finalEl = document.getElementById("final-wrap");
    const connEl = document.getElementById("bracket-connector-col");
    const svg = document.getElementById("bracket-svg");

    if (!sf1El || !sf2El || !finalEl || !connEl || !svg) return;

    const sf1Card = sf1El.querySelector('.match-card');
    const sf2Card = sf2El.querySelector('.match-card');
    const finalCard = finalEl.querySelector('.match-card');

    if (!sf1Card || !sf2Card || !finalCard) return;

    const connRect = connEl.getBoundingClientRect();
    const sf1CardRect = sf1Card.getBoundingClientRect();
    const sf2CardRect = sf2Card.getBoundingClientRect();
    const finalCardRect = finalCard.getBoundingClientRect();

    const sf1Mid = (sf1CardRect.top + sf1CardRect.bottom) / 2 - connRect.top;
    const sf2Mid = (sf2CardRect.top + sf2CardRect.bottom) / 2 - connRect.top;
    const finalMid = (finalCardRect.top + finalCardRect.bottom) / 2 - connRect.top;
    const w = connRect.width;
    const h = connRect.height;

    const leftX1 = sf1CardRect.right - connRect.left;
    const leftX2 = sf2CardRect.right - connRect.left;
    const rightX = finalCardRect.left - connRect.left;

    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);

    svg.innerHTML = `
        <line x1="${leftX1.toFixed(1)}" y1="${sf1Mid.toFixed(1)}" x2="${(w/2).toFixed(1)}" y2="${sf1Mid.toFixed(1)}" stroke="#58a6ff" stroke-width="2" stroke-linecap="round"/>
        <line x1="${(w/2).toFixed(1)}" y1="${sf1Mid.toFixed(1)}" x2="${(w/2).toFixed(1)}" y2="${sf2Mid.toFixed(1)}" stroke="#58a6ff" stroke-width="2" stroke-linecap="round"/>
        <line x1="${leftX2.toFixed(1)}" y1="${sf2Mid.toFixed(1)}" x2="${(w/2).toFixed(1)}" y2="${sf2Mid.toFixed(1)}" stroke="#58a6ff" stroke-width="2" stroke-linecap="round"/>
        <line x1="${(w/2).toFixed(1)}" y1="${finalMid.toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${finalMid.toFixed(1)}" stroke="#58a6ff" stroke-width="2" stroke-linecap="round"/>
    `;
}

// ================================================
// BLOQUE 2 — CLASIFICADOS (con estadísticas)
// ================================================

// Arma, en orden cronológico, la lista de campeones DISTINTOS de los
// torneos regulares (no cuenta Amistosos ni la propia Copa, porque sus
// partidos usan fases "Final - Ida/Vuelta/Desempate", no "Final" a secas).
function calcularOrdenClasificacion(matches) {
    const finales = matches.filter(m => m.fase === "Final");
    finales.sort((a, b) => parseFechaOrdenCopa(a.fecha) - parseFechaOrdenCopa(b.fecha));

    const titulosPorJugador = {};
    const orden = [];

    finales.forEach(m => {
        const campeon = m.res === "G" ? m.j1 : m.j2;
        if (!titulosPorJugador[campeon]) titulosPorJugador[campeon] = [];
        titulosPorJugador[campeon].push({ torneo: m.torneo, fecha: m.fecha });
        if (!orden.includes(campeon)) orden.push(campeon);
    });

    return { orden, titulosPorJugador };
}

function statsGeneralesDe(matches, nombre) {
    let pj = 0, g = 0, p = 0, e = 0, gf = 0, gc = 0;
    matches.forEach(m => {
        if (!m.marcador) return;
        const goles = m.marcador.split("-").map(Number);
        if (goles.length !== 2 || goles.some(isNaN)) return;
        if (m.j1 === nombre) {
            pj++; gf += goles[0]; gc += goles[1];
            if (goles[0] > goles[1]) g++; else if (goles[0] < goles[1]) p++; else e++;
        } else if (m.j2 === nombre) {
            pj++; gf += goles[1]; gc += goles[0];
            if (goles[1] > goles[0]) g++; else if (goles[1] < goles[0]) p++; else e++;
        }
    });
    return {
        pj, g, p, e, gf, gc, dif: gf - gc,
        wr: pj > 0 ? ((g / pj) * 100).toFixed(1) : "0.0"
    };
}

// Últimos 5 resultados de un jugador, en orden cronológico (misma lógica
// de ordenamiento que usa index.html para su tabla de ranking, así la
// racha que se ve acá es consistente con la de esa página).
function rachaDe(matches, nombre) {
    function parseFecha(fechaStr) {
        if (!fechaStr) return new Date(0);
        const partes = fechaStr.split('/');
        if (partes.length >= 3) {
            const dia = parseInt(partes[0], 10);
            const mes = parseInt(partes[1], 10) - 1;
            const anio = parseInt(partes[2], 10);
            return new Date(anio, mes, dia);
        }
        return new Date(0);
    }
    function ordenFase(fase) {
        const f = (fase || "").toLowerCase();
        if (f.includes('fase de liga') || f.includes('fase de grupos')) return 1;
        if (f.includes('semifinal')) return 2;
        if (f.includes('tercer puesto')) return 3;
        if (f.includes('final')) return 4;
        return 0;
    }

    const partidos = matches.map((m, i) => ({ ...m, fechaObj: parseFecha(m.fecha), indiceOriginal: i }));
    partidos.sort((a, b) => {
        const diffFecha = a.fechaObj.getTime() - b.fechaObj.getTime();
        if (diffFecha !== 0) return diffFecha;
        const amA = (a.torneo || "").toLowerCase().includes('amistoso');
        const amB = (b.torneo || "").toLowerCase().includes('amistoso');
        if (!amA && !amB && a.torneo === b.torneo) {
            const df = ordenFase(a.fase) - ordenFase(b.fase);
            if (df !== 0) return df;
        }
        return a.indiceOriginal - b.indiceOriginal;
    });

    const historial = [];
    partidos.forEach(m => {
        if (m.j1 === nombre) historial.push(m.res === 'G' ? 'G' : (m.res === 'E' ? 'E' : 'P'));
        else if (m.j2 === nombre) historial.push(m.res === 'G' ? 'P' : (m.res === 'E' ? 'E' : 'G'));
    });
    return historial.slice(-5);
}

function crearHtmlRacha(racha) {
    let html = '<div class="streak-container">';
    for (let i = 0; i < 5; i++) {
        if (i < racha.length) {
            const res = racha[i];
            if (res === 'G') html += '<span class="streak-box streak-w" title="Ganado">G</span>';
            else if (res === 'E') html += '<span class="streak-box streak-d" title="Empatado">E</span>';
            else html += '<span class="streak-box streak-l" title="Perdido">P</span>';
        } else {
            html += '<span class="streak-box streak-empty"></span>';
        }
    }
    html += '</div>';
    return html;
}

function crearTarjetaClasificado(slot, nombre, datos) {
    if (!nombre) {
        return `
            <div class="clasificado-card clasificado-vacio">
                <div class="clasificado-header">
                    <span class="clasificado-slot">#${slot}</span>
                    <span class="clasificado-nombre-vacio">Por definirse</span>
                </div>
                <p class="clasificado-vacio-texto">Se clasifica ganando un próximo torneo</p>
            </div>
        `;
    }

    const { titulos, stats, racha, rankingPos, rankingPts } = datos;

    const titulosHtml = titulos.map(t => {
        const nombreCorto = t.torneo.replace(" de hockey de mesa", "");
        return `<span class="titulo-chip">🏆 ${nombreCorto} <em>(${t.fecha})</em></span>`;
    }).join("");

    return `
        <div class="clasificado-card">
            <div class="clasificado-header">
                <span class="clasificado-slot">#${slot}</span>
                <span class="clasificado-nombre">${conEscudo(nombre, { clase: "escudo-grande" })}</span>
                <span class="clasificado-ranking-badge">🏅 #${rankingPos} FIFA · ${rankingPts} pts</span>
            </div>
            <div class="clasificado-titulos">${titulosHtml}</div>
            <div class="clasificado-stats">
                <div class="stat-box"><span class="stat-value">${stats.pj}</span><span class="stat-label">PJ</span></div>
                <div class="stat-box"><span class="stat-value">${stats.g}</span><span class="stat-label">G</span></div>
                <div class="stat-box"><span class="stat-value">${stats.p}</span><span class="stat-label">P</span></div>
                <div class="stat-box"><span class="stat-value">${stats.wr}%</span><span class="stat-label">WR</span></div>
                <div class="stat-box"><span class="stat-value">${stats.dif > 0 ? "+" : ""}${stats.dif}</span><span class="stat-label">DIF</span></div>
            </div>
            <div class="clasificado-racha">
                <span class="leg-label">Últimos 5</span>
                ${crearHtmlRacha(racha)}
            </div>
        </div>
    `;
}

function crearTablaH2H(matches, clasificados) {
    if (clasificados.length < 2) return "";

    const filas = [];
    for (let i = 0; i < clasificados.length; i++) {
        for (let j = i + 1; j < clasificados.length; j++) {
            const a = clasificados[i], b = clasificados[j];
            const enfrentamientos = matches.filter(m => (m.j1 === a && m.j2 === b) || (m.j1 === b && m.j2 === a));
            if (enfrentamientos.length === 0) {
                filas.push(`
                    <tr>
                        <td style="text-align:left;">${a} vs ${b}</td>
                        <td colspan="2" style="color:#8b949e;">Sin antecedentes</td>
                    </tr>`);
                continue;
            }
            let victoriasA = 0, victoriasB = 0, golesA = 0, golesB = 0;
            enfrentamientos.forEach(m => {
                const g = m.marcador.split("-").map(Number);
                if (m.j1 === a) {
                    golesA += g[0]; golesB += g[1];
                    if (g[0] > g[1]) victoriasA++; else if (g[1] > g[0]) victoriasB++;
                } else {
                    golesA += g[1]; golesB += g[0];
                    if (g[1] > g[0]) victoriasA++; else if (g[0] > g[1]) victoriasB++;
                }
            });
            filas.push(`
                <tr>
                    <td style="text-align:left;">${a} vs ${b}</td>
                    <td><strong>${victoriasA} - ${victoriasB}</strong></td>
                    <td>${golesA} - ${golesB}</td>
                </tr>`);
        }
    }

    return `
        <h3 class="h2h-titulo">Historial entre clasificados</h3>
        <div class="table-responsive">
            <table class="ranking-table align-center">
                <thead>
                    <tr>
                        <th style="text-align:left;">Enfrentamiento</th>
                        <th>Victorias</th>
                        <th>Goles</th>
                    </tr>
                </thead>
                <tbody>${filas.join("")}</tbody>
            </table>
        </div>
    `;
}

function cargarClasificadosCopa() {
    fetch("enfrentamientos_directos.txt")
        .then(res => res.text())
        .then(texto => {
            const matches = parsearLineasPartidos(texto);
            const { orden, titulosPorJugador } = calcularOrdenClasificacion(matches);
            const clasificados = orden.slice(0, CUPOS_COPA_CAMPEONES);
            const ranking = calcularRankingDesdeTexto(texto);

            const grid = document.getElementById("clasificados-grid");
            if (grid) {
                let html = "";
                for (let slot = 1; slot <= CUPOS_COPA_CAMPEONES; slot++) {
                    const nombre = clasificados[slot - 1];
                    if (!nombre) {
                        html += crearTarjetaClasificado(slot, null, null);
                        continue;
                    }
                    const rankingPos = ranking.findIndex(r => r.nombre === nombre) + 1;
                    const rankingPts = ranking.find(r => r.nombre === nombre)?.ranking ?? 0;
                    html += crearTarjetaClasificado(slot, nombre, {
                        titulos: titulosPorJugador[nombre] || [],
                        stats: statsGeneralesDe(matches, nombre),
                        racha: rachaDe(matches, nombre),
                        rankingPos,
                        rankingPts
                    });
                }
                grid.innerHTML = html;
            }

            const progreso = document.getElementById("clasificados-progreso");
            if (progreso) {
                progreso.textContent = `${clasificados.length} de ${CUPOS_COPA_CAMPEONES} cupos definidos`;
            }

            const h2hContainer = document.getElementById("h2h-clasificados-container");
            if (h2hContainer) {
                h2hContainer.innerHTML = crearTablaH2H(matches, clasificados);
            }
        });
}
