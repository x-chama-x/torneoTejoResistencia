document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
        fetch('ranking.txt').then(r => r.text()),
        fetch('enfrentamientos_directos.txt').then(r => r.text())
    ]).then(([rankingData, matchesData]) => {
        // --- Procesar Ranking ---
        const lineasRanking = rankingData.split('\n');
        const mapRanking = {};
        const jugadoresRanking = [];
        for (const linea of lineasRanking) {
            const l = linea.trim();
            if (l && !l.startsWith('#')) {
                const partes = l.split(',');
                if (partes.length >= 4) {
                    const nombre = partes[0].trim();
                    const ranking = parseInt(partes[1].trim() || 0, 10);
                    mapRanking[nombre] = ranking;
                    jugadoresRanking.push({
                        nombre: nombre,
                        ranking: ranking,
                        winRate: parseFloat(partes[2].trim() || 0),
                        promedioGoles: parseFloat(partes[3].trim() || 0)
                    });
                }
            }
        }

        // Ordenar por ranking
        jugadoresRanking.sort((a, b) => b.ranking - a.ranking);

        // Pintar tabla ranking
        const tbodyRanking = document.querySelector('#ranking-table tbody');
        if (tbodyRanking) {
            jugadoresRanking.forEach((j, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${index + 1}</td><td><strong>${j.nombre}</strong></td><td>${j.ranking}</td>`;
                tbodyRanking.appendChild(tr);
            });
        }

        // --- Procesar Partidos ---
        const lineasMatches = matchesData.split('\n');
        const gmap = {}; // Goles globales (sin amistosos, para el ranking histórico)
        const statsGeneral = {}; // Estadísticas web generales

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
                    campeones[torneo] = { champion, mesAnio, fecha: fechaStr };
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
                `;
                tbodyChampions.appendChild(tr);
            });
            if (Object.keys(campeones).length === 0) {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td colspan="2" style="text-align:center; color:#8b949e;">Aún no hay campeones</td>`;
                tbodyChampions.appendChild(tr);
            }
        }

    }).catch(error => {
        console.error('Error al cargar datos:', error);
    });
});
