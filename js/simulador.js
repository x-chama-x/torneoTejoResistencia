// Variables globales para los jugadores (se cargan desde ranking.txt)
let jugadoresBase = [];
let nuevosJugadores = [];
let jugadoresDisponibles = [];

// Variables para almacenar el historial de enfrentamientos directos
let enfrentamientosDirectos = {};
let partidosDetallados = [];

// Variable global para la configuración manual de grupos
window.gruposManualConfig = null; // { grupoA: [...], grupoB: [...], grupoC: [...] }

// Función para cargar jugadores desde el archivo ranking.txt
async function cargarJugadoresDesdeArchivo() {
    try {
        const response = await fetch('ranking.txt');
        if (!response.ok) {
            throw new Error('No se pudo cargar el archivo ranking.txt');
        }
        const texto = await response.text();
        const lineas = texto.split('\n');

        const jugadores = [];
        for (const linea of lineas) {
            const lineaTrimmed = linea.trim();
            // Ignorar líneas vacías y comentarios
            if (lineaTrimmed === '' || lineaTrimmed.startsWith('#')) {
                continue;
            }

            const partes = lineaTrimmed.split(',');
            if (partes.length >= 4) {
                jugadores.push({
                    nombre: partes[0].trim(),
                    ranking: parseInt(partes[1].trim()),
                    winRate: parseFloat(partes[2].trim()),
                    promedioGoles: parseFloat(partes[3].trim())
                });
            }
        }

        // Validar que se hayan cargado jugadores
        if (jugadores.length === 0) {
            throw new Error('El archivo ranking.txt está vacío o no tiene jugadores válidos');
        }

        // Ordenar por ranking descendente
        jugadores.sort((a, b) => b.ranking - a.ranking);

        // Los primeros 8 son jugadoresBase, el resto son nuevosJugadores
        jugadoresBase = jugadores.slice(0, 8);
        nuevosJugadores = jugadores.slice(8);
        jugadoresDisponibles = [...jugadores];

        console.log('✅ Jugadores cargados desde ranking.txt:', jugadoresDisponibles);
        return true;
    } catch (error) {
        console.error('❌ Error al cargar jugadores desde ranking.txt:', error);
        alert('Error: No se pudo cargar el archivo ranking.txt. Verificá que el archivo exista y tenga el formato correcto.');
        return false;
    }
}

// Hacer la función disponible globalmente
window.cargarJugadoresDesdeArchivo = cargarJugadoresDesdeArchivo;
window.jugadoresSeleccionadosGlobal = null; // al inicio NINGUNO seleccionado (según requerimiento)
// Bandera para detectar la primera carga de la página
window._paginaCargada = false;

// --- Helper: Fisher-Yates shuffle y selección aleatoria ---
function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function elegirAleatorioNombres(cantidad) {
    // Retorna un array de 'cantidad' nombres únicos escogidos aleatoriamente
    const nombres = jugadoresDisponibles.map(j => j.nombre);
    const mezclados = shuffleArray(nombres);
    return mezclados.slice(0, cantidad);
}

// Función para cargar partidos y calcular estadísticas automáticamente
async function cargarHistorialCompleto() {
    try {
        const response = await fetch('enfrentamientos_directos.txt');
        if (!response.ok) {
            throw new Error('No se pudo cargar el archivo enfrentamientos_directos.txt');
        }
        const texto = await response.text();
        const lineas = texto.split('\n');

        partidosDetallados = [];
        enfrentamientosDirectos = {};

        // Cargar todos los partidos
        for (const linea of lineas) {
            const lineaTrimmed = linea.trim();

            // Ignorar líneas vacías y comentarios
            if (lineaTrimmed === '' || lineaTrimmed.startsWith('#') || lineaTrimmed.startsWith('=')) {
                continue;
            }

            const partes = lineaTrimmed.split(',');

            if (partes.length >= 7) {
                const jugador1 = partes[0].trim();
                const jugador2 = partes[1].trim();
                const resultado = partes[2].trim(); // G o P para jugador1
                const marcador = partes[3].trim();
                const [goles1, goles2] = marcador.split('-').map(g => parseInt(g.trim()));

                const partido = {
                    jugador1,
                    jugador2,
                    ganador: resultado === 'G' ? jugador1 : jugador2,
                    goles1,
                    goles2
                };

                partidosDetallados.push(partido);

                // Calcular estadísticas del enfrentamiento automáticamente
                const clave = [jugador1, jugador2].sort().join('_vs_');

                if (!enfrentamientosDirectos[clave]) {
                    enfrentamientosDirectos[clave] = {
                        jugadores: [jugador1, jugador2].sort(),
                        victorias: {}
                    };
                    enfrentamientosDirectos[clave].victorias[jugador1] = 0;
                    enfrentamientosDirectos[clave].victorias[jugador2] = 0;
                }

                // Sumar victoria al ganador
                enfrentamientosDirectos[clave].victorias[partido.ganador]++;
            }
        }
        return true;
    } catch (error) {
        console.error('❌ Error al cargar historial:', error);
        return false;
    }
}

function obtenerHistorialEnfrentamiento(nombreJ1, nombreJ2) {
    const clave = [nombreJ1, nombreJ2].sort().join('_vs_');
    return enfrentamientosDirectos[clave] || null;
}

function simularPartido(jugador1, jugador2) {
    // FÓRMULA LOGÍSTICA (SIGMOIDE) - Más sensible a diferencias grandes
    //
    // Factor de fuerza combinado: 40% ranking + 60% winRate
    // El winRate tiene más peso porque refleja mejor el rendimiento real
    // El ranking puede estar inflado por jugar más partidos
    let fuerza1 = (jugador1.ranking * 0.4) + (jugador1.winRate * 100 * 0.6);
    let fuerza2 = (jugador2.ranking * 0.4) + (jugador2.winRate * 100 * 0.6);

    // Ajuste por historial de enfrentamientos directos (si existe)
    const historial = obtenerHistorialEnfrentamiento(jugador1.nombre, jugador2.nombre);
    if (historial) {
        const totalEnfrentamientos = (historial.victorias[jugador1.nombre] || 0) + (historial.victorias[jugador2.nombre] || 0);

        if (totalEnfrentamientos > 0) {
            // Calcular winrate del enfrentamiento directo
            const winRateDirecto1 = (historial.victorias[jugador1.nombre] || 0) / totalEnfrentamientos;
            const winRateDirecto2 = (historial.victorias[jugador2.nombre] || 0) / totalEnfrentamientos;

            // El historial directo tiene un peso del 20% adicional
            const pesoHistorial = Math.min(0.2, totalEnfrentamientos * 0.02);

            const ajusteHistorial1 = (winRateDirecto1 - 0.5) * 100 * pesoHistorial;
            const ajusteHistorial2 = (winRateDirecto2 - 0.5) * 100 * pesoHistorial;

            fuerza1 += ajusteHistorial1;
            fuerza2 += ajusteHistorial2;
        }
    }

    // Diferencia de fuerza
    const diffFuerza = fuerza1 - fuerza2;

    // Función sigmoide: prob = 1 / (1 + e^(-x/k))
    // k=30 da una curva más suave que permite más upsets:
    // - Diferencia 0 → 50%
    // - Diferencia 20 → 66%
    // - Diferencia 40 → 79%
    // - Diferencia 60 → 88%
    // - Diferencia 80 → 93%
    const k = 30;
    const probFinal = 1 / (1 + Math.exp(-diffFuerza / k));

    const gana1 = Math.random() < probFinal;

    let goles1, goles2;

    // Calcular diferencia de goles basada en promedioGoles
    const promGanador = gana1 ? jugador1.promedioGoles : jugador2.promedioGoles;
    const promPerdedor = gana1 ? jugador2.promedioGoles : jugador1.promedioGoles;

    // Diferencia base según los promedios (mayor diferencia = partidos más contundentes)
    const diffPromedio = promGanador - promPerdedor;

    // La diferencia de goles va de 1 a 7, influenciada por la diferencia de promedios
    // diffPromedio puede ir de -2 a +2 aproximadamente
    // Convertimos a un bonus de 0 a 2 para la diferencia
    const bonusDiff = Math.max(0, Math.min(2, diffPromedio));

    // Diferencia base aleatoria (1-4) + bonus por diferencia de nivel
    const diffBase = Math.floor(Math.random() * 4) + 1;
    const diffFinal = Math.min(7, Math.round(diffBase + bonusDiff));

    if (gana1) {
        goles1 = 7;
        goles2 = Math.max(0, 7 - diffFinal);
    } else {
        goles2 = 7;
        goles1 = Math.max(0, 7 - diffFinal);
    }

    return {
        ganador: gana1 ? jugador1.nombre : jugador2.nombre,
        goles1: goles1,
        goles2: goles2,
        resultado: `${goles1}${goles2}`
    };
}

function simularGrupo(jugadoresGrupo, nombreGrupo, matchNumberInicial, estadisticasGlobales = null) {
    const estadisticas = {};
    const partidos = [];
    let matchNumber = matchNumberInicial;

    jugadoresGrupo.forEach(j => {
        estadisticas[j.nombre] = {
            pj: 0, pg: 0, pp: 0, gf: 0, gc: 0, pts: 0, grupo: nombreGrupo
        };
    });

    for (let i = 0; i < jugadoresGrupo.length; i++) {
        for (let j = i + 1; j < jugadoresGrupo.length; j++) {
            const esAzul = Math.random() < 0.5;
            const resultado = simularPartido(jugadoresGrupo[i], jugadoresGrupo[j]);

            partidos.push({
                numero: matchNumber++,
                azul: esAzul ? jugadoresGrupo[i].nombre : jugadoresGrupo[j].nombre,
                rojo: esAzul ? jugadoresGrupo[j].nombre : jugadoresGrupo[i].nombre,
                golesAzul: esAzul ? resultado.goles1 : resultado.goles2,
                golesRojo: esAzul ? resultado.goles2 : resultado.goles1,
                ganador: resultado.ganador,
                grupo: nombreGrupo
            });

            estadisticas[jugadoresGrupo[i].nombre].pj++;
            estadisticas[jugadoresGrupo[j].nombre].pj++;
            estadisticas[jugadoresGrupo[i].nombre].gf += resultado.goles1;
            estadisticas[jugadoresGrupo[i].nombre].gc += resultado.goles2;
            estadisticas[jugadoresGrupo[j].nombre].gf += resultado.goles2;
            estadisticas[jugadoresGrupo[j].nombre].gc += resultado.goles1;

            // Actualizar estadísticas globales (goles en liga)
            if (estadisticasGlobales) {
                if (estadisticasGlobales[jugadoresGrupo[i].nombre]) {
                    estadisticasGlobales[jugadoresGrupo[i].nombre].golesLiga += resultado.goles1;
                    estadisticasGlobales[jugadoresGrupo[i].nombre].partidosJugados++;
                }
                if (estadisticasGlobales[jugadoresGrupo[j].nombre]) {
                    estadisticasGlobales[jugadoresGrupo[j].nombre].golesLiga += resultado.goles2;
                    estadisticasGlobales[jugadoresGrupo[j].nombre].partidosJugados++;
                }
            }

            if (resultado.ganador === jugadoresGrupo[i].nombre) {
                estadisticas[jugadoresGrupo[i].nombre].pg++;
                estadisticas[jugadoresGrupo[j].nombre].pp++;
                estadisticas[jugadoresGrupo[i].nombre].pts += resultado.goles1;
                estadisticas[jugadoresGrupo[j].nombre].pts += resultado.goles2;
            } else {
                estadisticas[jugadoresGrupo[j].nombre].pg++;
                estadisticas[jugadoresGrupo[i].nombre].pp++;
                estadisticas[jugadoresGrupo[j].nombre].pts += resultado.goles2;
                estadisticas[jugadoresGrupo[i].nombre].pts += resultado.goles1;
            }
        }
    }

    const rankingGrupo = Object.entries(estadisticas)
        .sort((a, b) => b[1].pts - a[1].pts || b[1].pg - a[1].pg || (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc))
        .map((entry, index) => ({ pos: index + 1, nombre: entry[0], ...entry[1] }));

    return { partidos, rankingGrupo, matchNumber };
}

function simularTorneo() {
    const numJugadores = parseInt(document.getElementById('numPlayers').value);
    let jugadores = [...jugadoresBase];

    const jugadoresNecesarios = numJugadores - jugadoresBase.length;
    if (jugadoresNecesarios > 0) {
        // Agregar jugadores adicionales si se necesitan más que los 8 base
        for (let i = 0; i < jugadoresNecesarios; i++) {
            jugadores.push(nuevosJugadores[i]);
        }
    } else if (jugadoresNecesarios < 0) {
        // Recortar jugadores si se necesitan menos que los 8 base
        jugadores = jugadores.slice(0, numJugadores);
    }

    // Verificar modo de grupos
    const modoGruposEl = document.getElementById('modoGrupos');
    const modoGrupos = modoGruposEl ? modoGruposEl.value : 'aleatorio';

    // Solo mezclar si es modo aleatorio O si no hay grupos manuales configurados
    if (modoGrupos === 'aleatorio' || !window.gruposManualConfig) {
        jugadores = jugadores.sort(() => Math.random() - 0.5);
    }

    // Inicializar estadísticas de jugadores para la tabla final
    const estadisticasJugadores = {};
    jugadores.forEach(j => {
        estadisticasJugadores[j.nombre] = {
            golesLiga: 0,
            golesFaseFinal: 0,
            partidosJugados: 0
        };
    });

    let html = '';
    let clasificados = [];

    if (numJugadores === 7) {
        // Formato Liga: Todos contra todos
        html += '<div class="phase-title">📋 FASE DE LIGA - TODOS CONTRA TODOS</div>';

        const { partidos, rankingGrupo } = simularGrupo(jugadores, 'Liga', 1, estadisticasJugadores);

        html += '<div class="matches-grid">';
        partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        html += '<div class="phase-title">📊 TABLA DE POSICIONES</div>';
        html += '<div class="standings"><table>';
        html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>DIF</th><th>Pts</th></tr>';

        rankingGrupo.forEach(r => {
            const clasificaClass = r.pos <= 4 ? 'style="background: rgba(46, 160, 67, 0.15);"' : '';
            html += `<tr ${clasificaClass}>
                <td class="position">${r.pos}°</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td>${r.gf - r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });
        html += '</table></div>';

        clasificados = rankingGrupo.slice(0, 4);

    } else if (numJugadores === 8) {
        // 2 grupos de 4
        html += '<div class="phase-title">📋 FASE DE GRUPOS - 2 GRUPOS DE 4</div>';

        let grupoA, grupoB;

        if (modoGrupos === 'manual' && window.gruposManualConfig) {
            // Usar configuración manual
            grupoA = window.gruposManualConfig.grupoA.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
            grupoB = window.gruposManualConfig.grupoB.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
        } else {
            // Distribución aleatoria (ya mezclados)
            grupoA = jugadores.slice(0, 4);
            grupoB = jugadores.slice(4, 8);
        }

        const resultadoA = simularGrupo(grupoA, 'A', 1, estadisticasJugadores);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber, estadisticasJugadores);

        // Mostrar partidos por grupo
        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO A</h3>';
        html += '<div class="matches-grid">';
        resultadoA.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔶 GRUPO B</h3>';
        html += '<div class="matches-grid">';
        resultadoB.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        // Tablas de posiciones
        html += '<div class="phase-title">📊 TABLAS DE POSICIONES</div>';
        // Uso una clase en lugar de estilos inline para poder controlar el responsive desde CSS
        html += '<div class="group-tables">';

        // Tabla Grupo A
        // Envolvemos el encabezado y la tabla en .standings-inner para que el header azul cubra todo el ancho desplazable
        html += `<div class="standings"><div class="standings-inner"><h4 class="standings-title" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:white; padding:10px 12px; margin:0 0 8px 0; border-top-left-radius:10px; border-top-right-radius:10px;">Grupo A</h4><table>`;
        html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';
        resultadoA.rankingGrupo.forEach(r => {
            const clasificaClass = r.pos <= 2 ? 'style="background: rgba(46, 160, 67, 0.15);"' : '';
            html += `<tr ${clasificaClass}>
                <td class="position">${r.pos}°</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });
        html += '</table></div></div>';

        // Tabla Grupo B
        html += `<div class="standings"><div class="standings-inner"><h4 class="standings-title" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:white; padding:10px 12px; margin:0 0 8px 0; border-top-left-radius:10px; border-top-right-radius:10px;">Grupo B</h4><table>`;
        html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';
        resultadoB.rankingGrupo.forEach(r => {
            const clasificaClass = r.pos <= 2 ? 'style="background: rgba(46, 160, 67, 0.15);"' : '';
            html += `<tr ${clasificaClass}>
                <td class="position">${r.pos}°</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });
        html += '</table></div></div>';
        html += '</div>';

        // Los 2 primeros de cada grupo clasifican
        clasificados = [
            ...resultadoA.rankingGrupo.slice(0, 2),
            ...resultadoB.rankingGrupo.slice(0, 2)
        ];

    } else if (numJugadores === 9) {
        // 3 grupos de 3
        html += '<div class="phase-title">📋 FASE DE GRUPOS - 3 GRUPOS DE 3</div>';

        let grupoA, grupoB, grupoC;

        if (modoGrupos === 'manual' && window.gruposManualConfig) {
            // Usar configuración manual
            grupoA = window.gruposManualConfig.grupoA.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
            grupoB = window.gruposManualConfig.grupoB.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
            grupoC = window.gruposManualConfig.grupoC.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
        } else {
            // Distribución aleatoria (ya mezclados)
            grupoA = jugadores.slice(0, 3);
            grupoB = jugadores.slice(3, 6);
            grupoC = jugadores.slice(6, 9);
        }

        const resultadoA = simularGrupo(grupoA, 'A', 1, estadisticasJugadores);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber, estadisticasJugadores);
        const resultadoC = simularGrupo(grupoC, 'C', resultadoB.matchNumber, estadisticasJugadores);

        // Mostrar partidos
        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO A</h3>';
        html += '<div class="matches-grid">';
        resultadoA.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔶 GRUPO B</h3>';
        html += '<div class="matches-grid">';
        resultadoB.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO C</h3>';
        html += '<div class="matches-grid">';
        resultadoC.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        // Tablas
        html += '<div class="phase-title">📊 TABLAS DE POSICIONES</div>';
        html += '<div class="group-tables">';

        [resultadoA, resultadoB, resultadoC].forEach((resultado, idx) => {
            const nombreGrupo = ['A', 'B', 'C'][idx];
            html += `<div class="standings"><div class="standings-inner"><h4 class="standings-title" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:white; padding:10px 12px; margin:0 0 8px 0; border-top-left-radius:10px; border-top-right-radius:10px;">Grupo ${nombreGrupo}</h4><table>`;
            html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';
            resultado.rankingGrupo.forEach(r => {
                const clasificaClass = r.pos === 1 ? 'style="background: rgba(46, 160, 67, 0.15);"' : '';
                html += `<tr ${clasificaClass}>
                    <td class="position">${r.pos}°</td>
                    <td><strong>${r.nombre}</strong></td>
                    <td>${r.pj}</td>
                    <td>${r.pg}</td>
                    <td>${r.pp}</td>
                    <td>${r.gf}</td>
                    <td>${r.gc}</td>
                    <td><strong>${r.pts}</strong></td>
                </tr>`;
            });
            html += '</table></div></div>';
        });
        html += '</div>';

        // Clasifican los 3 primeros de cada grupo directo
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

        // ========== MINI-LIGA ENTRE SEGUNDOS ==========
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

                if (estadisticasJugadores[j1.nombre]) {
                    estadisticasJugadores[j1.nombre].golesLiga += resultadoMini.goles1;
                    estadisticasJugadores[j1.nombre].partidosJugados++;
                }
                if (estadisticasJugadores[j2.nombre]) {
                    estadisticasJugadores[j2.nombre].golesLiga += resultadoMini.goles2;
                    estadisticasJugadores[j2.nombre].partidosJugados++;
                }

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

        const rankingSegundos = Object.entries(miniStatsSegundos)
            .map(entry => ({ nombre: entry[0], ...entry[1] }))
            .sort((a, b) => b.pts - a.pts || b.pg - a.pg || (b.gf - b.gc) - (a.gf - a.gc));

        html += '<div class="phase-title">⚖️ REPECHAJE 2° PUESTOS - MINI-LIGA (3 PARTIDOS)</div>';
        html += '<div class="matches-grid">';
        miniPartidosSegundos.forEach((p, idx) => {
            html += `
                <div class="match-card">
                    <div class="match-number">Repechaje 2° - Partido ${idx + 1}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        html += '<div class="standings"><table>';
        html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';
        rankingSegundos.forEach((r, index) => {
            const highlight = index === 0 ? 'style="background: rgba(212, 175, 55, 0.15);"' : '';
            html += `<tr ${highlight}>
                <td class="position">${index + 1}°</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });
        html += '</table></div>';
        html += '<p style="text-align:center; color:#e67e22; font-weight:600;">🔶 Solo el 1° avanza al Partido Eliminatorio | 2° y 3° quedan eliminados</p>';

        // ========== REPECHAJE ENTRE TERCEROS ==========
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

                if (estadisticasJugadores[j1.nombre]) {
                    estadisticasJugadores[j1.nombre].golesLiga += resultadoMini.goles1;
                    estadisticasJugadores[j1.nombre].partidosJugados++;
                }
                if (estadisticasJugadores[j2.nombre]) {
                    estadisticasJugadores[j2.nombre].golesLiga += resultadoMini.goles2;
                    estadisticasJugadores[j2.nombre].partidosJugados++;
                }

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

        const rankingTerceros = Object.entries(miniStatsTerceros)
            .map(entry => ({ nombre: entry[0], ...entry[1] }))
            .sort((a, b) => b.pts - a.pts || b.pg - a.pg || (b.gf - b.gc) - (a.gf - a.gc));

        html += '<div class="phase-title">⚖️ REPECHAJE 3° PUESTOS - MINI-LIGA (3 PARTIDOS)</div>';
        html += '<div class="matches-grid">';
        miniPartidosTerceros.forEach((p, idx) => {
            html += `
                <div class="match-card">
                    <div class="match-number">Repechaje 3° - Partido ${idx + 1}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        html += '<div class="standings"><table>';
        html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';
        rankingTerceros.forEach((r, index) => {
            const highlight = index === 0 ? 'style="background: rgba(212, 175, 55, 0.15);"' : '';
            html += `<tr ${highlight}>
                <td class="position">${index + 1}°</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });
        html += '</table></div>';
        html += '<p style="text-align:center; color:#e67e22; font-weight:600;">🔶 Solo el 1° avanza al Partido Eliminatorio | 2° y 3° quedan eliminados</p>';

        // ========== PARTIDO ELIMINATORIO PRE-PLAYOFFS ==========
        // 1° de repechaje segundos vs 1° de repechaje terceros
        const primeroSegundos = rankingSegundos[0];
        const primeroTerceros = rankingTerceros[0];

        const dataPrimeroSegundos = jugadores.find(j => j.nombre === primeroSegundos.nombre) || jugadoresDisponibles.find(j => j.nombre === primeroSegundos.nombre);
        const dataPrimeroTerceros = jugadores.find(j => j.nombre === primeroTerceros.nombre) || jugadoresDisponibles.find(j => j.nombre === primeroTerceros.nombre);

        html += '<div class="phase-title">⚔️ PARTIDO ELIMINATORIO PRE-PLAYOFFS</div>';
        html += '<div class="matches-grid" style="max-width: 450px; margin: 0 auto 30px auto;">';

        const partidoEliminatorio = simularPartido(dataPrimeroSegundos, dataPrimeroTerceros);
        if (estadisticasJugadores[dataPrimeroSegundos.nombre]) {
            estadisticasJugadores[dataPrimeroSegundos.nombre].golesFaseFinal += partidoEliminatorio.goles1;
            estadisticasJugadores[dataPrimeroSegundos.nombre].partidosJugados++;
        }
        if (estadisticasJugadores[dataPrimeroTerceros.nombre]) {
            estadisticasJugadores[dataPrimeroTerceros.nombre].golesFaseFinal += partidoEliminatorio.goles2;
            estadisticasJugadores[dataPrimeroTerceros.nombre].partidosJugados++;
        }

        html += `
            <div class="match-card" style="border: 2px solid #f39c12;">
                <div class="match-number">Eliminatorio por el 4° lugar en Playoffs</div>
                <div class="match-players">
                    <div class="player blue">${dataPrimeroSegundos.nombre} <small>(1° Rep. 2°)</small></div>
                    <div class="vs">VS</div>
                    <div class="player red">${dataPrimeroTerceros.nombre} <small>(1° Rep. 3°)</small></div>
                </div>
                <div class="score">${partidoEliminatorio.goles1} - ${partidoEliminatorio.goles2}</div>
                <div class="winner-badge">🏆 ${partidoEliminatorio.ganador} clasifica a Playoffs!</div>
            </div>
        `;
        html += '</div>';

        // El ganador del partido eliminatorio es el 4° clasificado
        const cuartoClasificado = partidoEliminatorio.ganador === dataPrimeroSegundos.nombre ? primeroSegundos : primeroTerceros;

        html += '<div class="phase-title">✅ CLASIFICADOS A PLAYOFFS</div>';
        html += '<div class="standings"><table>';
        html += '<tr><th>Clasificación</th><th>Jugador</th><th>Vía</th></tr>';

        primeros.forEach((r) => {
            html += `<tr style="background: rgba(46, 160, 67, 0.15);">
                <td><strong>1° Grupo ${r.grupo}</strong></td>
                <td><strong>${r.nombre}</strong></td>
                <td>Directo</td>
            </tr>`;
        });

        html += `<tr style="background: rgba(212, 175, 55, 0.15);">
            <td><strong>4° Clasificado</strong></td>
            <td><strong>${cuartoClasificado.nombre}</strong></td>
            <td>Partido Eliminatorio</td>
        </tr>`;

        html += '</table></div>';

        clasificados = [...primeros, cuartoClasificado];

    } else if (numJugadores === 10) {
        // 2 grupos de 5
        html += '<div class="phase-title">📋 FASE DE GRUPOS - 2 GRUPOS DE 5</div>';

        let grupoA, grupoB;

        if (modoGrupos === 'manual' && window.gruposManualConfig) {
            // Usar configuración manual
            grupoA = window.gruposManualConfig.grupoA.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
            grupoB = window.gruposManualConfig.grupoB.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
        } else {
            // Distribución aleatoria (ya mezclados)
            grupoA = jugadores.slice(0, 5);
            grupoB = jugadores.slice(5, 10);
        }

        const resultadoA = simularGrupo(grupoA, 'A', 1, estadisticasJugadores);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber, estadisticasJugadores);

        // Mostrar partidos
        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO A</h3>';
        html += '<div class="matches-grid">';
        resultadoA.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔶 GRUPO B</h3>';
        html += '<div class="matches-grid">';
        resultadoB.partidos.forEach(p => {
            html += `
                <div class="match-card">
                    <div class="match-number">Partido ${p.numero} - Grupo ${p.grupo}</div>
                    <div class="match-players">
                        <div class="player blue">${p.azul}</div>
                        <div class="vs">VS</div>
                        <div class="player red">${p.rojo}</div>
                    </div>
                    <div class="score">${p.golesAzul} - ${p.golesRojo}</div>
                    <div class="winner-badge">🏆 ${p.ganador}</div>
                </div>
            `;
        });
        html += '</div>';

        // Tablas
        html += '<div class="phase-title">📊 TABLAS DE POSICIONES</div>';
        html += '<div class="group-tables">';

        // Tabla Grupo A
        html += `<div class="standings"><div class="standings-inner"><h4 class="standings-title" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:white; padding:10px 12px; margin:0 0 8px 0; border-top-left-radius:10px; border-top-right-radius:10px;">Grupo A</h4><table>`;
        html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';
        resultadoA.rankingGrupo.forEach(r => {
            const clasificaClass = r.pos <= 2 ? 'style="background: rgba(46, 160, 67, 0.15);"' : '';
            html += `<tr ${clasificaClass}>
                <td class="position">${r.pos}°</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });
        html += '</table></div></div>';

        // Tabla Grupo B
        html += `<div class="standings"><div class="standings-inner"><h4 class="standings-title" style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); color:white; padding:10px 12px; margin:0 0 8px 0; border-top-left-radius:10px; border-top-right-radius:10px;">Grupo B</h4><table>`;
        html += '<tr><th>Pos</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>Pts</th></tr>';
        resultadoB.rankingGrupo.forEach(r => {
            const clasificaClass = r.pos <= 2 ? 'style="background: rgba(46, 160, 67, 0.15);"' : '';
            html += `<tr ${clasificaClass}>
                <td class="position">${r.pos}°</td>
                <td><strong>${r.nombre}</strong></td>
                <td>${r.pj}</td>
                <td>${r.pg}</td>
                <td>${r.pp}</td>
                <td>${r.gf}</td>
                <td>${r.gc}</td>
                <td><strong>${r.pts}</strong></td>
            </tr>`;
        });
        html += '</table></div></div>';
        html += '</div>';

        // Los 2 primeros de cada grupo clasifican
        clasificados = [
            ...resultadoA.rankingGrupo.slice(0, 2),
            ...resultadoB.rankingGrupo.slice(0, 2)
        ];
    }

    // Fase Final (Playoffs) - común para todos los formatos
    html += '<div class="phase-title">🏆 FASE FINAL - PLAYOFFS</div>';

    // Semifinales (sorteo aleatorio de clasificados)
    const semifinalistas = [...clasificados].sort(() => Math.random() - 0.5);

    const sf1Jugador1 = jugadores.find(j => j.nombre === semifinalistas[0].nombre);
    const sf1Jugador2 = jugadores.find(j => j.nombre === semifinalistas[1].nombre);
    const sf2Jugador1 = jugadores.find(j => j.nombre === semifinalistas[2].nombre);
    const sf2Jugador2 = jugadores.find(j => j.nombre === semifinalistas[3].nombre);

    const sf1 = simularPartido(sf1Jugador1, sf1Jugador2);
    const sf2 = simularPartido(sf2Jugador1, sf2Jugador2);

    // Actualizar estadísticas de fase final (semifinales)
    estadisticasJugadores[semifinalistas[0].nombre].golesFaseFinal += sf1.goles1;
    estadisticasJugadores[semifinalistas[0].nombre].partidosJugados++;
    estadisticasJugadores[semifinalistas[1].nombre].golesFaseFinal += sf1.goles2;
    estadisticasJugadores[semifinalistas[1].nombre].partidosJugados++;
    estadisticasJugadores[semifinalistas[2].nombre].golesFaseFinal += sf2.goles1;
    estadisticasJugadores[semifinalistas[2].nombre].partidosJugados++;
    estadisticasJugadores[semifinalistas[3].nombre].golesFaseFinal += sf2.goles2;
    estadisticasJugadores[semifinalistas[3].nombre].partidosJugados++;

    html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">⚔️ SEMIFINALES</h3>';
    // Añadimos una clase específica para centrar solo las semifinales
    html += '<div class="matches-grid semifinals-grid">';
    html += `
        <div class="match-card">
            <div class="match-number">Semifinal 1</div>
            <div class="match-players">
                <div class="player blue">${semifinalistas[0].nombre}</div>
                <div class="vs">VS</div>
                <div class="player red">${semifinalistas[1].nombre}</div>
            </div>
            <div class="score">${sf1.goles1} - ${sf1.goles2}</div>
            <div class="winner-badge">🏆 ${sf1.ganador}</div>
        </div>
        <div class="match-card">
            <div class="match-number">Semifinal 2</div>
            <div class="match-players">
                <div class="player blue">${semifinalistas[2].nombre}</div>
                <div class="vs">VS</div>
                <div class="player red">${semifinalistas[3].nombre}</div>
            </div>
            <div class="score">${sf2.goles1} - ${sf2.goles2}</div>
            <div class="winner-badge">🏆 ${sf2.ganador}</div>
        </div>
    `;
    html += '</div>';

    // Tercer Puesto y Final
    const perdedorSF1 = sf1.ganador === semifinalistas[0].nombre ? semifinalistas[1].nombre : semifinalistas[0].nombre;
    const perdedorSF2 = sf2.ganador === semifinalistas[2].nombre ? semifinalistas[3].nombre : semifinalistas[2].nombre;

    const tercerPuestoJ1 = jugadores.find(j => j.nombre === perdedorSF1);
    const tercerPuestoJ2 = jugadores.find(j => j.nombre === perdedorSF2);
    const tercerPuesto = simularPartido(tercerPuestoJ1, tercerPuestoJ2);

    // Actualizar estadísticas de fase final (tercer puesto)
    estadisticasJugadores[perdedorSF1].golesFaseFinal += tercerPuesto.goles1;
    estadisticasJugadores[perdedorSF1].partidosJugados++;
    estadisticasJugadores[perdedorSF2].golesFaseFinal += tercerPuesto.goles2;
    estadisticasJugadores[perdedorSF2].partidosJugados++;

    const finalistaJ1 = jugadores.find(j => j.nombre === sf1.ganador);
    const finalistaJ2 = jugadores.find(j => j.nombre === sf2.ganador);
    const final = simularPartido(finalistaJ1, finalistaJ2);

    // Actualizar estadísticas de fase final (final)
    estadisticasJugadores[sf1.ganador].golesFaseFinal += final.goles1;
    estadisticasJugadores[sf1.ganador].partidosJugados++;
    estadisticasJugadores[sf2.ganador].golesFaseFinal += final.goles2;
    estadisticasJugadores[sf2.ganador].partidosJugados++;

    html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🥉 TERCER PUESTO</h3>';
    html += '<div class="matches-grid" style="max-width: 400px; margin: 0 auto;">';
    html += `
        <div class="match-card">
            <div class="match-players">
                <div class="player blue">${perdedorSF1}</div>
                <div class="vs">VS</div>
                <div class="player red">${perdedorSF2}</div>
            </div>
            <div class="score">${tercerPuesto.goles1} - ${tercerPuesto.goles2}</div>
            <div class="winner-badge">🥉 ${tercerPuesto.ganador}</div>
        </div>
    `;
    html += '</div>';

    html += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">👑 FINAL</h3>';
    html += '<div class="matches-grid" style="max-width: 400px; margin: 0 auto;">';
    html += `
        <div class="match-card">
            <div class="match-players">
                <div class="player blue">${sf1.ganador}</div>
                <div class="vs">VS</div>
                <div class="player red">${sf2.ganador}</div>
            </div>
            <div class="score">${final.goles1} - ${final.goles2}</div>
            <div class="winner-badge">👑 CAMPEÓN: ${final.ganador}</div>
        </div>
    `;
    html += '</div>';

    // Podio
    const cuarto = tercerPuesto.ganador === perdedorSF1 ? perdedorSF2 : perdedorSF1;
    const subcampeon = final.ganador === sf1.ganador ? sf2.ganador : sf1.ganador;

    html += '<div class="phase-title">🏆 PODIO FINAL</div>';
    html += '<div class="podium">';
    html += `
        <div class="podium-place second">
            <div class="medal">🥈</div>
            <div class="place-name">SUBCAMPEÓN</div>
            <div class="place-player">${subcampeon}</div>
        </div>
        <div class="podium-place first">
            <div class="medal">🥇</div>
            <div class="place-name">CAMPEÓN</div>
            <div class="place-player">${final.ganador}</div>
        </div>
        <div class="podium-place third">
            <div class="medal">🥉</div>
            <div class="place-name">TERCER PUESTO</div>
            <div class="place-player">${tercerPuesto.ganador}</div>
        </div>
    `;
    html += '</div>';

    html += `<div style="text-align: center; margin-top: 20px; color: #666;">
        <strong>4° Puesto:</strong> ${cuarto}
    </div>`;

    // Tabla de estadísticas
    html += '<div class="phase-title">📊 ESTADÍSTICAS DEL TORNEO</div>';
    html += '<div class="standings"><table>';
    html += '<tr><th>Jugador</th><th>Goles Liga</th><th>Goles Fase Final</th><th>Total Goles (TG)</th><th>Partidos (PJ)</th><th>Prom TG/PJ</th></tr>';

    // Convertir estadísticas a array y ordenar por promedio TG/PJ (descendente)
    const statsArray = Object.entries(estadisticasJugadores).map(([nombre, stats]) => ({
        nombre,
        golesLiga: stats.golesLiga,
        golesFaseFinal: stats.golesFaseFinal,
        totalGoles: stats.golesLiga + stats.golesFaseFinal,
        partidosJugados: stats.partidosJugados,
        promedio: stats.partidosJugados > 0 ? ((stats.golesLiga + stats.golesFaseFinal) / stats.partidosJugados) : 0,
        promedioStr: stats.partidosJugados > 0 ? ((stats.golesLiga + stats.golesFaseFinal) / stats.partidosJugados).toFixed(2) : '0.00'
    })).sort((a, b) => b.promedio - a.promedio || b.totalGoles - a.totalGoles);

    statsArray.forEach(stat => {
        html += `<tr>
            <td><strong>${stat.nombre}</strong></td>
            <td>${stat.golesLiga}</td>
            <td>${stat.golesFaseFinal}</td>
            <td><strong>${stat.totalGoles}</strong></td>
            <td>${stat.partidosJugados}</td>
            <td><strong>${stat.promedioStr}</strong></td>
        </tr>`;
    });

    html += '</table></div>';

    // Texto informativo sobre el goleador (maneja empates)
    const mejorPromedio = statsArray[0].promedio;
    const goleadores = statsArray.filter(stat => stat.promedio === mejorPromedio);

    html += `<div style="text-align: center; margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">`;

    if (goleadores.length === 1) {
        // Un solo goleador
        html += `<p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">
            ⚽ <strong style="color: #667eea;">${goleadores[0].nombre}</strong> es el goleador del torneo con un promedio de <strong style="color: #667eea;">${goleadores[0].promedioStr}</strong> goles por partido
        </p>`;
    } else {
        // Empate: múltiples goleadores
        const nombresGoleadores = goleadores.map(g => `<strong style="color: #667eea;">${g.nombre}</strong>`).join(', ').replace(/,([^,]*)$/, ' y$1');
        html += `<p style="margin: 0; font-size: 18px; font-weight: bold; color: #333;">
            ⚽ ${nombresGoleadores} son los goleadores del torneo con un promedio de <strong style="color: #667eea;">${goleadores[0].promedioStr}</strong> goles por partido
        </p>`;
    }

    html += `<p style="margin: 5px 0 0 0; font-size: 14px; color: #666; font-style: italic;">
            El goleador del torneo es el jugador con el mejor promedio de goles
        </p>
    </div>`;

    document.getElementById('resultado').innerHTML = html;
}

// Mostrar solo el formato al cargar y actualizar al cambiar selección
function mostrarFormato() {
    const numJugadores = parseInt(document.getElementById('numPlayers').value);

    // Mostrar/ocultar selector de modo de grupos según el formato
    const modoGruposEl = document.getElementById('modoGrupos');
    const modoGruposLabel = document.getElementById('modoGruposLabel');
    const tieneGrupos = numJugadores >= 8; // 8, 9 y 10 jugadores tienen grupos

    if (modoGruposEl && modoGruposLabel) {
        modoGruposEl.style.display = tieneGrupos ? '' : 'none';
        modoGruposLabel.style.display = tieneGrupos ? '' : 'none';
    }

    // Resetear configuración de grupos manuales al cambiar formato
    window.gruposManualConfig = null;

    // Renderizar UI de armado manual si corresponde
    renderGruposManualUI();

    let html = '<div class="phase-title">📋 FORMATO DEL TORNEO</div>';

    if (numJugadores === 7) {
        html += `
            <h3>Liga (Round Robin) — 7 Jugadores</h3>
            <p>Estructura: Todos contra todos, cada jugador enfrenta a los demás una vez.</p>
            <ul>
                <li>Partidos totales (fase): 21</li>
                <li>Clasificación: Los 4 primeros avanzan a playoff (semifinales + final + 3° puesto)</li>
                <li>Formato final: Semifinales, tercer puesto y final</li>
            </ul>
            <p>Notas: Ideal para medir resultados de forma completa entre todos los participantes.</p>
        `;
    } else if (numJugadores === 8) {
        html += `
            <h3>Grupos (2 grupos de 4) — 8 Jugadores</h3>
            <p>Estructura: 2 grupos (A y B) de 4 jugadores; todos contra todos dentro de cada grupo.</p>
            <ul>
                <li>Partidos totales (fase de grupos): 12</li>
                <li>Clasificación: Los 2 primeros de cada grupo avanzan a playoffs (4 clasificados)</li>
                <li>Formato final: Semifinales, tercer puesto y final</li>
            </ul>
            <p>Notas: Menos partidos que una liga completa, permite fases más rápidas y balanceadas por sorteo o siembra.</p>
        `;
    } else if (numJugadores === 9) {
        html += `
            <h3>Grupos (3 grupos de 3) + Repechajes — 9 Jugadores</h3>
            <p>Estructura: 3 grupos (A, B, C) de 3 jugadores; todos contra todos dentro del grupo.</p>
            
            <h4>📊 Fase de Grupos (9 partidos)</h4>
            <ul>
                <li>Los <strong>1° de cada grupo</strong> clasifican directo a playoffs.</li>
            </ul>
            
            <h4>⚖️ Repechaje 2° Puestos - Mini-Liga (3 partidos)</h4>
            <ul>
                <li>Los 3 segundos juegan todos contra todos.</li>
                <li><strong>Solo el 1°</strong> avanza al partido eliminatorio.</li>
                <li>2° y 3° quedan <strong>eliminados</strong>.</li>
            </ul>
            
            <h4>⚖️ Repechaje 3° Puestos - Mini-Liga (3 partidos)</h4>
            <ul>
                <li>Los 3 terceros juegan todos contra todos.</li>
                <li><strong>Solo el 1°</strong> avanza al partido eliminatorio.</li>
                <li>2° y 3° quedan <strong>eliminados</strong>.</li>
            </ul>
            
            <h4>⚔️ Partido Eliminatorio Pre-Playoffs (1 partido)</h4>
            <ul>
                <li>1° del repechaje de segundos vs 1° del repechaje de terceros.</li>
                <li>El <strong>ganador clasifica</strong> como 4° a playoffs.</li>
            </ul>
            
            <h4>🏆 Playoffs (4 partidos)</h4>
            <ul>
                <li><strong>Clasifican:</strong> 3 primeros de grupos + ganador del eliminatorio.</li>
                <li>Semifinales, tercer puesto y final.</li>
            </ul>
            
            <p><strong>Total: 20 partidos</strong></p>
        `;
    } else if (numJugadores === 10) {
        html += `
            <h3>Grupos (2 grupos de 5) — 10 Jugadores</h3>
            <p>Estructura: 2 grupos (A y B) de 5 jugadores; todos contra todos dentro de cada grupo.</p>
            <ul>
                <li>Partidos totales (fase de grupos): 20</li>
                <li>Clasificación: Los 2 primeros de cada grupo avanzan a playoffs (4 clasificados)</li>
                <li>Formato final: Semifinales, tercer puesto y final</li>
            </ul>
            <p>Notas: Requiere más tiempo; se usa cuando hay gran cantidad de participantes y se desea más competencia por grupo.</p>
        `;
    } else {
        html += '<p>Selecciona el número de jugadores y presiona "Simular Torneo" para ejecutar la simulación.</p>';
    }

    // Agregar sección del ranking FIFA actual
    html += `
        <div class="phase-title" style="margin-top: 20px;">🏆 RANKING FIFA ACTUAL</div>
        <div class="standings" style="margin-bottom: 20px;">
            <table>
                <tr>
                    <th>Pos</th>
                    <th>Jugador</th>
                    <th>Puntos</th>
                </tr>
    `;

    // Ordenar jugadores por ranking (mayor a menor)
    const jugadoresOrdenados = [...jugadoresDisponibles].sort((a, b) => b.ranking - a.ranking);
    jugadoresOrdenados.forEach((j, index) => {
        const medalla = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        html += `
            <tr>
                <td class="position">${index + 1}° ${medalla}</td>
                <td><strong>${j.nombre}</strong></td>
                <td>${j.ranking} pts</td>
            </tr>
        `;
    });

    html += `
            </table>
        </div>
    `;

    // Mostrar también la sección de selección de jugadores (si existe) debajo del formato
    const resultado = document.getElementById('resultado');
    if (resultado) resultado.innerHTML = html;

    // Control explícito del contenedor de selección: mostrar para todos los formatos (incluyendo 10 jugadores)
    const container = document.getElementById('playerSelection');
    if (container) {
        container.style.display = '';
        container.removeAttribute('aria-hidden');
    }

    // Control del botón de selección aleatoria: siempre habilitado ahora que hay 11 jugadores
    const randomBtn = document.getElementById('randomSelectBtn');
    if (randomBtn) {
        randomBtn.disabled = false;
        randomBtn.style.opacity = '';
        randomBtn.title = 'Seleccionar jugadores aleatoriamente';
    }

    // Llamar a renderPlayerSelection para todos los formatos
    renderPlayerSelection(numJugadores);

    // Actualizar estado del botón simular según la selección
    updateSimularButtonState();
}

// Función para renderizar el UI de armado manual de grupos
function renderGruposManualUI() {
    const container = document.getElementById('gruposManualContainer');
    if (!container) return;

    const numJugadores = parseInt(document.getElementById('numPlayers').value);
    const modoGruposEl = document.getElementById('modoGrupos');
    const modoGrupos = modoGruposEl ? modoGruposEl.value : 'aleatorio';

    // Solo mostrar para formatos con grupos y en modo manual
    if (numJugadores < 8 || modoGrupos !== 'manual') {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    // Verificar que hay jugadores seleccionados
    if (!window.jugadoresSeleccionadosGlobal || window.jugadoresSeleccionadosGlobal.length !== numJugadores) {
        container.style.display = 'block';
        container.innerHTML = `<div style="background:#fff3cd; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #ffc107;">
            <p style="margin:0; color:#856404; font-weight:600;">⚠️ Primero seleccioná los ${numJugadores} jugadores para poder armar los grupos manualmente.</p>
        </div>`;
        return;
    }

    container.style.display = 'block';

    let html = `<div style="background:#e3f2fd; padding:20px; border-radius:10px; margin-bottom:20px; border:2px solid #2196f3;">
        <h3 style="margin:0 0 15px 0; color:#1565c0; text-align:center;">✋ ARMADO MANUAL DE GRUPOS</h3>
        <p style="margin:0 0 15px 0; text-align:center; color:#333;">Arrastrá los jugadores a cada grupo o usá los selectores</p>`;

    const jugadoresSeleccionados = window.jugadoresSeleccionadosGlobal;

    if (numJugadores === 8) {
        // 2 grupos de 4
        html += renderGrupoSelector('A', 4, jugadoresSeleccionados);
        html += renderGrupoSelector('B', 4, jugadoresSeleccionados);
    } else if (numJugadores === 9) {
        // 3 grupos de 3
        html += renderGrupoSelector('A', 3, jugadoresSeleccionados);
        html += renderGrupoSelector('B', 3, jugadoresSeleccionados);
        html += renderGrupoSelector('C', 3, jugadoresSeleccionados);
    } else if (numJugadores === 10) {
        // 2 grupos de 5
        html += renderGrupoSelector('A', 5, jugadoresSeleccionados);
        html += renderGrupoSelector('B', 5, jugadoresSeleccionados);
    }

    html += `<div style="text-align:center; margin-top:15px;">
        <button id="confirmarGruposBtn" style="background:#4caf50; color:white; padding:10px 25px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:14px;">
            ✅ Confirmar Grupos
        </button>
        <button id="resetGruposBtn" style="background:#ff9800; color:white; padding:10px 25px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:14px; margin-left:10px;">
            🔄 Resetear
        </button>
    </div>`;

    html += `<div id="gruposConfirmados" style="display:none; margin-top:15px; padding:10px; background:#c8e6c9; border-radius:6px; text-align:center;">
        <p style="margin:0; color:#2e7d32; font-weight:bold;">✅ Grupos confirmados correctamente</p>
    </div>`;

    html += `<div id="gruposError" style="display:none; margin-top:15px; padding:10px; background:#ffcdd2; border-radius:6px; text-align:center;">
        <p style="margin:0; color:#c62828; font-weight:bold;" id="gruposErrorMsg"></p>
    </div>`;

    html += '</div>';

    container.innerHTML = html;

    // Agregar event listeners para los botones
    const confirmarBtn = document.getElementById('confirmarGruposBtn');
    const resetBtn = document.getElementById('resetGruposBtn');

    if (confirmarBtn) {
        confirmarBtn.addEventListener('click', confirmarGruposManuales);
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', resetearGruposManuales);
    }

    // Agregar listeners para los selectores de grupo
    actualizarSelectoresGrupo();
}

// Función para renderizar un selector de grupo
function renderGrupoSelector(nombreGrupo, cantidad, jugadoresDisponiblesLista) {
    let html = `<div class="grupo-manual-container" style="background:white; padding:15px; border-radius:8px; margin-bottom:10px; border:1px solid #ddd;">
        <h4 style="margin:0 0 10px 0; color:#667eea;">🔷 Grupo ${nombreGrupo} (${cantidad} jugadores)</h4>
        <div class="grupo-selectors" style="display:flex; flex-wrap:wrap; gap:10px;">`;

    for (let i = 0; i < cantidad; i++) {
        html += `<select class="grupo-select" data-grupo="${nombreGrupo}" data-pos="${i}" style="padding:8px 12px; border-radius:5px; border:1px solid #ccc; min-width:150px;">
            <option value="">-- Seleccionar --</option>`;
        jugadoresDisponiblesLista.forEach(nombre => {
            html += `<option value="${nombre}">${nombre}</option>`;
        });
        html += '</select>';
    }

    html += '</div></div>';
    return html;
}

// Función para actualizar los selectores de grupo (deshabilitar opciones ya usadas)
function actualizarSelectoresGrupo() {
    const selectores = document.querySelectorAll('.grupo-select');
    const usados = new Set();

    // Primero, recolectar todos los valores seleccionados
    selectores.forEach(select => {
        if (select.value) {
            usados.add(select.value);
        }
    });

    // Luego, actualizar las opciones de cada selector
    selectores.forEach(select => {
        const valorActual = select.value;
        const opciones = select.querySelectorAll('option');

        opciones.forEach(opcion => {
            if (opcion.value && opcion.value !== valorActual) {
                opcion.disabled = usados.has(opcion.value);
            }
        });
    });

    // Agregar listener de cambio a cada selector
    selectores.forEach(select => {
        select.removeEventListener('change', onGrupoSelectChange);
        select.addEventListener('change', onGrupoSelectChange);
    });
}

function onGrupoSelectChange() {
    actualizarSelectoresGrupo();
    // Resetear confirmación si se cambia algo
    window.gruposManualConfig = null;
    const confirmadoDiv = document.getElementById('gruposConfirmados');
    if (confirmadoDiv) confirmadoDiv.style.display = 'none';
}

// Función para confirmar los grupos manuales
function confirmarGruposManuales() {
    const numJugadores = parseInt(document.getElementById('numPlayers').value);
    const selectores = document.querySelectorAll('.grupo-select');
    const errorDiv = document.getElementById('gruposError');
    const errorMsg = document.getElementById('gruposErrorMsg');
    const confirmadoDiv = document.getElementById('gruposConfirmados');

    // Ocultar mensajes previos
    if (errorDiv) errorDiv.style.display = 'none';
    if (confirmadoDiv) confirmadoDiv.style.display = 'none';

    // Recolectar jugadores por grupo
    const grupos = { grupoA: [], grupoB: [], grupoC: [] };
    const todosSeleccionados = [];

    selectores.forEach(select => {
        const grupo = select.getAttribute('data-grupo');
        const valor = select.value;

        if (valor) {
            grupos['grupo' + grupo].push(valor);
            todosSeleccionados.push(valor);
        }
    });

    // Validar que todos los jugadores estén asignados
    if (todosSeleccionados.length !== numJugadores) {
        if (errorDiv && errorMsg) {
            errorMsg.textContent = `❌ Faltan jugadores por asignar. Asignados: ${todosSeleccionados.length}/${numJugadores}`;
            errorDiv.style.display = 'block';
        }
        return;
    }

    // Validar que no haya duplicados
    const unicos = new Set(todosSeleccionados);
    if (unicos.size !== todosSeleccionados.length) {
        if (errorDiv && errorMsg) {
            errorMsg.textContent = '❌ Hay jugadores duplicados. Cada jugador solo puede estar en un grupo.';
            errorDiv.style.display = 'block';
        }
        return;
    }

    // Validar tamaño de grupos según formato
    let sizesEsperados;
    if (numJugadores === 8) {
        sizesEsperados = { grupoA: 4, grupoB: 4, grupoC: 0 };
    } else if (numJugadores === 9) {
        sizesEsperados = { grupoA: 3, grupoB: 3, grupoC: 3 };
    } else if (numJugadores === 10) {
        sizesEsperados = { grupoA: 5, grupoB: 5, grupoC: 0 };
    }

    for (const [key, expected] of Object.entries(sizesEsperados)) {
        if (grupos[key].length !== expected) {
            if (errorDiv && errorMsg) {
                const nombreGrupo = key.replace('grupo', 'Grupo ');
                errorMsg.textContent = `❌ ${nombreGrupo} debe tener ${expected} jugadores, tiene ${grupos[key].length}`;
                errorDiv.style.display = 'block';
            }
            return;
        }
    }

    // Todo validado, guardar configuración
    window.gruposManualConfig = grupos;

    if (confirmadoDiv) {
        confirmadoDiv.style.display = 'block';
    }

    console.log('✅ Grupos manuales configurados:', grupos);
}

// Función para resetear los grupos manuales
function resetearGruposManuales() {
    window.gruposManualConfig = null;

    const selectores = document.querySelectorAll('.grupo-select');
    selectores.forEach(select => {
        select.value = '';
    });

    actualizarSelectoresGrupo();

    const confirmadoDiv = document.getElementById('gruposConfirmados');
    const errorDiv = document.getElementById('gruposError');
    if (confirmadoDiv) confirmadoDiv.style.display = 'none';
    if (errorDiv) errorDiv.style.display = 'none';
}

// Render y lógica para selección de jugadores (UI debajo del select)
function renderPlayerSelection(numJugadores) {
    inicializarSelectorJugadores(numJugadores, (checked) => {
        if (checked.length === numJugadores) {
            window.jugadoresSeleccionadosGlobal = checked.map(c => c.getAttribute('data-nombre'));
        } else {
            window.jugadoresSeleccionadosGlobal = null;
        }

        // Resetear grupos manuales cuando cambia la selección y actualizar UI
        window.gruposManualConfig = null;
        renderGruposManualUI();

        // actualizar estado del botón simular tras cambio manual
        updateSimularButtonState();
    });

    // Actualizar estado del botón simular al terminar de renderizar
    updateSimularButtonState();
}

function obtenerJugadoresSeleccionadosPorNombre(numJugadores) {
    // Si no hay selección manual, no auto-seleccionar aquí: devolver vacío para forzar validación externa
    if (!window.jugadoresSeleccionadosGlobal || window.jugadoresSeleccionadosGlobal.length !== numJugadores) {
        return [];
    }
    return window.jugadoresSeleccionadosGlobal.map(nombre => jugadoresDisponibles.find(j => j.nombre === nombre)).filter(Boolean);
}

// --- Nuevo: controlar estado del botón 'Simular' y el banner superior ---
function updateSimularButtonState() {
    const simBtnEl = document.getElementById('simularBtn'); // puede ser null si la página es solo Monte Carlo
    const mcBtnEl = document.getElementById('btnSimular');
    const numSelectEl = document.getElementById('numPlayers');
    const topWarn = document.getElementById('topSelectionWarning');
    if (!numSelectEl || !mcBtnEl) return; // sin selector de formato o sin botón Monte Carlo no hay nada que hacer

    const num = parseInt(numSelectEl.value);

    // Contar checkboxes marcados en el DOM (si existe el contenedor)
    const container = document.getElementById('playerSelection');
    let selectedCount = 0;
    if (container) {
        selectedCount = container.querySelectorAll('.player-checkbox:checked').length;
    } else if (window.jugadoresSeleccionadosGlobal) {
        // Fallback: usar la selección global
        selectedCount = window.jugadoresSeleccionadosGlobal.length;
    }

    // Habilitar solo si la cantidad marcada coincide con la requerida
    const habilitado = selectedCount === num;
    if (simBtnEl) simBtnEl.disabled = !habilitado;
    mcBtnEl.disabled = !habilitado;

    // Mostrar cartel superior si hay menos seleccionados que los requeridos
    if (topWarn) {
        if (selectedCount !== num) {
            topWarn.textContent = `Por favor seleccioná exactamente ${num} jugadores antes de simular.`;
            topWarn.style.display = 'block';
        } else {
            topWarn.style.display = 'none';
        }
    }
}

// ==== MAIN: EVENTOS GLOBALES ====
// Enlazar botón simular al DOM
const simBtn = document.getElementById('simularBtn');
if (simBtn) {
    simBtn.addEventListener('click', () => {
        const num = parseInt(document.getElementById('numPlayers').value);
        const seleccion = obtenerJugadoresSeleccionadosPorNombre(num);
        if (seleccion.length !== num) {
            alert(`Por favor seleccioná exactamente ${num} jugadores antes de simular.`);
            return;
        }

        // Verificar si hay grupos manuales configurados cuando el modo es manual
        const modoGruposEl = document.getElementById('modoGrupos');
        const modoGrupos = modoGruposEl ? modoGruposEl.value : 'aleatorio';

        if (modoGrupos === 'manual' && num >= 8) {
            if (!window.gruposManualConfig) {
                alert('Por favor configurá y confirmá los grupos manualmente antes de simular.');
                return;
            }
        }

        // Llamamos a simularTorneo pero inyectando la selección temporalmente
        // Guardamos jugadoresBase original
        const originalBase = [...jugadoresBase];
        // Reemplazamos jugadoresBase por la selección
        let seleccionCompleta = [...seleccion];
        if (seleccionCompleta.length < num) {
            const faltan = num - seleccionCompleta.length;
            for (let i = 0; i < faltan; i++) {
                if (nuevosJugadores[i]) seleccionCompleta.push(nuevosJugadores[i]);
            }
        }
        // reescribimos jugadoresBase temporalmente
        for (let i = 0; i < jugadoresBase.length; i++) {
            jugadoresBase[i] = seleccionCompleta[i] || jugadoresBase[i];
        }
        // Si hay más seleccionados que jugadoresBase originales, extendemos
        if (seleccionCompleta.length > jugadoresBase.length) {
            for (let i = jugadoresBase.length; i < seleccionCompleta.length; i++) jugadoresBase.push(seleccionCompleta[i]);
        }

        // Ejecutar la simulación (usa la variable jugadoresBase modificada)

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

        simularTorneo();

        // Restaurar jugadoresBase original
        for (let i = 0; i < originalBase.length; i++) jugadoresBase[i] = originalBase[i];
        jugadoresBase.length = originalBase.length;
    });
}

// Añadir listener para el botón de selección aleatoria en UI
const randomSelectBtn = document.getElementById('randomSelectBtn');
if (randomSelectBtn) {
    randomSelectBtn.addEventListener('click', () => {
        const numSelectEl = document.getElementById('numPlayers');
        if (!numSelectEl) return;
        const num = parseInt(numSelectEl.value);

        // Generar selección aleatoria de nombres
        const seleccionAuto = elegirAleatorioNombres(num);
        window.jugadoresSeleccionadosGlobal = seleccionAuto.slice();

        // Marcar checkboxes si existen
        const container = document.getElementById('playerSelection');
        if (container) {
            const checkboxes = Array.from(container.querySelectorAll('.player-checkbox'));
            checkboxes.forEach(cb => {
                const nombre = cb.getAttribute('data-nombre');
                cb.checked = seleccionAuto.includes(nombre);
            });
            const countEl = document.getElementById('selectionCount');
            if (countEl) countEl.textContent = `${num} / ${num} seleccionados`;
        }

        // Resetear grupos manuales y actualizar UI
        window.gruposManualConfig = null;
        renderGruposManualUI();

        // Actualizar estado y cerrar listener
        updateSimularButtonState();
        console.info('Selección manual vía botón aleatorio:', seleccionAuto);
    });
}

// Asegurarse de renderizar la selección inicial y mostrar el formato al cargar
document.addEventListener('DOMContentLoaded', async () => {
    // Primero cargar los jugadores desde el archivo
    await cargarJugadoresDesdeArchivo();
    await cargarHistorialCompleto();

    const numSelect = document.getElementById('numPlayers');
    if (numSelect) {
        // Cuando cambie el formato, re-renderizamos el formato y la selección
        numSelect.addEventListener('change', mostrarFormato);
        // render inicial
        mostrarFormato();
        // marcar que la página ya cargo (para cualquier comportamiento futuro que lo necesite)
        window._paginaCargada = true;
    }

    // Listener para el selector de modo de grupos
    const modoGruposEl = document.getElementById('modoGrupos');
    if (modoGruposEl) {
        modoGruposEl.addEventListener('change', () => {
            window.gruposManualConfig = null;
            renderGruposManualUI();
        });
    }
});
