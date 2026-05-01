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
        if (m.res === "G") {
            stats[m.j1].w++; stats[m.j2].l++;
            stats[m.j1].pts += 3;
        } else {
            stats[m.j2].w++; stats[m.j1].l++;
            stats[m.j2].pts += 3;
        }
    });
    return Object.values(stats)
        .map(s => ({ ...s, dif: s.gf - s.gc }))
        .sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.gf - a.gf);
}
function renderGroupMatchesAndStandings(matches, nombreTorneo) {
    const resultadosContainer = document.getElementById("resultados-fase");
    if (resultadosContainer) {
        resultadosContainer.innerHTML = "";
        const ul = document.createElement("ul");
        ul.style.listStyle = "none";
        ul.style.padding = "0";
        matches.forEach(m => {
            const li = document.createElement("li");
            li.style.marginBottom = "0.5rem";
            li.style.backgroundColor = "rgba(255,255,255,0.05)";
            li.style.padding = "0.5rem";
            li.style.borderRadius = "4px";
            li.innerHTML = `<strong>${m.j1}</strong> vs <strong>${m.j2}</strong>: ${m.marcador} <span style="font-size: 0.8em; color: #aaa;">(${m.fase})</span>`;
            ul.appendChild(li);
        });
        resultadosContainer.appendChild(ul);
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
                    <h3 style="margin-bottom: 1rem;">${gName}</h3>
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
                                    <th>Pts</th>
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
                `;
                gCont.appendChild(gDiv);
            });
        }
    }
}
function createMatchCard(m) {
    if (!m) return `<div class="match">Por definirse</div>`;
    const g = m.marcador.split("-").map(Number);
    const w1 = g[0] > g[1];
    const w2 = g[1] > g[0];
    return `
        <div class="playoff-match">
            <div class="team ${w1 ? "winner" : "loser"}">
                <span class="name">${m.j1}</span>
                <span class="score">${g[0]}</span>
            </div>
            <div class="team ${w2 ? "winner" : "loser"}">
                <span class="name">${m.j2}</span>
                <span class="score">${g[1]}</span>
            </div>
        </div>
    `;
}
function renderPlayoffs(semis, final, tercerPuesto) {
    const bracket = document.getElementById("playoff-bracket");
    if (bracket) {
        bracket.innerHTML = `
            <div class="round">
                <h3 class="round-title">Semifinales</h3>
                ${semis.length > 0 ? createMatchCard(semis[0]) : ""}
                ${semis.length > 1 ? createMatchCard(semis[1]) : ""}
            </div>
            <div class="round">
                <h3 class="round-title">Final</h3>
                ${final.length > 0 ? createMatchCard(final[0]) : ""}
            </div>
        `;
    }
    const tpc = document.getElementById("tercer-puesto-container");
    if (tpc && tercerPuesto.length > 0) {
        tpc.innerHTML = `
            <h3 style="margin-bottom: 0.5rem; color:#f39c12">Tercer Puesto</h3>
            <div style="display:inline-block; text-align:left;">
                ${createMatchCard(tercerPuesto[0])}
            </div>
        `;
    }
}
