function cargarTorneo(nombreTorneo) {
    return fetch("enfrentamientos_directos.txt")
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
            const repechajes = matches.filter(m => m.fase.includes("Repechaje"));
            const eliminatorio = matches.filter(m => m.fase.includes("Eliminatorio"));
            const semis = matches.filter(m => m.fase.includes("Semifinal"));
            const final = matches.filter(m => m.fase.includes("Final"));
            const tercerPuesto = matches.filter(m => m.fase.includes("Tercer Puesto"));
            renderGroupMatchesAndStandings(groupMatches, nombreTorneo);
            renderRepechajes(repechajes, eliminatorio);
            renderPlayoffs(semis, final, tercerPuesto);
            renderTournamentStats(matches, nombreTorneo);
        });
}

// Repechajes y partido eliminatorio: solo existen en el formato de 9 jugadores
// (dos mini-ligas, de segundos y de terceros, y un partido entre sus ganadores
// que define el cuarto lugar de playoffs). Si el torneo no los tiene, el
// contenedor queda vacío y no se muestra nada.
function renderRepechajes(repechajes, eliminatorio) {
    const cont = document.getElementById("repechajes-container");
    if (!cont) return;

    cont.innerHTML = "";
    if (repechajes.length === 0 && eliminatorio.length === 0) {
        cont.style.display = "none";
        return;
    }
    cont.style.display = "";

    const fases = [...new Set(repechajes.map(m => m.fase))].sort();
    fases.forEach(fase => {
        const delFase = repechajes.filter(m => m.fase === fase);
        const tabla = processStandings(delFase);

        const div = document.createElement("div");
        div.style.marginBottom = "2rem";
        div.innerHTML = `
            <h3 style="margin-bottom: 1rem; color: #58a6ff;">${fase}</h3>
            <div class="home-container">
                <div>
                    <h4 style="margin-bottom: 1rem; text-align: center; color: #eff0f3;">Posiciones</h4>
                    <div class="table-responsive">
                        <table class="ranking-table">
                            <thead>
                                <tr><th>#</th><th>Jugador</th><th>PJ</th><th>G</th><th>P</th><th>GF</th><th>GC</th><th>DIF</th><th>PTS(GF)</th></tr>
                            </thead>
                            <tbody>
                                ${tabla.map((s, i) => `
                                    <tr${i === 0 ? ' style="background: rgba(46, 160, 67, 0.15);"' : ''}>
                                        <td>${i + 1}</td>
                                        <td><strong>${s.nombre}</strong></td>
                                        <td>${s.p}</td>
                                        <td>${s.w}</td>
                                        <td>${s.l}</td>
                                        <td>${s.gf}</td>
                                        <td>${s.gc}</td>
                                        <td>${s.dif > 0 ? "+" + s.dif : s.dif}</td>
                                        <td><strong>${s.pts}</strong></td>
                                    </tr>`).join("")}
                            </tbody>
                        </table>
                    </div>
                    <div class="leyenda-clasificacion" style="margin-top: 10px; font-size: 0.85rem; color: #8b949e;">
                        <span style="display:inline-block; width:12px; height:12px; background: rgba(46, 160, 67, 0.5); border-radius: 2px; margin-right: 5px; vertical-align: middle;"></span>
                        <span style="vertical-align: middle;">[1] Avanza al partido eliminatorio</span>
                    </div>
                </div>
                <div>
                    <h4 style="margin-bottom: 1rem; text-align: center; color: #eff0f3;">Resultados</h4>
                    <div class="table-responsive">
                        <table class="ranking-table align-center large-table-font">
                            <thead>
                                <tr><th style="text-align:right;">Azul</th><th style="text-align:center;">Resultado</th><th style="text-align:left;">Rojo</th></tr>
                            </thead>
                            <tbody>
                                ${delFase.map(m => {
                                    const g = m.marcador.split("-").map(Number);
                                    return `<tr>
                                        <td style="text-align:right; ${g[0] > g[1] ? 'font-weight:bold; color:#58a6ff;' : ''}">${m.j1}</td>
                                        <td style="text-align:center; font-weight:bold; letter-spacing:2px;">${m.marcador}</td>
                                        <td style="text-align:left; ${g[1] > g[0] ? 'font-weight:bold; color:#f85149;' : ''}">${m.j2}</td>
                                    </tr>`;
                                }).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
        renderAvisoEmpates(div, tabla.empatesSinResolver);
        cont.appendChild(div);
    });

    eliminatorio.forEach(m => {
        const g = m.marcador.split("-").map(Number);
        const ganador = g[0] > g[1] ? m.j1 : m.j2;
        const div = document.createElement("div");
        div.style = "text-align:center; margin-bottom: 1.5rem;";
        div.innerHTML = `
            <h3 style="margin-bottom: 1rem; color: #58a6ff;">${m.fase}</h3>
            <div style="display:inline-block; background:#161b22; border:1px solid #30363d; border-radius:12px; padding:14px 22px;">
                <div style="font-size:1.05rem; font-weight:700;">
                    <span style="${g[0] > g[1] ? 'color:#58a6ff;' : ''}">${m.j1}</span>
                    <span style="margin:0 10px; letter-spacing:2px;">${m.marcador}</span>
                    <span style="${g[1] > g[0] ? 'color:#f85149;' : ''}">${m.j2}</span>
                </div>
                <div style="margin-top:8px; background:#d29922; color:#0d1117; border-radius:6px; padding:4px 10px; font-weight:700; font-size:0.85rem;">
                    Clasifica: ${ganador}
                </div>
            </div>`;
        cont.appendChild(div);
    });
}

// Devuelve los torneos que existen en el archivo, en orden cronológico
// (por la fecha de su primer partido). Los amistosos quedan afuera: esos
// son de la Tejo Nations League y tienen su propia página.
//
// Es lo que permite que las páginas de torneo se armen solas: no hay ninguna
// lista de torneos hardcodeada en ningún lado, sale todo del .txt.
function listarTorneos(texto) {
    const porTorneo = {};

    texto.split("\n")
        .map(l => l.trim())
        .filter(l => l && !l.startsWith("#"))
        .forEach(l => {
            const p = l.split(",");
            if (p.length < 7) return;

            const nombre = p[4].trim();
            if (!nombre || nombre.toLowerCase() === "amistoso") return;

            const fecha = claveFecha(p[5].trim());
            if (!porTorneo[nombre] || fecha < porTorneo[nombre].desde) {
                porTorneo[nombre] = { nombre, desde: fecha };
            }
        });

    return Object.values(porTorneo).sort((a, b) => a.desde - b.desde);
}

// "13/10/2026" -> 20261013, para poder comparar fechas como números.
function claveFecha(fechaStr) {
    const p = String(fechaStr).split("/").map(n => parseInt(n, 10));
    if (p.length !== 3 || p.some(isNaN)) return 0;
    return p[2] * 10000 + p[1] * 100 + p[0];
}

// `plantel` (opcional) es la lista de jugadores que deberian aparecer en la
// tabla aunque todavia no hayan jugado nada. Sirve para que un torneo recien
// sorteado muestre a todos en cero, en vez de una tabla vacia.
function processStandings(matches, plantel) {
    const stats = {};

    (plantel || []).forEach(nombre => {
        stats[nombre] = { nombre, p: 0, w: 0, l: 0, gf: 0, gc: 0, pts: 0 };
    });

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
    const tabla = Object.values(stats)
        .map(s => ({ ...s, dif: s.gf - s.gc }))
        .sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.gf - a.gf);

    // Desempate por enfrentamiento directo.
    //
    // Solo se aplica cuando son EXACTAMENTE dos los empatados. Con tres o más
    // el mano a mano puede ser circular (A le gana a B, B a C y C a A), así que
    // no existe un orden válido: en ese caso se deja el orden como está y se
    // avisa en pantalla para resolverlo a mano.
    const empatesSinResolver = [];
    let i = 0;
    while (i < tabla.length) {
        let fin = i;
        while (fin + 1 < tabla.length && mismaPosicion(tabla[fin], tabla[fin + 1])) fin++;

        const empatados = fin - i + 1;
        if (empatados === 2) {
            // Si el de abajo ganó el mano a mano, se intercambian.
            if (ganoElManoAMano(tabla[i + 1], tabla[i], matches)) {
                [tabla[i], tabla[i + 1]] = [tabla[i + 1], tabla[i]];
            }
        } else if (empatados > 2) {
            // No se avisa por los que todavia no jugaron: al arranque de un
            // torneo estan todos en cero y el cartel seria puro ruido.
            const grupo = tabla.slice(i, fin + 1);
            if (grupo.some(s => s.p > 0)) {
                empatesSinResolver.push(grupo.map(s => s.nombre));
            }
        }
        i = fin + 1;
    }

    // Se cuelga del array para que el render pueda mostrar el aviso sin cambiar
    // la firma de la función (la usan varios lugares).
    tabla.empatesSinResolver = empatesSinResolver;
    return tabla;
}

// Dos jugadores ocupan la misma posición si empatan en los tres criterios.
function mismaPosicion(a, b) {
    return a.pts === b.pts && a.dif === b.dif && a.gf === b.gf;
}

// ¿"jugador" le ganó el mano a mano a "rival"? Se suman los goles de los
// partidos entre ellos dentro de esta fase (en liga es uno solo, así que
// equivale a quién ganó ese partido).
function ganoElManoAMano(jugador, rival, matches) {
    let golesJugador = 0;
    let golesRival = 0;

    matches.forEach(m => {
        const esElCruce =
            (m.j1 === jugador.nombre && m.j2 === rival.nombre) ||
            (m.j1 === rival.nombre && m.j2 === jugador.nombre);
        if (!esElCruce) return;

        const g = m.marcador.split("-").map(Number);
        if (m.j1 === jugador.nombre) {
            golesJugador += g[0];
            golesRival += g[1];
        } else {
            golesJugador += g[1];
            golesRival += g[0];
        }
    });

    return golesJugador > golesRival;
}

// Cartel de aviso cuando hay empates de 3 o más que no se pueden desempatar solos.
function renderAvisoEmpates(contenedor, empates) {
    if (!contenedor || !empates || empates.length === 0) return;

    const aviso = document.createElement("div");
    aviso.className = "aviso-empate-multiple";
    aviso.style = "margin-top: 10px; font-size: 0.85rem; color: #d29922; background: rgba(210, 153, 34, 0.1); border: 1px solid rgba(210, 153, 34, 0.35); border-radius: 8px; padding: 10px 12px;";
    aviso.innerHTML = empates.map(grupo =>
        `⚠️ <strong>${grupo.join(", ")}</strong> quedaron empatados en puntos, diferencia y goles a favor. El enfrentamiento directo solo desempata entre dos, así que este orden hay que definirlo a mano.`
    ).join("<br>");
    contenedor.appendChild(aviso);
}

function renderGroupMatchesAndStandings(matches, nombreTorneo) {
    // El plantel sale del sorteo guardado, cuando la pagina lo cargo
    // (ver js/torneos.js). Permite dibujar las tablas antes de que se
    // juegue el primer partido.
    const plantel = window.torneoPlantel || null;
    const isLiga = matches.some(m => m.fase === "Fase de Liga") || !!(plantel && plantel.all);
    // Si tenemos un contenedor global de resultados (formato Liga)
    const resultadosContainer = document.getElementById("resultados-fase");
    if (resultadosContainer && isLiga) {
        resultadosContainer.innerHTML = "";
        const divResp = document.createElement("div");
        divResp.className = "table-responsive";

        const table = document.createElement("table");
        table.className = "ranking-table align-center large-table-font"; // Agregamos una posible alineación

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
                        <td style="text-align: right; ${w1 ? 'font-weight: bold; color: #58a6ff;' : ''}">${m.j1}</td>
                        <td style="text-align: center; font-weight: bold; letter-spacing: 2px;">${m.marcador}</td>
                        <td style="text-align: left; ${w2 ? 'font-weight: bold; color: #f85149;' : ''}">${m.j2}</td>
                    </tr>
                    `;
                }).join("")}
            </tbody>
        `;
        divResp.appendChild(table);
        resultadosContainer.appendChild(divResp);
    }

    if (isLiga) {
        // Liga
        const stdgs = processStandings(matches, plantel ? plantel.all : null);
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

            // Aviso de empates de 3 o más (el mano a mano no alcanza)
            const contAviso = tbody.closest(".table-responsive")?.parentElement;
            contAviso?.querySelectorAll(".aviso-empate-multiple").forEach(el => el.remove());
            renderAvisoEmpates(contAviso, stdgs.empatesSinResolver);
        }
    } else {
        // Grupos
        const gruposList = plantel
            ? Object.keys(plantel).sort().map(l => `Fase de Grupos (${l})`)
            : [...new Set(matches.map(m => m.fase))].sort(); // Fase de Grupos (A), (B)
        const gCont = document.getElementById("grupos-container");
        if (gCont) {
            gCont.innerHTML = "";
            gruposList.forEach(gName => {
                const gMatches = matches.filter(m => m.fase === gName);
                const letra = (gName.match(/\(([A-Z])\)/) || [])[1];
                const stdgs = processStandings(gMatches, plantel && letra ? plantel[letra] : null);

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
                                        <th>#</th>
                                        <th>Jugador</th>
                                        <th>PJ</th>
                                        <th>G</th>
                                        <th>P</th>
                                        <th>GF</th>
                                        <th>GC</th>
                                        <th>DIF</th>
                                        <th>PTS(GF)</th>
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
                                <table class="ranking-table align-center large-table-font">
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
                                                <td style="text-align: right; ${w1 ? 'font-weight: bold; color: #58a6ff;' : ''}">${m.j1}</td>
                                                <td style="text-align: center; font-weight: bold; letter-spacing: 2px;">${m.marcador}</td>
                                                <td style="text-align: left; ${w2 ? 'font-weight: bold; color: #f85149;' : ''}">${m.j2}</td>
                                            </tr>`;
                }).join("")}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                `;
                renderAvisoEmpates(gDiv, stdgs.empatesSinResolver);
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

    // Si de ese partido hay video (js/videos.js), la tarjeta se vuelve
    // clickeable y js/reproductor.js la abre en un modal.
    const video = typeof videoDelPartido === "function" ? videoDelPartido(m) : null;
    const titulo = `${matchTitle || m.fase} — ${m.j1} vs ${m.j2}`;
    const clases = video ? "match-card con-video" : "match-card";
    const datos = video
        ? ` data-video="${video}" data-video-titulo="${titulo}" title="${titulo}" role="button" tabindex="0"`
        : "";
    const cinta = video
        ? `<div class="video-cinta">▶ ${etiquetaDeVideo(m.fase)}</div>`
        : "";

    return `
        <div class="${clases}"${datos}>
            <div class="match-number">${matchTitle || m.fase}</div>
            <div class="match-players">
                <div class="player blue">${m.j1}</div>
                <div class="vs">VS</div>
                <div class="player red">${m.j2}</div>
            </div>
            <div class="score">${g[0]} - ${g[1]}</div>
            <div class="winner-badge">${winnerLabel}</div>
            ${cinta}
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

    const sf1Card = sf1El.querySelector('.match-card');
    const sf2Card = sf2El.querySelector('.match-card');
    const finalCard = finalEl.querySelector('.match-card');

    if (!sf1Card || !sf2Card || !finalCard) return;

    const connRect = connEl.getBoundingClientRect();

    // Si la columna conectora no tiene ancho (oculta por CSS), no hay
    // lineas que dibujar y las cuentas de abajo darian cualquier cosa.
    if (connRect.width === 0) {
        svg.innerHTML = '';
        return;
    }

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
        window.addEventListener('resize', drawBracketLines);
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

    const isLiga = allMatches.some(m => m.fase === "Fase de Liga");
    const groupLabel = isLiga ? "G(FL)" : "G(FG)";

    const groupMatches = allMatches.filter(m => m.fase.includes("Fase"));
    const playoffMatches = allMatches.filter(m => !m.fase.includes("Fase"));

    const stats = {};

    function addGoals(matches, phase) {
        matches.forEach(m => {
            if (!stats[m.j1]) stats[m.j1] = { golesGrupo: 0, golesFinal: 0, golesContra: 0, partidos: 0, pg: 0, pp: 0 };
            if (!stats[m.j2]) stats[m.j2] = { golesGrupo: 0, golesFinal: 0, golesContra: 0, partidos: 0, pg: 0, pp: 0 };
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
            if (g[0] > g[1]) { stats[m.j1].pg++; stats[m.j2].pp++; }
            else if (g[1] > g[0]) { stats[m.j2].pg++; stats[m.j1].pp++; }
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
            pg: s.pg,
            pp: s.pp,
            promedio: s.partidos > 0 ? (s.golesGrupo + s.golesFinal) / s.partidos : 0,
            promedioStr: s.partidos > 0 ? ((s.golesGrupo + s.golesFinal) / s.partidos).toFixed(2) : "0.00"
        };
    }).sort((a, b) => b.promedio - a.promedio || b.totalGoles - a.totalGoles);

    if (statsArray.length === 0) return;

    const mejorPromedio = statsArray[0].promedio;
    const goleadores = statsArray.filter(s => s.promedio === mejorPromedio);
    const goleadorText = goleadores.length === 1
        ? `<strong style="color: #1a56db;">${goleadores[0].nombre}</strong> es el goleador del torneo con un promedio de <strong style="color: #1a56db;">${goleadores[0].promedioStr}</strong> goles por partido`
        : `${goleadores.map(g => `<strong style="color: #1a56db;">${g.nombre}</strong>`).join(", ").replace(/,([^,]*)$/, " y$1")} son los goleadores del torneo con un promedio de <strong style="color: #1a56db;">${goleadores[0].promedioStr}</strong> goles por partido`;

    statsContainer.innerHTML = `
        <h2>📊 ESTADÍSTICAS DEL TORNEO</h2>
        <div class="table-responsive"><table class="ranking-table">
            <thead><tr>
                <th>Jugador</th>
                <th>${groupLabel}</th>
                <th>G(PO)</th>
                <th>TG</th>
                <th>GC</th>
                <th>DIF</th>
                <th>PJ</th>
                <th>PG</th>
                <th>PP</th>
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
                    <td>${s.pg}</td>
                    <td>${s.pp}</td>
                    <td><strong>${s.promedioStr}</strong></td>
                </tr>
            `).join("")}</tbody>
        </table></div>
        <div style="text-align: center; margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #000;">${goleadorText}</p>
            <p style="margin: 5px 0 0 0; font-size: 14px; color: #333; font-style: italic;">El goleador del torneo es el jugador con el mejor promedio de goles</p>
        </div>
    `;
}
