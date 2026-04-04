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
function simularPartido(jugador1, jugador2) {
    const fuerza1 = (jugador1.ranking * 0.4) + (jugador1.winRate * 100 * 0.6);
    const fuerza2 = (jugador2.ranking * 0.4) + (jugador2.winRate * 100 * 0.6);
    const k = 30;
    const probFinal = 1 / (1 + Math.exp(-(fuerza1 - fuerza2) / k));
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

// ---- Sortear grupos y calcular probabilidades ----
function sortearGrupos() {
    const numJugadores = parseInt(document.getElementById('numPlayers').value);
    const nombres = getJugadoresSeleccionados();
    if (nombres.length !== numJugadores) {
        alert(`Seleccioná exactamente ${numJugadores} jugadores.`);
        return;
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
            const clasifica = idx < 4 ? 'style="background:#e8f5e9;"' : '';
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

    html += `<div style="text-align:center; margin-top:25px;">
        <button class="btn-nuevo-sorteo" onclick="sortearGrupos()">🔄 Nuevo Sorteo</button>
    </div>`;

    resultado.innerHTML = html;
}

// ---- Selección de jugadores ----
function getJugadoresSeleccionados() {
    return Array.from(document.querySelectorAll('#playerSelection .player-checkbox:checked'))
        .map(cb => cb.getAttribute('data-nombre'));
}

function renderPlayerSelection(numJugadores) {
    const container = document.getElementById('playerSelection');
    if (!container) return;

    let html = `<div class="player-selection-container">
        <p class="selection-instruccion">Seleccioná exactamente <strong>${numJugadores}</strong> jugadores:</p>
        <div class="player-list">`;

    jugadoresDisponibles.forEach(j => {
        html += `<label class="player-label">
            <input type="checkbox" class="player-checkbox" data-nombre="${j.nombre}" />
            <span class="player-name-text">${j.nombre}</span>
            <span class="player-pts-text">${j.ranking} pts</span>
        </label>`;
    });

    html += `</div>
        <p class="selection-count" id="selectionCount">0 / ${numJugadores} seleccionados</p>
    </div>`;

    container.innerHTML = html;

    const checkboxes = Array.from(container.querySelectorAll('.player-checkbox'));
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = checkboxes.filter(c => c.checked);
            if (checked.length > numJugadores) {
                cb.checked = false;
                return;
            }
            document.getElementById('selectionCount').textContent =
                `${checked.length} / ${numJugadores} seleccionados`;
            updateSortearButtonState();
        });
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

    const numSelect = document.getElementById('numPlayers');
    if (numSelect) {
        numSelect.addEventListener('change', () => {
            document.getElementById('resultado').innerHTML = '';
            renderPlayerSelection(parseInt(numSelect.value));
        });
        renderPlayerSelection(parseInt(numSelect.value));
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
