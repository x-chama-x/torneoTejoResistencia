// =====================================================
// SIMULADOR DE PLAYOFFS — CRUCES Y PROBABILIDADES
// =====================================================
// Permite elegir 4 jugadores, define los cruces de
// semifinales y calcula analíticamente (sin simulación)
// las probabilidades de cada partido y del campeón.
// =====================================================

let jugadoresDisponibles = [];

// ---- Carga de jugadores ----
async function cargarJugadoresDesdeArchivo() {
    try {
        const response = await fetch('ranking.txt');
        if (!response.ok) throw new Error('No se pudo cargar ranking.txt');
        const texto = await response.text();
        const lineas = texto.split('\n');
        const jugadores = [];
        for (const linea of lineas) {
            const t = linea.trim();
            if (!t || t.startsWith('#')) continue;
            const p = t.split(',');
            if (p.length >= 4) {
                jugadores.push({
                    nombre: p[0].trim(),
                    ranking: parseInt(p[1].trim()),
                    winRate: parseFloat(p[2].trim()),
                    promedioGoles: parseFloat(p[3].trim())
                });
            }
        }
        if (!jugadores.length) throw new Error('No hay jugadores válidos');
        jugadores.sort((a, b) => b.ranking - a.ranking);
        jugadoresDisponibles = [...jugadores];
        return true;
    } catch (error) {
        console.error('Error cargando jugadores:', error);
        alert('Error: No se pudo cargar ranking.txt.');
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

// ---- Probabilidad analítica de que j1 gane contra j2 ----
// Usa la misma fórmula sigmoide que el resto de las páginas
function probGanar(j1, j2) {
    const f1 = (j1.ranking * 0.4) + (j1.winRate * 100 * 0.6);
    const f2 = (j2.ranking * 0.4) + (j2.winRate * 100 * 0.6);
    return 1 / (1 + Math.exp(-(f1 - f2) / 30));
}

// ---- Cálculo analítico de todas las probabilidades del bracket ----
// bracket = { sf1: {j1, j2}, sf2: {j1, j2} }
function calcularProbabilidadesPlayoff(bracket) {
    const { sf1, sf2 } = bracket;

    // Probabilidades de ganar cada semifinal
    const pWin_A = probGanar(sf1.j1, sf1.j2);  // P(sf1.j1 gana SF1)
    const pWin_B = 1 - pWin_A;                  // P(sf1.j2 gana SF1)
    const pWin_C = probGanar(sf2.j1, sf2.j2);  // P(sf2.j1 gana SF2)
    const pWin_D = 1 - pWin_C;                  // P(sf2.j2 gana SF2)

    // Probabilidades en la final para cada posible cruce
    const pFin_AC = probGanar(sf1.j1, sf2.j1);  // P(sf1.j1 gana si final es AC)
    const pFin_AD = probGanar(sf1.j1, sf2.j2);  // P(sf1.j1 gana si final es AD)
    const pFin_BC = probGanar(sf1.j2, sf2.j1);  // P(sf1.j2 gana si final es BC)
    const pFin_BD = probGanar(sf1.j2, sf2.j2);  // P(sf1.j2 gana si final es BD)

    // P(campeón) = P(gana SF) × E[P(gana Final según rival)]
    const pChamp = {
        [sf1.j1.nombre]: pWin_A * (pWin_C * pFin_AC + pWin_D * pFin_AD),
        [sf1.j2.nombre]: pWin_B * (pWin_C * pFin_BC + pWin_D * pFin_BD),
        [sf2.j1.nombre]: pWin_C * (pWin_A * (1 - pFin_AC) + pWin_B * (1 - pFin_BC)),
        [sf2.j2.nombre]: pWin_D * (pWin_A * (1 - pFin_AD) + pWin_B * (1 - pFin_BD))
    };

    // P(llega a final) = P(gana SF)
    const pFinal = {
        [sf1.j1.nombre]: pWin_A,
        [sf1.j2.nombre]: pWin_B,
        [sf2.j1.nombre]: pWin_C,
        [sf2.j2.nombre]: pWin_D
    };

    // Probabilidad de cada posible cruce de final
    const finalesPosibles = [
        { j1: sf1.j1, j2: sf2.j1, prob: pWin_A * pWin_C, label: `${sf1.j1.nombre} vs ${sf2.j1.nombre}` },
        { j1: sf1.j1, j2: sf2.j2, prob: pWin_A * pWin_D, label: `${sf1.j1.nombre} vs ${sf2.j2.nombre}` },
        { j1: sf1.j2, j2: sf2.j1, prob: pWin_B * pWin_C, label: `${sf1.j2.nombre} vs ${sf2.j1.nombre}` },
        { j1: sf1.j2, j2: sf2.j2, prob: pWin_B * pWin_D, label: `${sf1.j2.nombre} vs ${sf2.j2.nombre}` }
    ].sort((a, b) => b.prob - a.prob);

    return {
        sf1: { j1: sf1.j1, j2: sf1.j2, pJ1: pWin_A, pJ2: pWin_B },
        sf2: { j1: sf2.j1, j2: sf2.j2, pJ1: pWin_C, pJ2: pWin_D },
        champion: pChamp,
        reachesFinal: pFinal,
        finalesPosibles
    };
}

// ---- Helpers de display ----
function getBarClass(prob) {
    if (prob >= 0.65) return 'alta';
    if (prob >= 0.45) return 'media-alta';
    if (prob >= 0.25) return 'media';
    return 'baja';
}

function pct(prob) {
    return (prob * 100).toFixed(1) + '%';
}

// ---- Sortear o confirmar bracket ----
function definirBracket() {
    const modo = document.getElementById('modoBracket').value;
    const seleccionados = getJugadoresSeleccionados();

    if (seleccionados.length !== 4) {
        alert('Seleccioná exactamente 4 jugadores.');
        return;
    }

    const jugadores = seleccionados.map(n => jugadoresDisponibles.find(j => j.nombre === n));
    let bracket;

    if (modo === 'aleatorio') {
        const mezclados = shuffleArray(jugadores);
        bracket = {
            sf1: { j1: mezclados[0], j2: mezclados[1] },
            sf2: { j1: mezclados[2], j2: mezclados[3] }
        };
    } else {
        // Manual: leer desde los selectores
        const sf1j1Nombre = document.getElementById('manualSF1J1').value;
        const sf1j2Nombre = document.getElementById('manualSF1J2').value;

        if (!sf1j1Nombre || !sf1j2Nombre) {
            alert('Seleccioná los dos jugadores de la Semifinal 1.');
            return;
        }
        if (sf1j1Nombre === sf1j2Nombre) {
            alert('Los dos jugadores de la Semifinal 1 deben ser diferentes.');
            return;
        }

        const sf1j1 = jugadores.find(j => j.nombre === sf1j1Nombre);
        const sf1j2 = jugadores.find(j => j.nombre === sf1j2Nombre);
        const restantes = jugadores.filter(j => j.nombre !== sf1j1Nombre && j.nombre !== sf1j2Nombre);
        bracket = {
            sf1: { j1: sf1j1, j2: sf1j2 },
            sf2: { j1: restantes[0], j2: restantes[1] }
        };
    }

    const probs = calcularProbabilidadesPlayoff(bracket);
    mostrarResultados(bracket, probs);
}

// ---- Renderizar resultados ----
function mostrarResultados(bracket, probs) {
    const resultado = document.getElementById('resultado');
    let html = '';

    // === SEMIFINALES ===
    html += '<div class="phase-title">⚔️ SEMIFINALES</div>';
    html += '<div class="sf-grid">';

    [
        { label: 'Semifinal 1', match: probs.sf1 },
        { label: 'Semifinal 2', match: probs.sf2 }
    ].forEach(({ label, match }) => {
        const { j1, j2, pJ1, pJ2 } = match;
        const clase1 = getBarClass(pJ1);
        const clase2 = getBarClass(pJ2);

        html += `<div class="sf-card">
            <div class="sf-card-header">${label}</div>
            <div class="sf-matchup">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <div class="sf-player-info">
                        <span class="sf-player-name">${j1.nombre}</span>
                        <span class="sf-ranking-badge">${j1.ranking} pts</span>
                    </div>
                    <div class="sf-player-info" style="align-items: flex-end;">
                        <span class="sf-player-name">${j2.nombre}</span>
                        <span class="sf-ranking-badge">${j2.ranking} pts</span>
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
    });

    html += '</div>';

    // === PROBABILIDADES DE CAMPEÓN ===
    html += '<div class="phase-title">🏆 PROBABILIDADES DE CAMPEÓN</div>';

    const todosJugadores = [
        { j: bracket.sf1.j1, pChamp: probs.champion[bracket.sf1.j1.nombre], pFinal: probs.reachesFinal[bracket.sf1.j1.nombre] },
        { j: bracket.sf1.j2, pChamp: probs.champion[bracket.sf1.j2.nombre], pFinal: probs.reachesFinal[bracket.sf1.j2.nombre] },
        { j: bracket.sf2.j1, pChamp: probs.champion[bracket.sf2.j1.nombre], pFinal: probs.reachesFinal[bracket.sf2.j1.nombre] },
        { j: bracket.sf2.j2, pChamp: probs.champion[bracket.sf2.j2.nombre], pFinal: probs.reachesFinal[bracket.sf2.j2.nombre] }
    ].sort((a, b) => b.pChamp - a.pChamp);

    const medallas = ['🥇', '🥈', '🥉', ''];

    html += '<div class="champion-card">';
    todosJugadores.forEach(({ j, pChamp, pFinal }, idx) => {
        const barClass = getBarClass(pChamp);
        html += `<div class="champion-row">
            <div class="champion-left">
                <span class="champion-medal">${medallas[idx]}</span>
                <div class="champion-player-info">
                    <span class="champion-name">${j.nombre}</span>
                    <span class="champion-subfact">P(llega a final): ${pct(pFinal)}</span>
                </div>
            </div>
            <div class="champion-bar-area">
                <div class="prob-bar-container">
                    <div class="prob-bar-track wide">
                        <div class="prob-bar-fill ${barClass}" style="width:${Math.min(100, pChamp * 100)}%"></div>
                    </div>
                    <span class="prob-label ${barClass}">${pct(pChamp)}</span>
                </div>
            </div>
        </div>`;
    });
    html += '</div>';

    // === FINALES MÁS PROBABLES ===
    html += '<div class="phase-title">🎯 FINALES MÁS PROBABLES</div>';
    html += '<div class="finals-posibles-card">';

    probs.finalesPosibles.forEach(({ j1, j2, prob, label }, idx) => {
        const pWin_j1 = probGanar(j1, j2);
        const pWin_j2 = 1 - pWin_j1;
        const clase1 = getBarClass(pWin_j1);
        const clase2 = getBarClass(pWin_j2);
        const probFinalPct = (prob * 100).toFixed(1);

        html += `<div class="final-posible ${idx === 0 ? 'top-final' : ''}">
            <div class="final-pos-header">
                <span class="final-pos-label">${idx === 0 ? '⭐ Final más probable' : `Final ${idx + 1}`}</span>
                <span class="final-prob-badge">P(ocurra): ${probFinalPct}%</span>
            </div>
            <div class="final-matchup">
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                    <span class="final-player-name">${j1.nombre}</span>
                    <span class="final-player-name">${j2.nombre}</span>
                </div>
                <div class="final-split-bar">
                    <div class="split-segment ${clase1}" style="width:${pWin_j1 * 100}%"></div>
                    <div class="split-segment ${clase2}" style="width:${pWin_j2 * 100}%"></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 5px;">
                    <span class="final-prob-text ${clase1}">${pct(pWin_j1)}</span>
                    <span class="final-prob-text ${clase2}">${pct(pWin_j2)}</span>
                </div>
            </div>
        </div>`;
    });

    html += '</div>';


    resultado.innerHTML = html;
}

// ---- Selección de jugadores ----
function getJugadoresSeleccionados() {
    return Array.from(document.querySelectorAll('#playerSelection .player-checkbox:checked'))
        .map(cb => cb.getAttribute('data-nombre'));
}

function renderPlayerSelection() {
    const container = document.getElementById('playerSelection');
    if (!container) return;

    let html = `<div class="player-selection-container">
        <p class="selection-instruccion">Seleccioná exactamente <strong>4</strong> jugadores para el playoff:</p>
        <div class="player-list">`;

    jugadoresDisponibles.forEach(j => {
        html += `<label class="player-label">
            <input type="checkbox" class="player-checkbox" data-nombre="${j.nombre}" />
            <span class="player-name-text">${j.nombre}</span>
            <span class="player-pts-text">${j.ranking} pts</span>
        </label>`;
    });

    html += `</div>
        <p class="selection-count" id="selectionCount">0 / 4 seleccionados</p>
    </div>`;

    container.innerHTML = html;

    const checkboxes = Array.from(container.querySelectorAll('.player-checkbox'));
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = checkboxes.filter(c => c.checked);
            if (checked.length > 4) {
                cb.checked = false;
                return;
            }
            const countEl = document.getElementById('selectionCount');
            if (countEl) countEl.textContent = `${checked.length} / 4 seleccionados`;
            updateBracketUI();
        });
    });

    updateBracketUI();
}

// ---- Actualiza la visibilidad del bracket config y botón ----
function updateBracketUI() {
    const seleccionados = getJugadoresSeleccionados();
    const ok = seleccionados.length === 4;
    const modo = document.getElementById('modoBracket').value;

    const configContainer = document.getElementById('bracketConfigContainer');
    if (configContainer) configContainer.style.display = ok ? 'block' : 'none';

    const btn = document.getElementById('bracketBtn');
    if (btn) btn.disabled = !ok;

    // Actualizar selectores manuales si están visibles
    if (ok && modo === 'manual') {
        actualizarSelectoresManuales(seleccionados);
    }
}

// ---- Renderiza los selectores de configuración manual ----
function actualizarSelectoresManuales(seleccionados) {
    const manualContainer = document.getElementById('manualBracketContainer');
    if (!manualContainer) return;

    const modo = document.getElementById('modoBracket').value;
    if (modo !== 'manual') {
        manualContainer.style.display = 'none';
        return;
    }

    manualContainer.style.display = 'block';

    const sel1 = document.getElementById('manualSF1J1');
    const sel2 = document.getElementById('manualSF1J2');

    // Guardar selección actual
    const prev1 = sel1 ? sel1.value : '';
    const prev2 = sel2 ? sel2.value : '';

    let opcionesHTML = '<option value="">-- Elegir --</option>';
    seleccionados.forEach(nombre => {
        opcionesHTML += `<option value="${nombre}">${nombre}</option>`;
    });

    if (sel1) {
        sel1.innerHTML = opcionesHTML;
        if (prev1 && seleccionados.includes(prev1)) sel1.value = prev1;
    }
    if (sel2) {
        sel2.innerHTML = opcionesHTML;
        if (prev2 && seleccionados.includes(prev2)) sel2.value = prev2;
    }

    // Actualizar label de SF2
    actualizarLabelSF2();
}

function actualizarLabelSF2() {
    const seleccionados = getJugadoresSeleccionados();
    const sf1j1 = document.getElementById('manualSF1J1')?.value;
    const sf1j2 = document.getElementById('manualSF1J2')?.value;
    const sf2Label = document.getElementById('sf2AutoLabel');

    if (!sf2Label) return;

    const restantes = seleccionados.filter(n => n !== sf1j1 && n !== sf1j2);
    if (restantes.length === 2 && sf1j1 && sf1j2 && sf1j1 !== sf1j2) {
        sf2Label.textContent = `${restantes[0]} vs ${restantes[1]}`;
        sf2Label.style.color = '#333';
    } else {
        sf2Label.textContent = 'Se define según SF1';
        sf2Label.style.color = '#aaa';
    }
}

// ---- Inicialización ----
document.addEventListener('DOMContentLoaded', async () => {
    await cargarJugadoresDesdeArchivo();
    renderPlayerSelection();

    // Botón aleatorio
    document.getElementById('randomSelectBtn')?.addEventListener('click', () => {
        const seleccionados = shuffleArray(jugadoresDisponibles).slice(0, 4).map(j => j.nombre);
        document.querySelectorAll('#playerSelection .player-checkbox').forEach(cb => {
            cb.checked = seleccionados.includes(cb.getAttribute('data-nombre'));
        });
        const countEl = document.getElementById('selectionCount');
        if (countEl) countEl.textContent = '4 / 4 seleccionados';
        updateBracketUI();
    });

    // Cambio de modo (aleatorio/manual)
    document.getElementById('modoBracket')?.addEventListener('change', () => {
        const modo = document.getElementById('modoBracket').value;
        const manualContainer = document.getElementById('manualBracketContainer');
        if (manualContainer) {
            manualContainer.style.display = modo === 'manual' ? 'block' : 'none';
        }
        const seleccionados = getJugadoresSeleccionados();
        if (modo === 'manual' && seleccionados.length === 4) {
            actualizarSelectoresManuales(seleccionados);
        }
        // Actualizar label del botón
        const btn = document.getElementById('bracketBtn');
        if (btn) {
            btn.textContent = modo === 'aleatorio' ? '🎲 Sortear Bracket' : '⚔️ Definir Bracket';
        }
    });

    // Botón de sortear/confirmar bracket
    document.getElementById('bracketBtn')?.addEventListener('click', definirBracket);

    // Listeners para selectores manuales
    ['manualSF1J1', 'manualSF1J2'].forEach(id => {
        document.getElementById(id)?.addEventListener('change', actualizarLabelSF2);
    });
});
