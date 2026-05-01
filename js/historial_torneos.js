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
                    <th>Fase</th>
                    <th style="text-align: right;">Local</th>
                    <th style="text-align: center;">Resultado</th>
                    <th style="text-align: left;">Visitante</th>
                </tr>
            </thead>
            <tbody>
                ${matches.map(m => {
                    const g = m.marcador.split("-").map(Number);
                    const w1 = g[0] > g[1];
                    const w2 = g[1] > g[0];
                    return `
                    <tr>
                        <td style="font-size: 0.85em; color: #bbb;">${m.fase}</td>
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
                const tr = document.createElement("tr");
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
                            <h4 style="margin-bottom: 1rem; text-align: center; color: #8b949e;">Posiciones</h4>
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
                                    ${stdgs.map((s, idx) => `
                                        <tr>
                                            <td>${idx + 1}</td>
                                            <td><strong>${s.nombre}</strong></td>
                                            <td>${s.p}</td>
                                            <td>${s.w}</td>
                                            <td>${s.l}</td>
                                            <td>${s.gf}</td>
                                            <td>${s.gc}</td>
                                            <td>${s.dif > 0 ? "+"+s.dif : s.dif}</td>
                                            <td><strong>${s.pts}</strong></td>
                                        </tr>
                                    `).join("")}
                                </tbody>
                            </table>
                        </div>
                        </div>
                        <div>
                            <h4 style="margin-bottom: 1rem; text-align: center; color: #8b949e;">Resultados</h4>
                            <div class="table-responsive">
                                <table class="ranking-table align-center">
                                    <thead>
                                        <tr>
                                            <th style="text-align: right;">Local</th>
                                            <th style="text-align: center;">Resultado</th>
                                            <th style="text-align: left;">Visitante</th>
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
    if (!m) return `<div class="match-card"><div class="match-number">${matchTitle}</div><div class="match-players">Por definirse</div></div>`;
    const g = m.marcador.split("-").map(Number);
    const w1 = g[0] > g[1];
    const w2 = g[1] > g[0];

    // Convertirlo a un diseo idntico al de match-card
    return `
        <div class="match-card">
            <div class="match-number">${matchTitle || m.fase}</div>
            <div class="match-players">
                <div class="player ${w1 ? 'blue' : ''}" style="${w1 ? 'font-weight: 900; text-decoration: underline;' : 'color: #888;'}">
                    ${m.j1}
                </div>
                <div style="font-size: 1.5em; font-weight: 900; padding: 0 15px; color: #fff;">
                    ${g[0]} - ${g[1]}
                </div>
                <div class="player ${w2 ? 'red' : ''}" style="${w2 ? 'font-weight: 900; text-decoration: underline;' : 'color: #888;'}">
                    ${m.j2}
                </div>
            </div>
        </div>
    `;
}

function renderPlayoffs(semis, final, tercerPuesto) {
    const bracket = document.getElementById("playoff-bracket");
    if (bracket) {
        bracket.innerHTML = `
            <div class="bracket-round">
                <div class="bracket-column">
                    <h3 class="round-title">Semifinales</h3>
                    ${semis.length > 0 ? createMatchCard(semis[0], "Semifinal 1") : ""}
                    ${semis.length > 1 ? createMatchCard(semis[1], "Semifinal 2") : ""}
                </div>
                <div class="bracket-column">
                    <h3 class="round-title">Final</h3>
                    ${final.length > 0 ? createMatchCard(final[0], "Gran Final") : ""}
                </div>
            </div>
        `;
    }

    const tpc = document.getElementById("tercer-puesto-container");
    if (tpc && tercerPuesto.length > 0) {
        tpc.innerHTML = `
            <h3 style="margin-bottom: 1rem; color:#f39c12; text-align: center;">Tercer Puesto</h3>
            <div class="bracket-column" style="align-items: center;">
                ${createMatchCard(tercerPuesto[0], "Tercer y Cuarto Puesto")}
            </div>
        `;
    }
}
