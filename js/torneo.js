// =====================================================
// CREADOR DE TORNEO — PROBABILIDADES EN TIEMPO REAL
// =====================================================
// Esta sección NO simula resultados. Sortea los grupos
// aleatoriamente y calcula las probabilidades de
// clasificación usando Monte Carlo (grupos fijos).
// =====================================================

let jugadoresBase = [];
let nuevosJugadores = [];
let jugadoresDisponibles = [];

// Variables para almacenar el historial de enfrentamientos directos
let enfrentamientosDirectos = {};
let partidosDetallados = [];

// ---- Carga de jugadores desde ranking.txt ----
async function cargarJugadoresDesdeArchivo() {
    try {
        const response = await fetch('ranking.txt');
        if (!response.ok) throw new Error('No se pudo cargar ranking.txt');
        const texto = await response.text();
        const lineas = texto.split('\n');
        const jugadores = [];
        for (const linea of lineas) {
            const lineaTrimmed = linea.trim();
            if (!lineaTrimmed || lineaTrimmed.startsWith('#')) continue;
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
        if (!jugadores.length) throw new Error('No hay jugadores válidos en ranking.txt');
        jugadores.sort((a, b) => b.ranking - a.ranking);
        jugadoresBase = jugadores.slice(0, 8);
        nuevosJugadores = jugadores.slice(8);
        jugadoresDisponibles = [...jugadores];
        return true;
    } catch (error) {
        console.error('Error cargando jugadores:', error);
        alert('Error: No se pudo cargar ranking.txt. Verificá que el archivo exista.');
        return false;
    }
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

// ---- Utilidades ----
function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ---- Simulación de partido (idéntica a simulador.js) ----
function calcularProbabilidadGana1(jugador1, jugador2) {
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

    const k = 30;
    return 1 / (1 + Math.exp(-(fuerza1 - fuerza2) / k));
}

function simularPartido(jugador1, jugador2) {
    const probFinal = calcularProbabilidadGana1(jugador1, jugador2);
    const gana1 = Math.random() < probFinal;

    const promGanador = gana1 ? jugador1.promedioGoles : jugador2.promedioGoles;
    const promPerdedor = gana1 ? jugador2.promedioGoles : jugador1.promedioGoles;
    const bonusDiff = Math.max(0, Math.min(2, promGanador - promPerdedor));
    const diffFinal = Math.min(7, Math.round(Math.floor(Math.random() * 4) + 1 + bonusDiff));

    return {
        ganador: gana1 ? jugador1.nombre : jugador2.nombre,
        goles1: gana1 ? 7 : Math.max(0, 7 - diffFinal),
        goles2: gana1 ? Math.max(0, 7 - diffFinal) : 7
    };
}

// ---- Simula un grupo round-robin y devuelve el ranking final ----
function simularGrupoUnico(jugadoresGrupo) {
    const stats = {};
    jugadoresGrupo.forEach(j => {
        stats[j.nombre] = { pg: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
    });

    for (let i = 0; i < jugadoresGrupo.length; i++) {
        for (let j = i + 1; j < jugadoresGrupo.length; j++) {
            const r = simularPartido(jugadoresGrupo[i], jugadoresGrupo[j]);
            stats[jugadoresGrupo[i].nombre].gf += r.goles1;
            stats[jugadoresGrupo[i].nombre].gc += r.goles2;
            stats[jugadoresGrupo[j].nombre].gf += r.goles2;
            stats[jugadoresGrupo[j].nombre].gc += r.goles1;
            if (r.ganador === jugadoresGrupo[i].nombre) {
                stats[jugadoresGrupo[i].nombre].pg++;
                stats[jugadoresGrupo[j].nombre].pp++;
                stats[jugadoresGrupo[i].nombre].pts += r.goles1;
                stats[jugadoresGrupo[j].nombre].pts += r.goles2;
            } else {
                stats[jugadoresGrupo[j].nombre].pg++;
                stats[jugadoresGrupo[i].nombre].pp++;
                stats[jugadoresGrupo[j].nombre].pts += r.goles2;
                stats[jugadoresGrupo[i].nombre].pts += r.goles1;
            }
        }
    }

    return Object.entries(stats)
        .sort((a, b) => b[1].pts - a[1].pts || b[1].pg - a[1].pg || (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc))
        .map((entry, i) => ({ pos: i + 1, nombre: entry[0], ...entry[1] }));
}

// ---- Busca datos de un jugador por nombre en jugadoresDisponibles ----
function getJugadorData(nombre) {
    return jugadoresDisponibles.find(j => j.nombre === nombre)
        || { nombre, ranking: 50, winRate: 0.5, promedioGoles: 5 };
}

// ---- Monte Carlo con grupos fijos: calcula P(clasifica) por jugador ----
function calcularProbabilidades(grupos, numJugadores, n = 10000) {
    const conteo = {};
    const conteoDirecto = {};
    const conteoRepechaje = {};

    // Inicializar contadores para todos los jugadores
    Object.values(grupos).flat().forEach(j => {
        conteo[j.nombre] = 0;
        conteoDirecto[j.nombre] = 0;
        conteoRepechaje[j.nombre] = 0;
    });

    for (let sim = 0; sim < n; sim++) {

        if (numJugadores === 7) {
            // Liga round-robin: top 4 clasifican
            simularGrupoUnico(grupos.all).slice(0, 4).forEach(p => conteo[p.nombre]++);

        } else if (numJugadores === 8) {
            // 2 grupos de 4: top 2 de cada grupo clasifican
            simularGrupoUnico(grupos.A).slice(0, 2).forEach(p => conteo[p.nombre]++);
            simularGrupoUnico(grupos.B).slice(0, 2).forEach(p => conteo[p.nombre]++);

        } else if (numJugadores === 9) {
            // 3 grupos de 3: 1° directo, resto va a repechaje
            const sA = simularGrupoUnico(grupos.A);
            const sB = simularGrupoUnico(grupos.B);
            const sC = simularGrupoUnico(grupos.C);

            // Primeros: clasificación directa
            [sA[0], sB[0], sC[0]].forEach(p => {
                conteo[p.nombre]++;
                conteoDirecto[p.nombre]++;
            });

            // Mini-liga entre los 3 segundos
            const segundosData = [sA[1], sB[1], sC[1]].map(s => getJugadorData(s.nombre));
            const rSegundos = simularGrupoUnico(segundosData);

            // Mini-liga entre los 3 terceros
            const tercerosData = [sA[2], sB[2], sC[2]].map(t => getJugadorData(t.nombre));
            const rTerceros = simularGrupoUnico(tercerosData);

            // Partido eliminatorio: ganador de segundos vs ganador de terceros
            const eliminatorio = simularPartido(
                getJugadorData(rSegundos[0].nombre),
                getJugadorData(rTerceros[0].nombre)
            );
            conteo[eliminatorio.ganador]++;
            conteoRepechaje[eliminatorio.ganador]++;

        } else if (numJugadores === 10) {
            // 2 grupos de 5: top 2 de cada grupo clasifican
            simularGrupoUnico(grupos.A).slice(0, 2).forEach(p => conteo[p.nombre]++);
            simularGrupoUnico(grupos.B).slice(0, 2).forEach(p => conteo[p.nombre]++);
        }
    }

    // Convertir a porcentajes
    const result = {};
    Object.values(grupos).flat().forEach(j => {
        result[j.nombre] = {
            total: (conteo[j.nombre] / n * 100).toFixed(1),
            directo: (conteoDirecto[j.nombre] / n * 100).toFixed(1),
            repechaje: (conteoRepechaje[j.nombre] / n * 100).toFixed(1)
        };
    });
    return result;
}

// ---- Clase CSS según nivel de probabilidad ----
function getBarClass(prob) {
    if (prob >= 65) return 'alta';
    if (prob >= 45) return 'media-alta';
    if (prob >= 25) return 'media';
    return 'baja';
}

// ---- Renderizar formato de torneo (como en simulador.js) ----
function renderFormatoConfig(numJugadores) {
    const container = document.getElementById('formatoContainer');
    if (!container) return;
    
    container.style.display = 'block';

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

    container.innerHTML = html;
}

// ---- Sortear grupos y calcular probabilidades ----
function sortearGrupos() {
    const numJugadores = parseInt(document.getElementById('numPlayers').value);
    const nombres = getJugadoresSeleccionados();
    if (nombres.length !== numJugadores) {
        alert(`Seleccione exactamente ${numJugadores} jugadores.`);
        return;
    }

    // Ocultar controles y selección de jugadores, dejando solo los nav-links
    const controls = document.querySelector('.controls');
    if (controls) {
        Array.from(controls.children).forEach(child => {
            if (!child.classList.contains('nav-links')) {
                child.style.display = 'none';
            }
        });
    }
    const playerSelectionContainer = document.getElementById('playerSelection');
    if (playerSelectionContainer) playerSelectionContainer.style.display = 'none';
    const btnSortearContainer = document.getElementById('sortearContainer');
    if (btnSortearContainer) btnSortearContainer.style.display = 'none';

    const formatoContainer = document.getElementById('formatoContainer');
    if (formatoContainer) {
        formatoContainer.style.display = 'none';
    }

    const jugadores = shuffleArray(nombres.map(n => jugadoresDisponibles.find(j => j.nombre === n)));

    let grupos;
    if (numJugadores === 7) {
        grupos = { all: jugadores };
    } else if (numJugadores === 8) {
        grupos = { A: jugadores.slice(0, 4), B: jugadores.slice(4, 8) };
    } else if (numJugadores === 9) {
        grupos = { A: jugadores.slice(0, 3), B: jugadores.slice(3, 6), C: jugadores.slice(6, 9) };
    } else {
        grupos = { A: jugadores.slice(0, 5), B: jugadores.slice(5, 10) };
    }

    const probs = calcularProbabilidades(grupos, numJugadores);
    mostrarResultados(grupos, probs, numJugadores);
}

// ---- Renderizar grupos con probabilidades ----
function mostrarResultados(grupos, probs, numJugadores) {
    const resultado = document.getElementById('resultado');
    let html = '';

    if (numJugadores === 7) {
        // Tabla de probabilidades para liga round-robin
        const jugadoresOrdenados = grupos.all.slice().sort((a, b) =>
            parseFloat(probs[b.nombre].total) - parseFloat(probs[a.nombre].total)
        );

        html += '<div class="phase-title">📋 PROBABILIDADES DE CLASIFICACIÓN — LIGA</div>';
        html += '<p class="prob-subtitulo">Probabilidad de terminar Top 4 y clasificar al playoff · 10.000 simulaciones</p>';

        html += '<div class="standings"><div class="standings-inner"><table>';
        html += '<tr><th>Pos</th><th>Jugador</th><th>Ranking</th><th>P(Clasifica Top 4)</th></tr>';

        jugadoresOrdenados.forEach((j, idx) => {
            const prob = parseFloat(probs[j.nombre].total);
            const barClass = getBarClass(prob);
            const clasifica = idx < 4 ? 'style="background: rgba(46, 160, 67, 0.15);"' : '';
            html += `<tr ${clasifica}>
                <td class="position">${idx + 1}°</td>
                <td><strong>${j.nombre}</strong></td>
                <td class="ranking-col">${j.ranking} pts</td>
                <td class="prob-col">
                    <div class="prob-bar-container">
                        <div class="prob-bar-track">
                            <div class="prob-bar-fill ${barClass}" style="width:${prob}%"></div>
                        </div>
                        <span class="prob-label ${barClass}">${prob}%</span>
                    </div>
                </td>
            </tr>`;
        });

        html += '</table></div></div>';
        html += '<p class="clasifican-note">🟢 Los 4 primeros clasifican a playoffs</p>';

    } else {
        // Grupos con barras de probabilidad (8, 9, 10 jugadores)
        if (numJugadores === 9) {
            html += '<div class="phase-title">📋 GRUPOS Y PROBABILIDADES — 3 GRUPOS DE 3</div>';
            html += '<p class="prob-subtitulo">Los 1° de cada grupo clasifican directo. Los 2° y 3° van a repechaje · 10.000 simulaciones</p>';
        } else if (numJugadores === 8) {
            html += '<div class="phase-title">📋 GRUPOS Y PROBABILIDADES — 2 GRUPOS DE 4</div>';
            html += '<p class="prob-subtitulo">Los 2 primeros de cada grupo clasifican a playoffs · 10.000 simulaciones</p>';
        } else {
            html += '<div class="phase-title">📋 GRUPOS Y PROBABILIDADES — 2 GRUPOS DE 5</div>';
            html += '<p class="prob-subtitulo">Los 2 primeros de cada grupo clasifican a playoffs · 10.000 simulaciones</p>';
        }

        html += '<div class="grupos-container">';

        Object.keys(grupos).forEach(nombreGrupo => {
            const jugadoresGrupo = grupos[nombreGrupo];
            // Ordenar por probabilidad total descendente dentro de la tarjeta
            const jugadoresOrdenados = jugadoresGrupo.slice().sort((a, b) =>
                parseFloat(probs[b.nombre].total) - parseFloat(probs[a.nombre].total)
            );
            const badgeTexto = numJugadores === 9 ? '1° clasifica directo' : 'Top 2 clasifican';

            html += `<div class="grupo-card">
                <div class="grupo-header">
                    <span>Grupo ${nombreGrupo}</span>
                    <span class="clasifican-badge">${badgeTexto}</span>
                </div>
                <div class="jugadores-list">`;

            jugadoresOrdenados.forEach(j => {
                const prob = parseFloat(probs[j.nombre].total);
                const barClass = getBarClass(prob);

                if (numJugadores === 9) {
                    const pDir = parseFloat(probs[j.nombre].directo);
                    const pRep = parseFloat(probs[j.nombre].repechaje);
                    html += `<div class="jugador-row">
                        <div class="jugador-info">
                            <span class="jugador-nombre">${j.nombre}</span>
                            <span class="jugador-ranking-badge">${j.ranking} pts</span>
                        </div>
                        <div class="prob-breakdown">
                            <div class="prob-line">
                                <span class="prob-type">Directo:</span>
                                <div class="prob-bar-track small">
                                    <div class="prob-bar-fill alta" style="width:${Math.min(100, pDir)}%"></div>
                                </div>
                                <span class="prob-value-small">${pDir}%</span>
                            </div>
                            <div class="prob-line">
                                <span class="prob-type">Repechaje:</span>
                                <div class="prob-bar-track small">
                                    <div class="prob-bar-fill media" style="width:${Math.min(100, pRep)}%"></div>
                                </div>
                                <span class="prob-value-small">${pRep}%</span>
                            </div>
                            <div class="prob-total-line">
                                <span class="prob-type"><strong>Total:</strong></span>
                                <div class="prob-bar-track">
                                    <div class="prob-bar-fill ${barClass}" style="width:${Math.min(100, prob)}%"></div>
                                </div>
                                <span class="prob-label ${barClass}">${prob}%</span>
                            </div>
                        </div>
                    </div>`;
                } else {
                    html += `<div class="jugador-row">
                        <div class="jugador-info">
                            <span class="jugador-nombre">${j.nombre}</span>
                            <span class="jugador-ranking-badge">${j.ranking} pts</span>
                        </div>
                        <div class="prob-bar-container">
                            <div class="prob-bar-track">
                                <div class="prob-bar-fill ${barClass}" style="width:${Math.min(100, prob)}%"></div>
                            </div>
                            <span class="prob-label ${barClass}">${prob}%</span>
                        </div>
                    </div>`;
                }
            });

            html += '</div></div>';
        });

        html += '</div>';

        if (numJugadores === 9) {
            html += `<div class="repechaje-info">
                <strong>⚖️ Camino de Repechaje (1 cupo a playoffs)</strong>
                <p>Los <strong>2° de cada grupo</strong> juegan una mini-liga entre ellos (3 partidos) → el 1° avanza al partido eliminatorio.</p>
                <p>Los <strong>3° de cada grupo</strong> juegan una mini-liga entre ellos (3 partidos) → el 1° avanza al partido eliminatorio.</p>
                <p>El ganador del <strong>partido eliminatorio</strong> es el 4° clasificado a playoffs.</p>
            </div>`;
        }
    }

    // Mostrar los partidos que se juegan con probabilidades (como playoffs)
    html += '<div class="phase-title" style="margin-top: 30px;">⚔️ PARTIDOS DE LA FASE Y PROBABILIDADES</div>';
    
    Object.keys(grupos).forEach(nombreGrupo => {
        const jugadoresGrupo = grupos[nombreGrupo];
        if (Object.keys(grupos).length > 1) {
            html += `<h3 style="margin-top: 15px; margin-bottom: 10px; color: #333; font-weight: 700; text-align: center;">Partidos del Grupo ${nombreGrupo}</h3>`;
        } else {
            html += `<h3 style="margin-top: 15px; margin-bottom: 10px; color: #333; font-weight: 700; text-align: center;">Todos los partidos</h3>`;
        }
        html += '<div class="sf-grid">';

        for (let i = 0; i < jugadoresGrupo.length; i++) {
            for (let j = i + 1; j < jugadoresGrupo.length; j++) {
                const j1 = jugadoresGrupo[i];
                const j2 = jugadoresGrupo[j];
                const pJ1 = calcularProbabilidadGana1(j1, j2);
                const pJ2 = 1 - pJ1;
                const clase1 = getBarClass(pJ1 * 100);
                const clase2 = getBarClass(pJ2 * 100);
                const pct = prob => (prob * 100).toFixed(1) + '%';

                html += `<div class="sf-card">
                    <div class="sf-card-header">Partido</div>
                    <div class="sf-matchup">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <div class="sf-player-info">
                                <span class="sf-player-name">${j1.nombre}</span>
                            </div>
                            <div class="sf-player-info" style="align-items: flex-end;">
                                <span class="sf-player-name">${j2.nombre}</span>
                            </div>
                        </div>
                        <div class="sf-split-bar">
                            <div class="split-segment ${clase1}" style="width:${pJ1 * 100}%"></div>
                            <div class="split-segment ${clase2}" style="width:${pJ2 * 100}%"></div>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-top: 6px;">
                            <span class="sf-prob-badge ${clase1}">${pct(pJ1)}</span>
                            <span class="sf-prob-badge ${clase2}">${pct(pJ2)}</span>
                        </div>
                    </div>
                    <div class="sf-insight">Probabilidad de ganar</div>
                </div>`;
            }
        }
        html += '</div>';
    });


    resultado.innerHTML = html;
}

// ---- Selección de jugadores ----
function renderPlayerSelection(numJugadores) {
    inicializarSelectorJugadores(numJugadores, () => {
        updateSortearButtonState();
    });

    updateSortearButtonState();
}

function updateSortearButtonState() {
    const numJugadores = parseInt(document.getElementById('numPlayers').value);
    const seleccionados = getJugadoresSeleccionados();
    const ok = seleccionados.length === numJugadores;

    const btn = document.getElementById('sortearBtn');
    if (btn) btn.disabled = !ok;

    const sortearContainer = document.getElementById('sortearContainer');
    if (sortearContainer) sortearContainer.style.display = ok ? 'block' : 'none';
}

// ---- Inicialización ----
document.addEventListener('DOMContentLoaded', async () => {
    await cargarJugadoresDesdeArchivo();
    await cargarHistorialCompleto();

    const numSelect = document.getElementById('numPlayers');
    if (numSelect) {
        numSelect.addEventListener('change', () => {
            document.getElementById('resultado').innerHTML = '';
            document.getElementById('formatoContainer').innerHTML = '';
            const num = parseInt(numSelect.value);
            renderFormatoConfig(num);
            renderPlayerSelection(num);
        });
        const num = parseInt(numSelect.value);
        renderFormatoConfig(num);
        renderPlayerSelection(num);
    }

    const randomBtn = document.getElementById('randomSelectBtn');
    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            const numJugadores = parseInt(document.getElementById('numPlayers').value);
            const seleccionados = shuffleArray(jugadoresDisponibles).slice(0, numJugadores).map(j => j.nombre);
            document.querySelectorAll('#playerSelection .player-checkbox').forEach(cb => {
                cb.checked = seleccionados.includes(cb.getAttribute('data-nombre'));
            });
            const countEl = document.getElementById('selectionCount');
            if (countEl) countEl.textContent = `${numJugadores} / ${numJugadores} seleccionados`;
            updateSortearButtonState();
        });
    }

    const sortearBtn = document.getElementById('sortearBtn');
    if (sortearBtn) {
        sortearBtn.addEventListener('click', sortearGrupos);
    }
});
