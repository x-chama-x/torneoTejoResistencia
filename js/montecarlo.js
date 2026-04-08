// Función para simular un torneo completo y devolver resultados
// Ahora acepta un parámetro opcional 'participantesOverride' que, si se proporciona,
// será usado como la lista de jugadores en lugar de 'jugadoresBase'.
// También acepta 'gruposConfig' para usar grupos manuales fijos
function simularTorneoCompleto(numJugadores, participantesOverride = null, gruposConfig = null) {
    let jugadores = participantesOverride ? [...participantesOverride] : [...jugadoresBase];

    const jugadoresNecesarios = numJugadores - jugadores.length;
    for (let i = 0; i < jugadoresNecesarios; i++) {
        jugadores.push(nuevosJugadores[i]);
    }

    // Mezclar jugadores SOLO si no hay configuración de grupos manuales
    if (!gruposConfig) {
        jugadores = jugadores.sort(() => Math.random() - 0.5);
    }

    let clasificados = [];
    let matchesPlayed = 0; // contador de partidos en esta simulación

    if (numJugadores === 7) {
        // Formato Liga
        const { partidos, rankingGrupo } = simularGrupo(jugadores, 'Liga', 1);
        matchesPlayed += partidos.length;
        clasificados = rankingGrupo.slice(0, 4);

    } else if (numJugadores === 8) {
        // 2 grupos de 4
        let grupoA, grupoB;

        if (gruposConfig) {
            grupoA = gruposConfig.grupoA.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
            grupoB = gruposConfig.grupoB.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
        } else {
            grupoA = jugadores.slice(0, 4);
            grupoB = jugadores.slice(4, 8);
        }

        const resultadoA = simularGrupo(grupoA, 'A', 1);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber);

        matchesPlayed += resultadoA.partidos.length + resultadoB.partidos.length;

        clasificados = [
            ...resultadoA.rankingGrupo.slice(0, 2),
            ...resultadoB.rankingGrupo.slice(0, 2)
        ];

    } else if (numJugadores === 9) {
        // 3 grupos de 3
        let grupoA, grupoB, grupoC;

        if (gruposConfig) {
            grupoA = gruposConfig.grupoA.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
            grupoB = gruposConfig.grupoB.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
            grupoC = gruposConfig.grupoC.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
        } else {
            grupoA = jugadores.slice(0, 3);
            grupoB = jugadores.slice(3, 6);
            grupoC = jugadores.slice(6, 9);
        }

        const resultadoA = simularGrupo(grupoA, 'A', 1);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber);
        const resultadoC = simularGrupo(grupoC, 'C', resultadoB.matchNumber);

        matchesPlayed += resultadoA.partidos.length + resultadoB.partidos.length + resultadoC.partidos.length;

        const primeros = [
            resultadoA.rankingGrupo[0],
            resultadoB.rankingGrupo[0],
            resultadoC.rankingGrupo[0]
        ];

        const segundos = [
            resultadoA.rankingGrupo[1],
            resultadoB.rankingGrupo[1],
            resultadoC.rankingGrupo[1]
        ];

        const terceros = [
            resultadoA.rankingGrupo[2],
            resultadoB.rankingGrupo[2],
            resultadoC.rankingGrupo[2]
        ];

        // ========== MINI-LIGA ENTRE SEGUNDOS (3 partidos) ==========
        const candidatosSegundos = segundos.map(s => ({
            nombre: s.nombre,
            grupo: s.grupo,
            data: jugadores.find(j => j.nombre === s.nombre) || jugadoresDisponibles.find(j => j.nombre === s.nombre) || { nombre: s.nombre, ranking: 50, winRate: 0.5, promedioGoles: 5 }
        }));

        const miniStatsSegundos = {};
        candidatosSegundos.forEach(c => {
            miniStatsSegundos[c.nombre] = { pj: 0, pg: 0, pp: 0, gf: 0, gc: 0, pts: 0, grupo: c.grupo };
        });

        const miniPartidosSegundos = [];
        for (let i = 0; i < candidatosSegundos.length; i++) {
            for (let j = i + 1; j < candidatosSegundos.length; j++) {
                const j1 = candidatosSegundos[i].data;
                const j2 = candidatosSegundos[j].data;
                const resultadoMini = simularPartido(j1, j2);

                miniPartidosSegundos.push({
                    azul: j1.nombre,
                    rojo: j2.nombre,
                    golesAzul: resultadoMini.goles1,
                    golesRojo: resultadoMini.goles2,
                    ganador: resultadoMini.ganador
                });

                miniStatsSegundos[j1.nombre].pj++;
                miniStatsSegundos[j2.nombre].pj++;
                miniStatsSegundos[j1.nombre].gf += resultadoMini.goles1;
                miniStatsSegundos[j1.nombre].gc += resultadoMini.goles2;
                miniStatsSegundos[j2.nombre].gf += resultadoMini.goles2;
                miniStatsSegundos[j2.nombre].gc += resultadoMini.goles1;

                if (resultadoMini.ganador === j1.nombre) {
                    miniStatsSegundos[j1.nombre].pg++;
                    miniStatsSegundos[j2.nombre].pp++;
                    miniStatsSegundos[j1.nombre].pts += resultadoMini.goles1;
                    miniStatsSegundos[j2.nombre].pts += resultadoMini.goles2;
                } else {
                    miniStatsSegundos[j2.nombre].pg++;
                    miniStatsSegundos[j1.nombre].pp++;
                    miniStatsSegundos[j2.nombre].pts += resultadoMini.goles2;
                    miniStatsSegundos[j1.nombre].pts += resultadoMini.goles1;
                }
            }
        }

        matchesPlayed += miniPartidosSegundos.length; // 3 partidos

        const rankingSegundos = Object.entries(miniStatsSegundos)
            .map(entry => ({ nombre: entry[0], ...entry[1] }))
            .sort((a, b) => b.pts - a.pts || b.pg - a.pg || (b.gf - b.gc) - (a.gf - a.gc));

        // ========== REPECHAJE ENTRE TERCEROS (3 partidos) ==========
        const candidatosTerceros = terceros.map(t => ({
            nombre: t.nombre,
            grupo: t.grupo,
            data: jugadores.find(j => j.nombre === t.nombre) || jugadoresDisponibles.find(j => j.nombre === t.nombre) || { nombre: t.nombre, ranking: 50, winRate: 0.5, promedioGoles: 5 }
        }));

        const miniStatsTerceros = {};
        candidatosTerceros.forEach(c => {
            miniStatsTerceros[c.nombre] = { pj: 0, pg: 0, pp: 0, gf: 0, gc: 0, pts: 0, grupo: c.grupo };
        });

        const miniPartidosTerceros = [];
        for (let i = 0; i < candidatosTerceros.length; i++) {
            for (let j = i + 1; j < candidatosTerceros.length; j++) {
                const j1 = candidatosTerceros[i].data;
                const j2 = candidatosTerceros[j].data;
                const resultadoMini = simularPartido(j1, j2);

                miniPartidosTerceros.push({
                    azul: j1.nombre,
                    rojo: j2.nombre,
                    golesAzul: resultadoMini.goles1,
                    golesRojo: resultadoMini.goles2,
                    ganador: resultadoMini.ganador
                });

                miniStatsTerceros[j1.nombre].pj++;
                miniStatsTerceros[j2.nombre].pj++;
                miniStatsTerceros[j1.nombre].gf += resultadoMini.goles1;
                miniStatsTerceros[j1.nombre].gc += resultadoMini.goles2;
                miniStatsTerceros[j2.nombre].gf += resultadoMini.goles2;
                miniStatsTerceros[j2.nombre].gc += resultadoMini.goles1;

                if (resultadoMini.ganador === j1.nombre) {
                    miniStatsTerceros[j1.nombre].pg++;
                    miniStatsTerceros[j2.nombre].pp++;
                    miniStatsTerceros[j1.nombre].pts += resultadoMini.goles1;
                    miniStatsTerceros[j2.nombre].pts += resultadoMini.goles2;
                } else {
                    miniStatsTerceros[j2.nombre].pg++;
                    miniStatsTerceros[j1.nombre].pp++;
                    miniStatsTerceros[j2.nombre].pts += resultadoMini.goles2;
                    miniStatsTerceros[j1.nombre].pts += resultadoMini.goles1;
                }
            }
        }

        matchesPlayed += miniPartidosTerceros.length; // 3 partidos

        const rankingTerceros = Object.entries(miniStatsTerceros)
            .map(entry => ({ nombre: entry[0], ...entry[1] }))
            .sort((a, b) => b.pts - a.pts || b.pg - a.pg || (b.gf - b.gc) - (a.gf - a.gc));

        // ========== PARTIDO ELIMINATORIO PRE-PLAYOFFS (1 partido) ==========
        // 1° de repechaje segundos vs 1° de repechaje terceros
        const primeroSegundos = rankingSegundos[0];
        const primeroTerceros = rankingTerceros[0];

        const dataPrimeroSegundos = jugadores.find(j => j.nombre === primeroSegundos.nombre) || jugadoresDisponibles.find(j => j.nombre === primeroSegundos.nombre);
        const dataPrimeroTerceros = jugadores.find(j => j.nombre === primeroTerceros.nombre) || jugadoresDisponibles.find(j => j.nombre === primeroTerceros.nombre);

        const partidoEliminatorio = simularPartido(dataPrimeroSegundos, dataPrimeroTerceros);

        matchesPlayed += 1; // 1 partido eliminatorio

        // El ganador del partido eliminatorio es el 4° clasificado
        const cuartoClasificado = partidoEliminatorio.ganador === dataPrimeroSegundos.nombre ? primeroSegundos : primeroTerceros;

        clasificados = [...primeros, cuartoClasificado];

        // Para formato 9 jugadores: guardar info de clasificación directa vs indirecta
        var clasificadosDirectos9 = primeros.map(p => p.nombre); // 1ros de grupo clasifican directo
        var clasificadoIndirecto9 = cuartoClasificado.nombre; // El que ganó el eliminatorio

    } else if (numJugadores === 10) {
        // 2 grupos de 5
        let grupoA, grupoB;

        if (gruposConfig) {
            grupoA = gruposConfig.grupoA.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
            grupoB = gruposConfig.grupoB.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
        } else {
            grupoA = jugadores.slice(0, 5);
            grupoB = jugadores.slice(5, 10);
        }

        const resultadoA = simularGrupo(grupoA, 'A', 1);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber);

        matchesPlayed += resultadoA.partidos.length + resultadoB.partidos.length;

        clasificados = [
            ...resultadoA.rankingGrupo.slice(0, 2),
            ...resultadoB.rankingGrupo.slice(0, 2)
        ];
    }

    // Fase Final (Playoffs) - 2 semifinales + 3er puesto + final = 4 partidos
    // Solo sumar si ya hay clasificados (siempre habrá 4)
    matchesPlayed += 4;

    // Playoffs
    const semifinalistas = [...clasificados].sort(() => Math.random() - 0.5);

    const sf1Jugador1 = jugadores.find(j => j.nombre === semifinalistas[0].nombre);
    const sf1Jugador2 = jugadores.find(j => j.nombre === semifinalistas[1].nombre);
    const sf2Jugador1 = jugadores.find(j => j.nombre === semifinalistas[2].nombre);
    const sf2Jugador2 = jugadores.find(j => j.nombre === semifinalistas[3].nombre);

    const sf1 = simularPartido(sf1Jugador1, sf1Jugador2);
    const sf2 = simularPartido(sf2Jugador1, sf2Jugador2);

    const perdedorSF1 = sf1.ganador === semifinalistas[0].nombre ? semifinalistas[1].nombre : semifinalistas[0].nombre;
    const perdedorSF2 = sf2.ganador === semifinalistas[2].nombre ? semifinalistas[3].nombre : semifinalistas[2].nombre;

    const tercerPuestoJ1 = jugadores.find(j => j.nombre === perdedorSF1);
    const tercerPuestoJ2 = jugadores.find(j => j.nombre === perdedorSF2);
    const tercerPuesto = simularPartido(tercerPuestoJ1, tercerPuestoJ2);

    const finalistaJ1 = jugadores.find(j => j.nombre === sf1.ganador);
    const finalistaJ2 = jugadores.find(j => j.nombre === sf2.ganador);
    const final = simularPartido(finalistaJ1, finalistaJ2);

    const cuarto = tercerPuesto.ganador === perdedorSF1 ? perdedorSF2 : perdedorSF1;
    const subcampeon = final.ganador === sf1.ganador ? sf2.ganador : sf1.ganador;

    // Resultado base
    const resultadoBase = {
        campeon: final.ganador,
        subcampeon: subcampeon,
        tercero: tercerPuesto.ganador,
        cuarto: cuarto,
        semifinalistas: semifinalistas.map(s => s.nombre),
        matchesPlayed
    };

    // Si es formato 9 jugadores, agregar info de clasificación directa vs indirecta
    if (numJugadores === 9 && typeof clasificadosDirectos9 !== 'undefined') {
        resultadoBase.clasificadosDirectos = clasificadosDirectos9;
        resultadoBase.clasificadoIndirecto = clasificadoIndirecto9;
    }

    return resultadoBase;
}

// Función principal Monte Carlo
async function simularMonteCarlo() {
    const numJugadores = parseInt(document.getElementById('numPlayers').value);
    const numSimulaciones = parseInt(document.getElementById('numSimulaciones').value);

    // Obtener modo de grupos
    const modoGruposEl = document.getElementById('modoGrupos');
    const modoGrupos = modoGruposEl ? modoGruposEl.value : 'aleatorio';

    // Validar selección actual
    const seleccion = obtenerJugadoresSeleccionadosPorNombre(numJugadores);
    if (!seleccion || seleccion.length !== numJugadores) {
        const topWarn = document.getElementById('topSelectionWarning');
        if (topWarn) {
            topWarn.textContent = `Por favor seleccioná exactamente ${numJugadores} jugadores antes de simular.`;
            topWarn.style.display = 'block';
        }
        return;
    }

    // Validar grupos manuales si está en ese modo
    let gruposConfig = null;
    if (modoGrupos === 'manual' && numJugadores >= 8) {
        if (!window.gruposManualConfig) {
            alert('Por favor configurá y confirmá los grupos manualmente antes de simular.');
            return;
        }
        gruposConfig = window.gruposManualConfig;
    }

    // Mostrar barra de progreso
    document.getElementById('progreso').style.display = 'block';
    document.getElementById('resultado').innerHTML = '';
    document.getElementById('btnSimular').disabled = true;

    // Ocultar controles y selección de jugadores, dejando solo los nav-links
    const controls = document.querySelector('.controls');
    if (controls) {
        Array.from(controls.children).forEach(child => {
            if (!child.classList.contains('nav-links')) {
                child.style.display = 'none';
            }
        });
    }
    document.getElementById('playerSelection').style.display = 'none';
    const gruposManualContainer = document.getElementById('gruposManualContainer');
    if (gruposManualContainer) gruposManualContainer.style.display = 'none';
    const topWarn = document.getElementById('topSelectionWarning');
    if (topWarn) topWarn.style.display = 'none';

    // Inicializar contadores
    const estadisticas = {};

    // Construir lista de jugadores participantes según selección
    let jugadoresParticipantes = seleccion.slice();
    // si por algún motivo la selección no está completa, completamos con nuevosJugadores
    if (jugadoresParticipantes.length < numJugadores) {
        const faltan = numJugadores - jugadoresParticipantes.length;
        for (let i = 0; i < faltan; i++) {
            if (nuevosJugadores[i]) jugadoresParticipantes.push(nuevosJugadores[i]);
        }
    }

    jugadoresParticipantes.forEach(j => {
        estadisticas[j.nombre] = {
            campeon: 0,
            subcampeon: 0,
            tercero: 0,
            cuarto: 0,
            semifinalista: 0,  // Llega a playoffs (top 4)
            noClasifica: 0,    // No llega a playoffs
            clasificaDirecto: 0,   // Para formato 9: clasifica como 1° de grupo
            clasificaIndirecto: 0  // Para formato 9: clasifica por repechaje
        };
    });

    const batchSize = 100; // Procesar en lotes para actualizar UI
    let simulacionesCompletadas = 0;

    const totalBatches = Math.ceil(numSimulaciones / batchSize);

    // NUEVAS métricas acumuladas
    let totalMatchesSimulated = 0;

    // Ejecutar simulaciones en batches
    for (let batch = 0; batch < totalBatches; batch++) {
        const actualBatchSize = Math.min(batchSize, numSimulaciones - simulacionesCompletadas);
        for (let i = 0; i < actualBatchSize; i++) {
            // En cada iteración usamos la lista fija de jugadoresParticipantes
            // Pasamos gruposConfig para mantener grupos manuales fijos
            const resultado = simularTorneoCompleto(numJugadores, jugadoresParticipantes, gruposConfig);

            estadisticas[resultado.campeon].campeon++;
            estadisticas[resultado.subcampeon].subcampeon++;
            estadisticas[resultado.tercero].tercero++;
            estadisticas[resultado.cuarto].cuarto++;

            resultado.semifinalistas.forEach(nombre => {
                estadisticas[nombre].semifinalista++;
            });

            // Para formato 9 jugadores: registrar clasificación directa vs indirecta
            if (numJugadores === 9 && resultado.clasificadosDirectos) {
                resultado.clasificadosDirectos.forEach(nombre => {
                    estadisticas[nombre].clasificaDirecto++;
                });
                if (resultado.clasificadoIndirecto) {
                    estadisticas[resultado.clasificadoIndirecto].clasificaIndirecto++;
                }
            }

            jugadoresParticipantes.forEach(j => {
                if (!resultado.semifinalistas.includes(j.nombre)) {
                    estadisticas[j.nombre].noClasifica++;
                }
            });

            // Acumular métricas nuevas
            totalMatchesSimulated += resultado.matchesPlayed || 0;

            simulacionesCompletadas++;
        }

        // Actualizar progreso
        const progreso = (simulacionesCompletadas / numSimulaciones) * 100;
        document.getElementById('progressBar').style.width = progreso + '%';
        document.getElementById('progressText').textContent = Math.round(progreso) + '%';

        // Permitir que el navegador actualice la UI
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Ocultar progreso
    document.getElementById('progreso').style.display = 'none';
    document.getElementById('btnSimular').disabled = false;

    // Mostrar resultados (le paso las métricas nuevas y la configuración de grupos)
    mostrarResultados(estadisticas, numSimulaciones, numJugadores, { totalMatchesSimulated, gruposConfig });
}

function mostrarResultados(estadisticas, numSimulaciones, numJugadores, extras = {}) {
    let html = '';

    html += `<div class="phase-title">📊 RESULTADOS DE ${numSimulaciones.toLocaleString()} SIMULACIONES</div>`;
    html += `<div class="subtitle" style="text-align: center; margin-bottom: 30px;">Formato: ${getFormatoNombre(numJugadores)}</div>`;

    // Mostrar configuración de grupos si es manual
    if (extras.gruposConfig && numJugadores >= 8) {
        html += `<div style="background:#e3f2fd; padding:15px; border-radius:8px; margin-bottom:20px; border:1px solid #2196f3;">
            <h4 style="margin:0 0 10px 0; color:#1565c0; text-align:center;">✋ GRUPOS CONFIGURADOS MANUALMENTE</h4>
            <div style="display:flex; justify-content:center; gap:20px; flex-wrap:wrap;">`;

        if (extras.gruposConfig.grupoA && extras.gruposConfig.grupoA.length > 0) {
            html += `<div style="background:white; padding:10px 15px; border-radius:6px; min-width:150px;">
                <strong style="color:#667eea;">Grupo A:</strong><br>${extras.gruposConfig.grupoA.join(', ')}
            </div>`;
        }
        if (extras.gruposConfig.grupoB && extras.gruposConfig.grupoB.length > 0) {
            html += `<div style="background:white; padding:10px 15px; border-radius:6px; min-width:150px;">
                <strong style="color:#667eea;">Grupo B:</strong><br>${extras.gruposConfig.grupoB.join(', ')}
            </div>`;
        }
        if (extras.gruposConfig.grupoC && extras.gruposConfig.grupoC.length > 0) {
            html += `<div style="background:white; padding:10px 15px; border-radius:6px; min-width:150px;">
                <strong style="color:#667eea;">Grupo C:</strong><br>${extras.gruposConfig.grupoC.join(', ')}
            </div>`;
        }

        html += `</div></div>`;
    }

    // Mostrar métricas agregadas si existen
    if (extras.totalMatchesSimulated != null) {
        html += `<div style="text-align:center; margin-bottom:10px; color:#333;"><strong>Partidos simulados (totales):</strong> ${extras.totalMatchesSimulated.toLocaleString()}</div>`;
    }

    // Convertir a array y ordenar por probabilidad de campeonato
    const ranking = Object.entries(estadisticas)
        .map(([nombre, stats]) => ({
            nombre,
            ...stats,
            probCampeon: (stats.campeon / numSimulaciones) * 100,
            probSubcampeon: (stats.subcampeon / numSimulaciones) * 100,
            probTercero: (stats.tercero / numSimulaciones) * 100,
            probCuarto: (stats.cuarto / numSimulaciones) * 100,
            probSemi: (stats.semifinalista / numSimulaciones) * 100,  // Clasifica a playoffs
            probNoClasifica: (stats.noClasifica / numSimulaciones) * 100,
            probClasificaDirecto: (stats.clasificaDirecto / numSimulaciones) * 100,  // 1° de grupo
            probClasificaIndirecto: (stats.clasificaIndirecto / numSimulaciones) * 100  // Por repechaje
        }))
        .sort((a, b) => b.probCampeon - a.probCampeon);

    // Gráfico de barras - Probabilidad de Campeonato
    html += '<div class="phase-title">🏆 PROBABILIDAD DE SER CAMPEÓN</div>';
    html += '<div class="chart-container">';

    ranking.forEach((j, index) => {
        const color = getColorByRank(index);
        html += `
            <div class="bar-item">
                <div class="bar-label">
                    <span class="rank-number">${index + 1}</span>
                    <span class="player-name">${j.nombre}</span>
                    <span class="percentage">${j.probCampeon.toFixed(2)}%</span>
                </div>
                <div class="bar-background">
                    <div class="bar-fill" style="width: ${j.probCampeon}%; background: ${color};"></div>
                </div>
            </div>
        `;
    });

    html += '</div>';

    // Tabla detallada
    html += '<div class="phase-title">📋 ESTADÍSTICAS DETALLADAS</div>';
    html += '<div class="standings"><table>';
    html += `<tr>
        <th>Pos</th>
        <th>Jugador</th>
        <th>🥇 Campeón</th>
        <th>🥈 Subcampeón</th>
        <th>🥉 3er Puesto</th>
        <th>4° Puesto</th>
        <th>✅ Clasifica Playoffs</th>
        <th>❌ No Clasifica</th>
    </tr>`;

    ranking.forEach((j, index) => {
        html += `<tr>
            <td class="position">${index + 1}°</td>
            <td><strong>${j.nombre}</strong></td>
            <td><span class="prob-badge gold">${j.probCampeon.toFixed(1)}%</span></td>
            <td><span class="prob-badge silver">${j.probSubcampeon.toFixed(1)}%</span></td>
            <td><span class="prob-badge bronze">${j.probTercero.toFixed(1)}%</span></td>
            <td><span class="prob-badge">${j.probCuarto.toFixed(1)}%</span></td>
            <td><span class="prob-badge" style="background:#4caf50; color:white;">${j.probSemi.toFixed(1)}%</span></td>
            <td><span class="prob-badge gray">${j.probNoClasifica.toFixed(1)}%</span></td>
        </tr>`;
    });

    html += '</table></div>';

    // Tabla especial para formato 9 jugadores: Clasificación Directa vs Indirecta
    if (numJugadores === 9) {
        html += '<div class="phase-title">🎯 PROBABILIDADES DE CLASIFICACIÓN A PLAYOFFS (9 JUGADORES)</div>';
        html += '<div style="background:#fff3e0; padding:15px; border-radius:8px; margin-bottom:20px; border:1px solid #ff9800;">';
        html += '<p style="margin:0 0 10px 0; color:#e65100; text-align:center; font-weight:bold;">🔥 En formato 9 jugadores, hay 2 vías para clasificar a Playoffs:</p>';
        html += '<ul style="margin:0 0 15px 20px; color:#555;"><li><strong>Directa:</strong> Ser 1° de tu grupo (3 clasificados directos)</li><li><strong>Indirecta:</strong> Ganar el repechaje + partido eliminatorio (1 clasificado)</li></ul>';
        html += '</div>';

        html += '<div class="standings"><table>';
        html += `<tr>
            <th>Pos</th>
            <th>Jugador</th>
            <th>🏆 Clasifica Directo (1° Grupo)</th>
            <th>🔄 Clasifica por Repechaje</th>
            <th>✅ Total Clasificación</th>
            <th>❌ No Clasifica</th>
        </tr>`;

        // Ordenar por probabilidad total de clasificación para esta tabla
        const rankingClasif = [...ranking].sort((a, b) => b.probSemi - a.probSemi);

        rankingClasif.forEach((j, index) => {
            html += `<tr>
                <td class="position">${index + 1}°</td>
                <td><strong>${j.nombre}</strong></td>
                <td><span class="prob-badge" style="background:#2e7d32; color:white;">${j.probClasificaDirecto.toFixed(1)}%</span></td>
                <td><span class="prob-badge" style="background:#ff9800; color:white;">${j.probClasificaIndirecto.toFixed(1)}%</span></td>
                <td><span class="prob-badge" style="background:#4caf50; color:white;">${j.probSemi.toFixed(1)}%</span></td>
                <td><span class="prob-badge gray">${j.probNoClasifica.toFixed(1)}%</span></td>
            </tr>`;
        });

        html += '</table></div>';
    }

    // Top 3 destacado
    html += '<div class="phase-title">👑 TOP 3 FAVORITOS</div>';
    html += '<div class="podium">';

    if (ranking.length >= 3) {
        html += `
            <div class="podium-place second">
                <div class="medal">🥈</div>
                <div class="place-name">2° FAVORITO</div>
                <div class="place-player">${ranking[1].nombre}</div>
                <div class="place-prob">${ranking[1].probCampeon.toFixed(2)}%</div>
            </div>
            <div class="podium-place first">
                <div class="medal">🥇</div>
                <div class="place-name">FAVORITO</div>
                <div class="place-player">${ranking[0].nombre}</div>
                <div class="place-prob">${ranking[0].probCampeon.toFixed(2)}%</div>
            </div>
            <div class="podium-place third">
                <div class="medal">🥉</div>
                <div class="place-name">3° FAVORITO</div>
                <div class="place-player">${ranking[2].nombre}</div>
                <div class="place-prob">${ranking[2].probCampeon.toFixed(2)}%</div>
            </div>
        `;
    }

    html += '</div>';

    // Insights
    html += '<div class="phase-title">💡 ANÁLISIS</div>';
    html += '<div class="insights">';

    const favorito = ranking[0];
    const segundoFavorito = ranking[1];
    const diferencia = favorito.probCampeon - segundoFavorito.probCampeon;

    html += `<div class="insight-card">
        <h3>🎯 Favorito Claro</h3>
        <p><strong>${favorito.nombre}</strong> tiene ${favorito.probCampeon.toFixed(1)}% de probabilidad de ganar,
        ${diferencia.toFixed(1)} puntos porcentuales más que ${segundoFavorito.nombre}.</p>
    </div>`;

    html += `<div class="insight-card">
        <h3>🏆 Probabilidad de Podio</h3>
        <p><strong>${favorito.nombre}</strong> tiene ${(favorito.probCampeon + favorito.probSubcampeon + favorito.probTercero).toFixed(1)}%
        de probabilidad de terminar en el podio (Top 3).</p>
    </div>`;

    const sorpresa = ranking[ranking.length - 1];
    html += `<div class="insight-card">
        <h3>⚡ Dark Horse</h3>
        <p><strong>${sorpresa.nombre}</strong> tiene solo ${sorpresa.probCampeon.toFixed(2)}% de ganar,
        pero ${sorpresa.probSemi.toFixed(1)}% de llegar a semifinales.</p>
    </div>`;

    html += '</div>';

    document.getElementById('resultado').innerHTML = html;
}

function getColorByRank(rank) {
    const colors = [
        'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', // Oro
        'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)', // Plata
        'linear-gradient(135deg, #CD7F32 0%, #8B4513 100%)', // Bronce
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', // Púrpura
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', // Rosa
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', // Azul
        'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', // Verde
        'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', // Naranja
        'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', // Azul oscuro
        'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'  // Pastel
    ];

    return colors[rank] || colors[colors.length - 1];
}

function getFormatoNombre(numJugadores) {
    const formatos = {
        7: '7 Jugadores - Liga (Todos contra todos)',
        8: '8 Jugadores - 2 Grupos de 4',
        9: '9 Jugadores - 3 Grupos de 3',
        10: '10 Jugadores - 2 Grupos de 5'
    };

    return formatos[numJugadores] || 'Formato desconocido';
}

// Función para actualizar visibilidad del selector de modo de grupos en Monte Carlo
function actualizarModoGruposMC() {
    const numJugadores = parseInt(document.getElementById('numPlayers').value);
    const modoGruposEl = document.getElementById('modoGrupos');
    const modoGruposLabel = document.getElementById('modoGruposLabel');
    const tieneGrupos = numJugadores >= 8;

    if (modoGruposEl && modoGruposLabel) {
        modoGruposEl.style.display = tieneGrupos ? '' : 'none';
        modoGruposLabel.style.display = tieneGrupos ? '' : 'none';
    }

    // Resetear configuración de grupos manuales
    window.gruposManualConfig = null;

    // Renderizar UI de armado manual si la función existe
    if (typeof renderGruposManualUI === 'function') {
        renderGruposManualUI();
    }
}

// Conectar el botón de la UI con la función Monte Carlo
document.addEventListener('DOMContentLoaded', async () => {
    // Esperar a que los jugadores se carguen desde el archivo
    if (typeof cargarJugadoresDesdeArchivo === 'function') {
        await cargarJugadoresDesdeArchivo();
    }

    const btn = document.getElementById('btnSimular');
    if (btn) {
        btn.addEventListener('click', simularMonteCarlo);
    }

    // Listener para cambio de número de jugadores
    const numPlayersEl = document.getElementById('numPlayers');
    if (numPlayersEl) {
        numPlayersEl.addEventListener('change', actualizarModoGruposMC);
        // Ejecutar al inicio
        actualizarModoGruposMC();
    }

    // Listener para el selector de modo de grupos
    const modoGruposEl = document.getElementById('modoGrupos');
    if (modoGruposEl) {
        modoGruposEl.addEventListener('change', () => {
            window.gruposManualConfig = null;
            if (typeof renderGruposManualUI === 'function') {
                renderGruposManualUI();
            }
        });
    }
});
