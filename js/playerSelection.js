// Componente modular para la selección de jugadores

function getJugadoresSeleccionados() {
    return Array.from(document.querySelectorAll('#playerSelection .player-checkbox:checked'))
        .map(cb => cb.getAttribute('data-nombre'));
}

function inicializarSelectorJugadores(numJugadores, cbCambio) {
    const container = document.getElementById('playerSelection');
    if (!container) return;

    // Asegurarse de que esté visible en todo momento que se invoca
    container.style.display = '';

    let html = `<div class="player-selection-container">
        <p class="selection-instruccion">Seleccioná exactamente <strong>${numJugadores}</strong> jugadores${numJugadores === 2 ? ' para el partido' : ''}:</p>
        <div class="player-list">`;

    if (typeof jugadoresDisponibles !== 'undefined') {
        jugadoresDisponibles.forEach(j => {
            html += `<label class="player-label">
                <input type="checkbox" class="player-checkbox" data-nombre="${j.nombre}" />
                <span class="player-name-text">${j.nombre}</span>
            </label>`;
        });
    }

    html += `</div>
        <p class="selection-count" id="selectionCount">0 / ${numJugadores} seleccionados</p>
    </div>`;

    // Elemento para advertencias usado a veces (ej. simulador)
    html += '<p id="selectionWarning" style="color:#c0392b; font-weight:600; display:none; margin-top:8px;"></p>';

    container.innerHTML = html;

    const checkboxes = Array.from(container.querySelectorAll('.player-checkbox'));
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const checkedCount = checkboxes.filter(c => c.checked).length;

            // Si ya se alcanzó el límite y este se está intentando checkear, deshacer el check
            if (checkedCount > numJugadores) {
                cb.checked = false;
            }

            const currentChecked = checkboxes.filter(c => c.checked);

            // Deshabilitar los no seleccionados si ya se llegó al límite
            checkboxes.forEach(c => {
                if (!c.checked) {
                    c.disabled = currentChecked.length >= numJugadores;
                }
            });

            const countEl = document.getElementById('selectionCount');
            if (countEl) countEl.textContent = `${currentChecked.length} / ${numJugadores} seleccionados`;

            if (cbCambio && typeof cbCambio === 'function') {
                cbCambio(currentChecked);
            }
        });
    });
}
