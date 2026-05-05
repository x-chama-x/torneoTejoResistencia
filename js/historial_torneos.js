function cargarTorneo(nombreTorneo) {
    fetch("enfrentamientos_directos.txt")
        .then(res => res.text())
        .then(data => {
            const matches = data.split("\n")
                .map(l => l.trim())
                .filter(l => l && !l.startsWith("#"))
                .map(l => {
                    const p = l.split(",");
                    return { j1: p[0], j2: p[1], res: p[2], marcador: p[3], torneo: p[4], fecha: p[5], fase: p[6] };
                })
                .filter(m => m.torneo === nombreTorneo);
            // Separate matches
            const groupMatches = matches.filter(m => m.fase.includes("Fase"));
            const semis = matches.filter(m => m.fase.includes("Semifinal"));
            const final = matches.filter(m => m.fase.includes("Final"));
            const tercerPuesto = matches.filter(m => m.fase.includes("Tercer Puesto"));
            renderGroupMatchesAndStandings(groupMatches, nombreTorneo);
            renderPlayoffs(semis, final, tercerPuesto);
            renderTournamentStats(matches, nombreTorneo);
        });
}

function processStandings(matches) {
    const stats = {};
    matches.forEach(m => {
        if(!stats[m.j1]) stats[m.j1] = { nombre: m.j1, p:0, w:0, l:0, gf:0, gc:0, pts:0 };
        if(!stats[m.j2]) stats[m.j2] = { nombre: m.j2, p:0, w:0, l:0, gf:0, gc:0, pts:0 };
        const g = m.marcador.split("-").map(Number);
        stats[m.j1].p++; stats[m.j2].p++;
        stats[m.j1].gf += g[0]; stats[m.j1].gc += g[1];
        stats[m.j2].gf += g[1]; stats[m.j2].gc += g[0];

        // Pts son los goles anotados a favor
        stats[m.j1].pts += g[0];
        stats[m.j2].pts += g[1];

        if (m.res === "G") {
            stats[m.j1].w++; stats[m.j2].l++;
        } else {
            stats[m.j2].w++; stats[m.j1].l++;
        }
    });
    return Object.values(stats)
        .map(s => ({ ...s, dif: s.gf - s.gc }))
        .sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.gf - a.gf);
}

function renderGroupMatchesAndStandings(matches, nombreTorneo) {
    // Si tenemos un contenedor global de resultados (Torneo 1)
    const resultadosContainer = document.getElementById("resultados-fase");
    if (resultadosContainer && nombreTorneo.includes("Primer")) {
        resultadosContainer.innerHTML = "";
        const divResp = document.createElement("div");
        divResp.className = "table-responsive";

        const table = document.createElement("table");
        table.className = "ranking-table align-center"; // Agregamos una posible alineación

        table.innerHTML = `
            <thead>
                <tr>
                    <th style="text-align: right;">Azul</th>
                    <th style="text-align: center;">Resultado</th>
                    <th style="text-align: left;">Rojo</th>
                </tr>
            </thead>
            <tbody>
                ${matches.map(m => {
                    const g = m.marcador.split("-").map(Number);
                    const w1 = g[0] > g[1];
                    const w2 = g[1] > g[0];
                    return `
                    <tr>
                        <td style="text-align: right; ${w1 ? 'font-weight: bold; color: #4CAF50;' : ''}">${m.j1}</td>
                        <td style="text-align: center; font-weight: bold; letter-spacing: 2px;">${m.marcador}</td>
                        <td style="text-align: left; ${w2 ? 'font-weight: bold; color: #4CAF50;' : ''}">${m.j2}</td>
                    </tr>
                    `;
                }).join("")}
            </tbody>
        `;
        divResp.appendChild(table);
        resultadosContainer.appendChild(divResp);
    }

    if (nombreTorneo.includes("Primer")) {
        // Liga
        const stdgs = processStandings(matches);
        const tbody = document.getElementById("tabla-body");
        if (tbody) {
            tbody.innerHTML = "";
            stdgs.forEach((s, idx) => {
                const isClasificado = idx < 4;
                const tr = document.createElement("tr");
                if (isClasificado) {
                    tr.style.background = "rgba(46, 160, 67, 0.15)";
                }
                tr.innerHTML = `
                    <td>${idx + 1}</td>
                    <td><strong>${s.nombre}</strong></td>
                    <td>${s.p}</td>
                    <td>${s.w}</td>
                    <td>${s.l}</td>
                    <td>${s.gf}</td>
                    <td>${s.gc}</td>
                    <td>${s.dif > 0 ? "+"+s.dif : s.dif}</td>
                    <td><strong>${s.pts}</strong></td>
                `;
                tbody.appendChild(tr);
            });

            // Agregar la leyenda debajo de la tabla
            const tableResp = tbody.closest(".table-responsive");
            if (tableResp && !tableResp.nextElementSibling?.classList.contains("leyenda-clasificacion")) {
                const leyenda = document.createElement("div");
                leyenda.className = "leyenda-clasificacion";
                leyenda.style = "margin-top: 10px; font-size: 0.85rem; color: #8b949e;";
                leyenda.innerHTML = `<span style="display:inline-block; width:12px; height:12px; background: rgba(46, 160, 67, 0.5); border-radius: 2px; margin-right: 5px; vertical-align: middle;"></span> <span style="vertical-align: middle;">[1-4] Clasifica a playoffs</span>`;
                tableResp.parentElement.insertBefore(leyenda, tableResp.nextSibling);
            }
        }
    } else {
        // Grupos
        const gruposList = [...new Set(matches.map(m => m.fase))].sort(); // Fase de Grupos (A), (B)
        const gCont = document.getElementById("grupos-container");
        if (gCont) {
            gCont.innerHTML = "";
            gruposList.forEach(gName => {
                const gMatches = matches.filter(m => m.fase === gName);
                const stdgs = processStandings(gMatches);

                const gDiv = document.createElement("div");
                gDiv.style.marginBottom = "2rem";
                gDiv.innerHTML = `
                    <h3 style="margin-bottom: 1rem; color: #58a6ff;">${gName}</h3>
                    <div class="home-container">
                        <div>
                            <h4 style="margin-bottom: 1rem; text-align: center; color: #eff0f3;">Posiciones</h4>
                            <div class="table-responsive">
                                <table class="ranking-table">
                                <thead>
                                    <tr>
                                        <th>Pos</th>
                                        <th>Jugador</th>
                                        <th>PJ</th>
                                        <th>G</th>
                                        <th>P</th>
                                        <th>GF</th>
                                        <th>GC</th>
                                        <th>DIF</th>
                                        <th>Pts (Goles)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${stdgs.map((s, idx) => {
                    const isClasificado = idx < 2;
                    return `
                                        <tr ${isClasificado ? 'style="background: rgba(46, 160, 67, 0.15);"' : ''}>
                                            <td>${idx + 1}</td>
                                            <td><strong>${s.nombre}</strong></td>
                                            <td>${s.p}</td>
                                            <td>${s.w}</td>
                                            <td>${s.l}</td>
                                            <td>${s.gf}</td>
                                            <td>${s.gc}</td>
                                            <td>${s.dif > 0 ? "+" + s.dif : s.dif}</td>
                                            <td><strong>${s.pts}</strong></td>
                                        </tr>`;
                }).join("")}
                                </tbody>
                            </table>
                        </div>
                        <div class="leyenda-clasificacion" style="margin-top: 10px; font-size: 0.85rem; color: #8b949e; display: flex; align-items: center;">
                            <span style="display:inline-block; width:12px; height:12px; background: rgba(46, 160, 67, 0.5); border-radius: 2px; margin-right: 5px;"></span>
                            <span>[1-2] Clasifica a playoffs</span>
                        </div>
                        </div>
                        <div>
                            <h4 style="margin-bottom: 1rem; text-align: center; color: #eff0f3;">Resultados</h4>
                            <div class="table-responsive">
                                <table class="ranking-table align-center">
                                    <thead>
                                        <tr>
                                            <th style="text-align: right;">Azul</th>
                                            <th style="text-align: center;">Resultado</th>
                                            <th style="text-align: left;">Rojo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${gMatches.map(m => {
                    const g = m.marcador.split("-").map(Number);
                    const w1 = g[0] > g[1];
                    const w2 = g[1] > g[0];
                    return `
                                            <tr>
                                                <td style="text-align: right; ${w1 ? 'font-weight: bold; color: #4CAF50;' : ''}">${m.j1}</td>
                                                <td style="text-align: center; font-weight: bold; letter-spacing: 2px;">${m.marcador}</td>
                                                <td style="text-align: left; ${w2 ? 'font-weight: bold; color: #4CAF50;' : ''}">${m.j2}</td>
                                            </tr>`;
                }).join("")}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
                gCont.appendChild(gDiv);
            });
        }
    }
}

function createMatchCard(m, matchTitle) {
    if (!m) return `<div class="match-card"><div class="match-number">${matchTitle}</div><div class="match-players"><div style="color:#8b949e; text-align:center; width:100%;">Por definirse</div></div></div>`;
    const g = m.marcador.split("-").map(Number);
    const winner = g[0] > g[1] ? m.j1 : m.j2;

    let winnerLabel = `🏆 ${winner}`;
    if (matchTitle === "Gran Final") winnerLabel = `👑 CAMPEÓN: ${winner}`;
    else if (matchTitle === "Tercer y Cuarto Puesto") winnerLabel = `🥉 ${winner}`;

    return `
        <div class="match-card">
            <div class="match-number">${matchTitle || m.fase}</div>
            <div class="match-players">
                <div class="player blue">${m.j1}</div>
                <div class="vs">VS</div>
                <div class="player red">${m.j2}</div>
            </div>
            <div class="score">${g[0]} - ${g[1]}</div>
            <div class="winner-badge">${winnerLabel}</div>
        </div>
    `;
}

function drawBracketLines() {
    const sf1El = document.getElementById("sf1-wrap");
    const sf2El = document.getElementById("sf2-wrap");
    const finalEl = document.getElementById("final-wrap");
    const connEl = document.getElementById("bracket-connector-col");
    const svg = document.getElementById("bracket-svg");

    if (!sf1El || !sf2El || !finalEl || !connEl || !svg) return;

    const connRect = connEl.getBoundingClientRect();
    const sf1Rect = sf1El.getBoundingClientRect();
    const sf2Rect = sf2El.getBoundingClientRect();
    const finalRect = finalEl.getBoundingClientRect();

    const sf1Mid = (sf1Rect.top + sf1Rect.bottom) / 2 - connRect.top;
    const sf2Mid = (sf2Rect.top + sf2Rect.bottom) / 2 - connRect.top;
    const finalMid = (finalRect.top + finalRect.bottom) / 2 - connRect.top;
    const w = connRect.width;
    const h = connRect.height;

    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);

    svg.innerHTML = `
        <line x1="0" y1="${sf1Mid.toFixed(1)}" x2="${(w/2).toFixed(1)}" y2="${sf1Mid.toFixed(1)}" stroke="#58a6ff" stroke-width="2" stroke-linecap="round"/>
        <line x1="${(w/2).toFixed(1)}" y1="${sf1Mid.toFixed(1)}" x2="${(w/2).toFixed(1)}" y2="${sf2Mid.toFixed(1)}" stroke="#58a6ff" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="${sf2Mid.toFixed(1)}" x2="${(w/2).toFixed(1)}" y2="${sf2Mid.toFixed(1)}" stroke="#58a6ff" stroke-width="2" stroke-linecap="round"/>
        <line x1="${(w/2).toFixed(1)}" y1="${finalMid.toFixed(1)}" x2="${w.toFixed(1)}" y2="${finalMid.toFixed(1)}" stroke="#58a6ff" stroke-width="2" stroke-linecap="round"/>
    `;
}

function renderPlayoffs(semis, final, tercerPuesto) {
    const bracket = document.getElementById("playoff-bracket");
    if (bracket) {
        bracket.innerHTML = `
            <div class="bracket-fixture">
                <div class="bracket-col-semis">
                    <h3 class="round-title">⚔️ Semifinales</h3>
                    <div id="sf1-wrap">${semis.length > 0 ? createMatchCard(semis[0], "Semifinal 1") : ""}</div>
                    <div id="sf2-wrap">${semis.length > 1 ? createMatchCard(semis[1], "Semifinal 2") : ""}</div>
                </div>
                <div class="bracket-connector-col" id="bracket-connector-col">
                    <svg id="bracket-svg" style="width:100%; height:100%; display:block; overflow:visible;"></svg>
                </div>
                <div class="bracket-col-final">
                    <h3 class="round-title">👑 Final</h3>
                    <div id="final-wrap">${final.length > 0 ? createMatchCard(final[0], "Gran Final") : ""}</div>
                </div>
            </div>
        `;
        requestAnimationFrame(() => drawBracketLines());
    }

    const tpc = document.getElementById("tercer-puesto-container");
    if (tpc && tercerPuesto.length > 0) {
        tpc.innerHTML = `
            <h3 style="margin-bottom: 1rem; color:#f39c12; text-align: center;">🥉 Tercer Puesto</h3>
            <div style="display: flex; justify-content: center;">
                ${createMatchCard(tercerPuesto[0], "Tercer y Cuarto Puesto")}
            </div>
        `;
    }
}

function renderTournamentStats(allMatches, nombreTorneo) {
    const statsContainer = document.getElementById("stats-container");
    if (!statsContainer) return;

    const isLiga = nombreTorneo.includes("Primer");
    const groupLabel = isLiga ? "Goles Liga" : "Goles Grupos";

    const groupMatches = allMatches.filter(m => m.fase.includes("Fase"));
    const playoffMatches = allMatches.filter(m => !m.fase.includes("Fase"));

    const stats = {};

    function addGoals(matches, phase) {
        matches.forEach(m => {
            if (!stats[m.j1]) stats[m.j1] = { golesGrupo: 0, golesFinal: 0, golesContra: 0, partidos: 0 };
            if (!stats[m.j2]) stats[m.j2] = { golesGrupo: 0, golesFinal: 0, golesContra: 0, partidos: 0 };
            const g = m.marcador.split("-").map(Number);
            if (phase === "grupo") {
                stats[m.j1].golesGrupo += g[0];
                stats[m.j2].golesGrupo += g[1];
            } else {
                stats[m.j1].golesFinal += g[0];
                stats[m.j2].golesFinal += g[1];
            }
            stats[m.j1].golesContra += g[1];
            stats[m.j2].golesContra += g[0];
            stats[m.j1].partidos++;
            stats[m.j2].partidos++;
        });
    }

    addGoals(groupMatches, "grupo");
    addGoals(playoffMatches, "playoff");

    const statsArray = Object.entries(stats).map(([nombre, s]) => {
        const difGoles = (s.golesGrupo + s.golesFinal) - s.golesContra;
        return {
            nombre,
            golesGrupo: s.golesGrupo,
            golesFinal: s.golesFinal,
            totalGoles: s.golesGrupo + s.golesFinal,
            gc: s.golesContra,
            dif: (difGoles > 0 ? '+' : '') + difGoles,
            partidos: s.partidos,
            promedio: s.partidos > 0 ? (s.golesGrupo + s.golesFinal) / s.partidos : 0,
            promedioStr: s.partidos > 0 ? ((s.golesGrupo + s.golesFinal) / s.partidos).toFixed(2) : "0.00"
        };
    }).sort((a, b) => b.promedio - a.promedio || b.totalGoles - a.totalGoles);

    if (statsArray.length === 0) return;

    const mejorPromedio = statsArray[0].promedio;
    const goleadores = statsArray.filter(s => s.promedio === mejorPromedio);
    const goleadorText = goleadores.length === 1
        ? `<strong style="color: #667eea;">${goleadores[0].nombre}</strong> es el goleador del torneo con un promedio de <strong style="color: #667eea;">${goleadores[0].promedioStr}</strong> goles por partido`
        : `${goleadores.map(g => `<strong style="color: #667eea;">${g.nombre}</strong>`).join(", ").replace(/,([^,]*)$/, " y$1")} son los goleadores del torneo con un promedio de <strong style="color: #667eea;">${goleadores[0].promedioStr}</strong> goles por partido`;

    statsContainer.innerHTML = `
        <h2>📊 ESTADÍSTICAS DEL TORNEO</h2>
        <div class="table-responsive"><table class="ranking-table">
            <thead><tr>
                <th>Jugador</th>
                <th>${groupLabel}</th>
                <th>Goles Fase Final</th>
                <th>Total Goles (TG)</th>
                <th>GC</th>
                <th>DIF</th>
                <th>Partidos (PJ)</th>
                <th>Prom TG/PJ</th>
            </tr></thead>
            <tbody>${statsArray.map(s => `
                <tr>
                    <td><strong>${s.nombre}</strong></td>
                    <td>${s.golesGrupo}</td>
                    <td>${s.golesFinal}</td>
                    <td><strong>${s.totalGoles}</strong></td>
                    <td>${s.gc}</td>
                    <td>${s.dif}</td>
                    <td>${s.partidos}</td>
                    <td><strong>${s.promedioStr}</strong></td>
                </tr>
            `).join("")}</tbody>
        </table></div>
        <div style="text-align: center; margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">${goleadorText}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #666; font-style: italic;">El goleador del torneo es el jugador con el mejor promedio de goles</p>
        </div>
    `;
}
