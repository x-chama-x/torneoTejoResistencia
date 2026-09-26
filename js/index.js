document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
        fetch('enfrentamientos_directos.txt').then(r => r.text())
    ]).then(([matchesData]) => {
        // --- Procesar Ranking (calculado desde el historial de partidos) ---
        const mapRanking = {};
        const jugadoresRanking = calcularRankingDesdeTexto(matchesData).map(r => {
            mapRanking[r.nombre] = r.ranking;
            return {
                nombre: r.nombre,
                ranking: r.ranking,
                winRate: 0,
                promedioGoles: 0
            };
        });

        // --- Procesar Partidos ---
        const lineasMatches = matchesData.split('\n');
        const gmap = {}; // Goles globales (sin amistosos, para el ranking histrico)
        const statsGeneral = {}; // Estadsticas web generales
        const matchHistory = {}; // Para la racha
        const matchHistoryDetailed = {}; // Para calcular período (fechas) de cada racha invicta

        // Función para parsear fecha en formato d/m/yyyy a objeto Date
        const parseFecha = (fechaStr) => {
            if (!fechaStr) return new Date(0);
            const partes = fechaStr.split('/');
            if (partes.length >= 3) {
                const dia = parseInt(partes[0], 10);
                const mes = parseInt(partes[1], 10) - 1; // Meses en JS son 0-11
                const anio = parseInt(partes[2], 10);
                return new Date(anio, mes, dia);
            }
            return new Date(0);
        };

        // Orden de fases para torneos (menor número = más temprano en el torneo)
        const ordenFase = (fase) => {
            const faseLower = fase.toLowerCase();
            if (faseLower.includes('fase de liga') || faseLower.includes('fase de grupos')) return 1;
            if (faseLower.includes('semifinal')) return 2;
            if (faseLower.includes('tercer puesto')) return 3;
            if (faseLower.includes('final')) return 4;
            return 0; // Amistosos u otros
        };

        // Primero, recolectar todos los partidos con su índice original
        const partidos = [];
        let indiceOriginal = 0;
        for (const line of lineasMatches) {
            const l = line.trim();
            if (!l || l.startsWith('#')) continue;

            const parts = line.split(',');
            if (parts.length >= 4) {
                const j1 = parts[0].trim();
                const j2 = parts[1].trim();
                const res = parts[2].trim(); // G, P, E
                const marcador = parts[3].trim();
                const torneo = parts.length > 4 ? parts[4].trim() : '';
                const fechaStr = parts.length > 5 ? parts[5].trim() : '';
                const fase = parts.length > 6 ? parts[6].trim() : '';

                partidos.push({
                    j1, j2, res, marcador, torneo, fechaStr, fase,
                    fecha: parseFecha(fechaStr),
                    indiceOriginal: indiceOriginal++
                });
            }
        }

        // Ordenar partidos: por fecha, luego por fase del torneo, luego por índice original
        partidos.sort((a, b) => {
            // 1. Ordenar por fecha (más antiguo primero)
            const diffFecha = a.fecha.getTime() - b.fecha.getTime();
            if (diffFecha !== 0) return diffFecha;

            // 2. Si es el mismo torneo y misma fecha, ordenar por fase
            const esAmistosoA = a.torneo.toLowerCase().includes('amistoso');
            const esAmistosoB = b.torneo.toLowerCase().includes('amistoso');

            if (!esAmistosoA && !esAmistosoB && a.torneo === b.torneo) {
                const diffFase = ordenFase(a.fase) - ordenFase(b.fase);
                if (diffFase !== 0) return diffFase;
            }

            // 3. Si son amistosos de la misma fecha o mismo torneo/fase, respetar orden original
            return a.indiceOriginal - b.indiceOriginal;
        });

        // Buscar fecha máxima para "Actualizado al día"
        let maxDate = new Date(0);
        partidos.forEach(p => {
            if (p.fecha > maxDate) maxDate = p.fecha;
        });

        if (maxDate.getTime() > 0) {
            const elUpdated = document.getElementById('last-updated');
            if (elUpdated) {
                const day = String(maxDate.getDate()).padStart(2, '0');
                const month = String(maxDate.getMonth() + 1).padStart(2, '0');
                const year = maxDate.getFullYear();
                elUpdated.textContent = `Actualizado al día ${day}/${month}/${year}`;
            }
        }

        renderResultadosPorFecha(partidos);

        // Procesar partidos ya ordenados
        for (const partido of partidos) {
            const { j1, j2, res, marcador, torneo, fechaStr } = partido;

            // Historial para racha
            if (!matchHistory[j1]) matchHistory[j1] = [];
            if (!matchHistory[j2]) matchHistory[j2] = [];
            if (!matchHistoryDetailed[j1]) matchHistoryDetailed[j1] = [];
            if (!matchHistoryDetailed[j2]) matchHistoryDetailed[j2] = [];

            let resJ1 = null, resJ2 = null;
            if (res === 'G') { resJ1 = 'G'; resJ2 = 'P'; }
            else if (res === 'P') { resJ1 = 'P'; resJ2 = 'G'; }
            else if (res === 'E') { resJ1 = 'E'; resJ2 = 'E'; }

            if (resJ1) {
                matchHistory[j1].push(resJ1);
                matchHistory[j2].push(resJ2);
                matchHistoryDetailed[j1].push({ res: resJ1, fechaStr });
                matchHistoryDetailed[j2].push({ res: resJ2, fechaStr });
            }

            // Stats para ranking de goles (omitiendo amistosos)
            if (!torneo.toLowerCase().includes('amistoso')) {
                const goles = marcador.split('-');
                if (goles.length === 2) {
                    const g1 = parseInt(goles[0], 10);
                    const g2 = parseInt(goles[1], 10);
                    if (!isNaN(g1)) gmap[j1] = (gmap[j1] || 0) + g1;
                    if (!isNaN(g2)) gmap[j2] = (gmap[j2] || 0) + g2;
                }
            }

            // Stats generales (todos los partidos)
            if (!statsGeneral[j1]) statsGeneral[j1] = { pj:0, g:0, p:0, e:0, gf:0, gc:0 };
            if (!statsGeneral[j2]) statsGeneral[j2] = { pj:0, g:0, p:0, e:0, gf:0, gc:0 };

            const goles = marcador.split('-');
            if (goles.length === 2) {
                const g1 = parseInt(goles[0], 10);
                const g2 = parseInt(goles[1], 10);

                if (!isNaN(g1) && !isNaN(g2)) {
                    statsGeneral[j1].pj++; statsGeneral[j2].pj++;
                    statsGeneral[j1].gf += g1; statsGeneral[j1].gc += g2;
                    statsGeneral[j2].gf += g2; statsGeneral[j2].gc += g1;

                    if (g1 > g2) { statsGeneral[j1].g++; statsGeneral[j2].p++; }
                    else if (g1 < g2) { statsGeneral[j1].p++; statsGeneral[j2].g++; }
                    else { statsGeneral[j1].e++; statsGeneral[j2].e++; }
                }
            }
        }

        // Actualizar winRate y promedioGoles en jugadoresRanking desde statsGeneral
        jugadoresRanking.forEach(j => {
            const s = statsGeneral[j.nombre];
            if (s && s.pj > 0) {
                j.winRate = s.g / s.pj; // g/pj = ganados sobre total
                j.promedioGoles = s.gf / s.pj;
            } else {
                j.winRate = 0;
                j.promedioGoles = 0;
            }
        });

        // Pintar tabla ranking
        const tbodyRanking = document.querySelector('#ranking-table tbody');
        if (tbodyRanking) {
            jugadoresRanking.forEach((j, index) => {
                const tr = document.createElement('tr');
                let rachaHtml = '<div class="streak-container">';
                const historial = matchHistory[j.nombre] || [];
                // ltimos 5 partidos
                const ultimos5 = historial.slice(-5);
                // Rellenar con vacos si hay menos de 5
                for (let i = 0; i < 5; i++) {
                    if (i < ultimos5.length) {
                        const res = ultimos5[i];
                        if (res === 'G') rachaHtml += '<span class="streak-box streak-w" title="Ganado">G</span>';
                        else if (res === 'E') rachaHtml += '<span class="streak-box streak-d" title="Empatado">E</span>';
                        else if (res === 'P') rachaHtml += '<span class="streak-box streak-l" title="Perdido">P</span>';
                    } else {
                        rachaHtml += '<span class="streak-box streak-empty"></span>';
                    }
                }
                rachaHtml += '</div>';

                tr.innerHTML = `<td>${index + 1}</td><td><strong>${j.nombre}</strong></td><td>${j.ranking}</td><td>${rachaHtml}</td>`;
                tbodyRanking.appendChild(tr);
            });
        }

        // --- Calcular y pintar Top 5 Mayores Invictos ---
        // Se listan rachas individuales (no agrupadas por jugador): si alguien
        // tuvo más de un invicto, cada uno entra por separado en el top 5.
        const todasLasRachas = [];
        for (const nombre in matchHistoryDetailed) {
            const historial = matchHistoryDetailed[nombre];
            let inicioIdx = null;

            for (let i = 0; i < historial.length; i++) {
                if (historial[i].res === 'G' || historial[i].res === 'E') {
                    if (inicioIdx === null) inicioIdx = i;
                } else if (inicioIdx !== null) {
                    todasLasRachas.push({
                        nombre,
                        npi: i - inicioIdx,
                        fechaInicio: historial[inicioIdx].fechaStr,
                        fechaFin: historial[i - 1].fechaStr,
                        activa: false
                    });
                    inicioIdx = null;
                }
            }

            // Racha que llega hasta el último partido registrado: todavía no
            // se cortó con una derrota, así que sigue activa.
            if (inicioIdx !== null) {
                todasLasRachas.push({
                    nombre,
                    npi: historial.length - inicioIdx,
                    fechaInicio: historial[inicioIdx].fechaStr,
                    fechaFin: historial[historial.length - 1].fechaStr,
                    activa: true
                });
            }
        }

        todasLasRachas.sort((a, b) => {
            if (b.npi !== a.npi) return b.npi - a.npi;
            return parseFecha(b.fechaFin) - parseFecha(a.fechaFin);
        });
        const top5Invictos = todasLasRachas.slice(0, 5);

        const tbodyInvictos = document.querySelector('#invictos-table tbody');
        if (tbodyInvictos) {
            top5Invictos.forEach((item, index) => {
                const periodo = item.activa
                    ? item.fechaInicio
                    : `${item.fechaInicio} → ${item.fechaFin}`;
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${index + 1}</td><td><strong>${item.nombre}</strong></td><td>${item.npi}</td><td>${periodo}</td>`;
                tbodyInvictos.appendChild(tr);
            });
            if (top5Invictos.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="4" style="text-align:center; color:#8b949e;">Aún no hay datos</td>`;
                tbodyInvictos.appendChild(tr);
            }
        }

        // Pintar tabla ranking de goles
        const arrGoles = Object.keys(gmap)
            .map(nombre => ({ nombre, goles: gmap[nombre] }))
            .filter(j => j.goles > 0);
        arrGoles.sort((a, b) => b.goles - a.goles);

        const tbodyGoals = document.querySelector('#goals-ranking-table tbody');
        if (tbodyGoals) {
            arrGoles.forEach((j, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${index + 1}</td><td><strong>${j.nombre}</strong></td><td>${j.goles}</td>`;
                tbodyGoals.appendChild(tr);
            });
        }

        // Pintar tabla estadísticas generales
        const arrStats = Object.keys(statsGeneral).map(nombre => {
            const s = statsGeneral[nombre];
            const winRate = s.pj > 0 ? ((s.g / s.pj) * 100).toFixed(1) + "%" : "0.0%";
            const promGoles = s.pj > 0 ? (s.gf / s.pj).toFixed(2) : "0.00";
            return {
                nombre,
                pj: s.pj,
                g: s.g,
                p: s.p,
                winRate,
                gf: s.gf,
                gc: s.gc,
                promGoles,
                rankingPts: mapRanking[nombre] || 0 // Usar como llave de ordenamiento
            };
        });

        // Ordenar por puntos del ranking fifa de mayor a menor
        arrStats.sort((a, b) => b.rankingPts - a.rankingPts);

        const tbodyStats = document.querySelector('#general-stats-table tbody');
        if (tbodyStats) {
            arrStats.forEach((j, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td><strong>${j.nombre}</strong></td>
                    <td>${j.pj}</td>
                    <td>${j.g}</td>
                    <td>${j.p}</td>
                    <td><strong>${j.winRate}</strong></td>
                    <td>${j.gf}</td>
                    <td>${j.gc}</td>
                    <td>${j.gf - j.gc > 0 ? '+' : ''}${j.gf - j.gc}</td>
                    <td><strong>${j.promGoles}</strong></td>
                `;
                tbodyStats.appendChild(tr);
            });
        }

        // --- Procesar Campeones ---
        const campeones = {};
        for (const line of lineasMatches) {
            const l = line.trim();
            if (!l || l.startsWith('#')) continue;

            const parts = line.split(',');
            if (parts.length >= 7) {
                const torneo = parts[4].trim();
                const fechaStr = parts[5].trim();
                const fase = parts[6].trim();

                if (fase === 'Final') {
                    const j1 = parts[0].trim();
                    const j2 = parts[1].trim();
                    const resJ1 = parts[2].trim();

                    const champion = resJ1 === 'G' ? j1 : j2;
                    const subcampeon = resJ1 === 'G' ? j2 : j1;

                    // Extraer mes/año
                    const dateParts = fechaStr.split('/');
                    let mesAnio = 'Desc.';
                    if (dateParts.length >= 3) {
                        const m = parseInt(dateParts[1], 10);
                        const y = dateParts[2];
                        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                        if (m >= 1 && m <= 12) {
                            mesAnio = `${meses[m-1]} ${y}`;
                        }
                    }

                    // Asegurar que guardamos el campeón para el torneo
                    campeones[torneo] = { champion, subcampeon, mesAnio, fecha: fechaStr };
                }
            }
        }

        // Pintar tabla campeones
        const tbodyChampions = document.querySelector('#champions-table tbody');
        if (tbodyChampions) {
            Object.values(campeones).forEach(camp => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${camp.mesAnio}</td>
                    <td><strong>${camp.champion}</strong></td>
                    <td>${camp.subcampeon}</td>
                `;
                tbodyChampions.appendChild(tr);
            });
            if (Object.keys(campeones).length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="3" style="text-align:center; color:#8b949e;">Aún no hay campeones</td>`;
                tbodyChampions.appendChild(tr);
            }
        }

        // --- Procesar Historial de ganadores: Tejo Nations League ---
        // Solo se muestran ediciones cerradas (años anteriores al actual), ya que
        // son anuales y la del año en curso todavía se está jugando.
        const tbodyNL = document.querySelector('#nations-league-champions-table tbody');
        if (tbodyNL) {
            const amistosos = parsearAmistosos(matchesData);
            const anioActual = new Date().getFullYear();
            const aniosCerrados = [...new Set(amistosos.map(p => p.anio))]
                .filter(anio => anio < anioActual)
                .sort((a, b) => b - a);

            aniosCerrados.forEach(anio => {
                const posiciones = calcularPosicionesNL(amistosos.filter(p => p.anio === anio));
                const campeon = posiciones[0];
                const subcampeon = posiciones[1];
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${anio}</td>
                    <td><strong>${campeon ? campeon.nombre : '-'}</strong></td>
                    <td>${subcampeon ? subcampeon.nombre : '-'}</td>
                `;
                tbodyNL.appendChild(tr);
            });

            if (aniosCerrados.length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="3" style="text-align:center; color:#8b949e;">Aún no hay ediciones cerradas</td>`;
                tbodyNL.appendChild(tr);
            }
        }

    }).catch(error => {
        console.error('Error al cargar datos:', error);
    });
});

function getTipoLabel(partido) {
    const torneo = partido.torneo;
    const fase = partido.fase;

    if (torneo.toLowerCase().includes('amistoso')) return 'Am.';

    let tn = '';
    const tl = torneo.toLowerCase();
    if (tl.includes('primer')) tn = 'T1';
    else if (tl.includes('segundo')) tn = 'T2';
    else if (tl.includes('tercer')) tn = 'T3';
    else if (tl.includes('cuarto')) tn = 'T4';
    else tn = torneo.split(' ')[0];

    const fl = fase.toLowerCase();
    if (fl.includes('liga')) return `Liga ${tn}`;
    const grupoMatch = fase.match(/\(([A-Z])\)/);
    if (grupoMatch) return `Grp ${grupoMatch[1]} ${tn}`;
    if (fl.includes('semifinal')) return `Semi ${tn}`;
    if (fl.includes('tercer')) return `3er P. ${tn}`;
    if (fl.includes('final')) return `Final ${tn}`;
    return `${fase} ${tn}`;
}

function renderResultadosPorFecha(partidos) {
    const container = document.getElementById('resultados-fechas');
    if (!container) return;

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Agrupar por fecha (más reciente primero)
    const fechasMap = new Map();
    [...partidos].reverse().forEach(p => {
        const key = p.fechaStr || 'Sin fecha';
        if (!fechasMap.has(key)) fechasMap.set(key, []);
        fechasMap.get(key).push(p);
    });

    const fechas = Array.from(fechasMap.keys());
    if (fechas.length === 0) return;

    let currentIndex = 0;

    function formatFecha(fechaStr) {
        const parts = fechaStr.split('/');
        if (parts.length === 3) {
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const y = parts[2];
            if (m >= 0 && m < 12) return `${d} ${meses[m]} ${y}`;
        }
        return fechaStr;
    }

    function buildTable(matchs) {
        return `
            <div class="table-responsive">
                <table class="ranking-table large-table-font">
                    <thead>
                        <tr>
                            <th style="text-align: right;">Azul</th>
                            <th style="text-align: center;">Resultado</th>
                            <th style="text-align: left;">Rojo</th>
                            <th style="text-align: center; color: #8b949e; font-weight: normal;">Tipo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${matchs.map(m => {
                            const g = m.marcador.split('-').map(Number);
                            const w1 = g[0] > g[1];
                            const w2 = g[1] > g[0];
                            const tipo = getTipoLabel(m);
                            return `
                                <tr>
                                    <td style="text-align: right; ${w1 ? 'font-weight: bold; color: #58a6ff;' : ''}">${m.j1}</td>
                                    <td style="text-align: center; font-weight: bold; letter-spacing: 2px;">${m.marcador}</td>
                                    <td style="text-align: left; ${w2 ? 'font-weight: bold; color: #f85149;' : ''}">${m.j2}</td>
                                    <td style="text-align: center; font-size: 0.78em; color: #8b949e;">${tipo}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    function render() {
        const fechaStr = fechas[currentIndex];
        const matchs = fechasMap.get(fechaStr);
        const isPrev = currentIndex < fechas.length - 1;
        const isNext = currentIndex > 0;

        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; gap: 0.5rem;">
                <button id="btn-fecha-prev" style="background: none; border: 1px solid #30363d; color: ${isPrev ? '#58a6ff' : '#3d444d'}; border-radius: 6px; padding: 0.3rem 0.75rem; cursor: ${isPrev ? 'pointer' : 'default'}; font-size: 1.1rem; line-height: 1;" ${isPrev ? '' : 'disabled'}>&#8592;</button>
                <span style="color: #58a6ff; font-size: 1rem; font-weight: bold; text-align: center;">${formatFecha(fechaStr)}</span>
                <button id="btn-fecha-next" style="background: none; border: 1px solid #30363d; color: ${isNext ? '#58a6ff' : '#3d444d'}; border-radius: 6px; padding: 0.3rem 0.75rem; cursor: ${isNext ? 'pointer' : 'default'}; font-size: 1.1rem; line-height: 1;" ${isNext ? '' : 'disabled'}>&#8594;</button>
            </div>
            <div style="text-align: center; color: #8b949e; font-size: 0.8em; margin-bottom: 0.75rem;">${currentIndex + 1} / ${fechas.length}</div>
            ${buildTable(matchs)}
        `;

        document.getElementById('btn-fecha-prev').addEventListener('click', () => {
            if (currentIndex < fechas.length - 1) { currentIndex++; render(); }
        });
        document.getElementById('btn-fecha-next').addEventListener('click', () => {
            if (currentIndex > 0) { currentIndex--; render(); }
        });
    }

    render();
}
