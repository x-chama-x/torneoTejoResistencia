// Variables para almacenar el historial de enfrentamientos directos
// let enfrentamientosDirectos = {}; // Definido mundialmente en simulador.js
// let partidosDetallados = []; // Definido mundialmente en simulador.js

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
                const torneo = partes[4].trim();
                const fecha = partes[5].trim();
                const fase = partes[6].trim();

                // Parsear marcador
                const [goles1, goles2] = marcador.split('-').map(g => parseInt(g.trim()));

                const partido = {
                    jugador1,
                    jugador2,
                    ganador: resultado === 'G' ? jugador1 : jugador2,
                    perdedor: resultado === 'G' ? jugador2 : jugador1,
                    marcador,
                    goles1,
                    goles2,
                    torneo,
                    fecha,
                    fase
                };

                partidosDetallados.push(partido);

                // Calcular estadísticas del enfrentamiento automáticamente
                const clave = [jugador1, jugador2].sort().join('_vs_');

                if (!enfrentamientosDirectos[clave]) {
                    enfrentamientosDirectos[clave] = {
                        jugadores: [jugador1, jugador2].sort(),
                        victorias: {},
                        goles: {}
                    };
                    // Inicializar para ambos jugadores
                    enfrentamientosDirectos[clave].victorias[jugador1] = 0;
                    enfrentamientosDirectos[clave].victorias[jugador2] = 0;
                    enfrentamientosDirectos[clave].goles[jugador1] = 0;
                    enfrentamientosDirectos[clave].goles[jugador2] = 0;
                }

                // Sumar victoria al ganador
                enfrentamientosDirectos[clave].victorias[partido.ganador]++;

                // Sumar goles a cada jugador
                enfrentamientosDirectos[clave].goles[jugador1] += goles1;
                enfrentamientosDirectos[clave].goles[jugador2] += goles2;
            }
        }

        console.log('✅ Partidos cargados:', partidosDetallados.length);
        console.log('✅ Enfrentamientos calculados:', Object.keys(enfrentamientosDirectos).length);
        return true;
    } catch (error) {
        console.error('❌ Error al cargar historial:', error);
        return false;
    }
}

// Función para obtener los partidos entre dos jugadores específicos
function obtenerPartidosEntreJugadores(nombreJ1, nombreJ2) {
    return partidosDetallados.filter(p =>
        (p.jugador1 === nombreJ1 && p.jugador2 === nombreJ2) ||
        (p.jugador1 === nombreJ2 && p.jugador2 === nombreJ1)
    );
}

// Función para obtener el historial entre dos jugadores
function obtenerHistorialEnfrentamiento(nombreJ1, nombreJ2) {
    const clave = [nombreJ1, nombreJ2].sort().join('_vs_');
    return enfrentamientosDirectos[clave] || null;
}

// Función para mostrar el historial de enfrentamientos
function mostrarHistorial(nombreJ1, nombreJ2) {
    const historialContainer = document.getElementById('historialDirecto');
    const historialContent = document.getElementById('historialContent');

    const historial = obtenerHistorialEnfrentamiento(nombreJ1, nombreJ2);
    const partidos = obtenerPartidosEntreJugadores(nombreJ1, nombreJ2);

    // Tomar los últimos 5 partidos (los más recientes están al final del array)
    const ultimosPartidos = partidos.slice(-5).reverse();

    if (historial || partidos.length > 0) {
        const victoriasJ1 = historial ? (historial.victorias[nombreJ1] || 0) : 0;
        const victoriasJ2 = historial ? (historial.victorias[nombreJ2] || 0) : 0;
        const golesJ1 = historial ? (historial.goles[nombreJ1] || 0) : 0;
        const golesJ2 = historial ? (historial.goles[nombreJ2] || 0) : 0;
        const totalPartidos = victoriasJ1 + victoriasJ2;

        let partidosHTML = '';
        if (ultimosPartidos.length > 0) {
            partidosHTML = `
                <div class="partidos-previos">
                    <h4>📋 Últimos ${ultimosPartidos.length} partido${ultimosPartidos.length > 1 ? 's' : ''}</h4>
                    <div class="partidos-lista">
                        ${ultimosPartidos.map(p => {
                            // Determinar quién es azul y quién es rojo según la selección actual
                            const esJ1Ganador = p.ganador === nombreJ1;
                            const marcadorDisplay = p.jugador1 === nombreJ1 
                                ? p.marcador 
                                : `${p.goles2}-${p.goles1}`;
                            
                            return `
                                <div class="partido-item ${esJ1Ganador ? 'win-j1' : 'win-j2'}">
                                    <div class="partido-resultado">
                                        <span class="jugador-nombre ${esJ1Ganador ? 'ganador' : ''}">${nombreJ1}</span>
                                        <span class="marcador">${marcadorDisplay}</span>
                                        <span class="jugador-nombre ${!esJ1Ganador ? 'ganador' : ''}">${nombreJ2}</span>
                                    </div>
                                    <div class="partido-info">
                                        <span class="torneo">${p.torneo}</span>
                                        <span class="fase">${p.fase}</span>
                                        <span class="fecha">${p.fecha}</span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        historialContent.innerHTML = `
            <div class="historial-stats">
                <div class="historial-player blue">
                    <div class="nombre">${nombreJ1}</div>
                    <div class="victorias">${victoriasJ1}</div>
                    <div class="goles">${golesJ1} goles</div>
                </div>
                <div class="historial-middle">
                    <div class="total-partidos">${totalPartidos}</div>
                    <div class="subtitulo">partidos jugados</div>
                </div>
                <div class="historial-player red">
                    <div class="nombre">${nombreJ2}</div>
                    <div class="victorias">${victoriasJ2}</div>
                    <div class="goles">${golesJ2} goles</div>
                </div>
            </div>
            ${partidosHTML}
        `;
        historialContainer.style.display = 'block';
    } else {
        historialContent.innerHTML = `
            <div class="no-historial">
                No hay historial de enfrentamientos previos entre ${nombreJ1} y ${nombreJ2}
            </div>
        `;
        historialContainer.style.display = 'block';
    }
}

// Función para obtener jugadores seleccionados
function getJugadoresSeleccionados() {
    return Array.from(document.querySelectorAll('#playerSelection .player-checkbox:checked'))
        .map(cb => cb.getAttribute('data-nombre'));
}

// Función para poblar los selectores con jugadores
function poblarSelectores() {
    const container = document.getElementById('playerSelection');
    if (!container) return;

    let html = `<div class="player-selection-container">
        <p class="selection-instruccion">Seleccioná exactamente <strong>2</strong> jugadores para el partido:</p>
        <div class="player-list">`;

    jugadoresDisponibles.forEach(j => {
        html += `<label class="player-label">
            <input type="checkbox" class="player-checkbox" data-nombre="${j.nombre}" />
            <span class="player-name-text">${j.nombre}</span>
        </label>`;
    });

    html += `</div>
        <p class="selection-count" id="selectionCount">0 / 2 seleccionados</p>
    </div>`;

    container.innerHTML = html;

    const checkboxes = Array.from(container.querySelectorAll('.player-checkbox'));
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const checked = checkboxes.filter(c => c.checked);
            if (checked.length > 2) {
                cb.checked = false;
                return;
            }
            const countEl = document.getElementById('selectionCount');
            if (countEl) countEl.textContent = `${checked.length} / 2 seleccionados`;
            actualizarBotones();
        });
    });
}

// Función para obtener jugador por nombre
function obtenerJugadorPorNombre(nombre) {
    return jugadoresDisponibles.find(j => j.nombre === nombre);
}

// Función para calcular la probabilidad de victoria (sin simular, usando la fórmula directa)
function calcularProbabilidad(jugador1, jugador2) {
    // Obtener historial de enfrentamientos
    const historial = obtenerHistorialEnfrentamiento(jugador1.nombre, jugador2.nombre);

    // FÓRMULA LOGÍSTICA (SIGMOIDE) - Base del simulador
    let fuerza1 = (jugador1.ranking * 0.4) + (jugador1.winRate * 100 * 0.6);
    let fuerza2 = (jugador2.ranking * 0.4) + (jugador2.winRate * 100 * 0.6);

    // Ajuste por historial de enfrentamientos directos (si existe)
    if (historial) {
        const totalEnfrentamientos = (historial.victorias[jugador1.nombre] || 0) + (historial.victorias[jugador2.nombre] || 0);

        if (totalEnfrentamientos > 0) {
            const winRateDirecto1 = historial.victorias[jugador1.nombre] / totalEnfrentamientos;
            const winRateDirecto2 = historial.victorias[jugador2.nombre] / totalEnfrentamientos;

            const pesoHistorial = Math.min(0.2, totalEnfrentamientos * 0.02);

            fuerza1 += (winRateDirecto1 - 0.5) * 100 * pesoHistorial;
            fuerza2 += (winRateDirecto2 - 0.5) * 100 * pesoHistorial;
        }
    }

    const diffFuerza = fuerza1 - fuerza2;
    const k = 30;
    const probJ1 = 1 / (1 + Math.exp(-diffFuerza / k));

    return {
        probJ1: (probJ1 * 100).toFixed(1),
        probJ2: ((1 - probJ1) * 100).toFixed(1)
    };
}

// Helpers de probabilidades
function getBarClass(prob) {
    if (prob >= 0.65) return 'alta';
    if (prob >= 0.45) return 'media-alta';
    if (prob >= 0.25) return 'media';
    return 'baja';
}

function pct(prob) {
    return (prob * 100).toFixed(1) + '%';
}

// Función para mostrar la barra de probabilidad con el diseño de playoffs
function mostrarProbabilidad(nombreJ1, nombreJ2) {
    const container = document.getElementById('probabilidadContainer');
    const content = document.getElementById('probabilidadContent');

    const jugador1 = obtenerJugadorPorNombre(nombreJ1);
    const jugador2 = obtenerJugadorPorNombre(nombreJ2);

    if (!jugador1 || !jugador2) {
        container.style.display = 'none';
        return;
    }

    const prob = calcularProbabilidad(jugador1, jugador2);
    const pJ1 = prob.probJ1 / 100;
    const pJ2 = prob.probJ2 / 100;
    const clase1 = getBarClass(pJ1);
    const clase2 = getBarClass(pJ2);

    content.innerHTML = `
        <div class="sf-card" style="margin: 0;">
            <div class="sf-matchup">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <div class="sf-player-info">
                        <span class="sf-player-name">${jugador1.nombre}</span>
                        <span class="sf-ranking-badge">${jugador1.ranking} pts</span>
                    </div>
                    <div class="sf-player-info" style="align-items: flex-end;">
                        <span class="sf-player-name">${jugador2.nombre}</span>
                        <span class="sf-ranking-badge">${jugador2.ranking} pts</span>
                    </div>
                </div>
                <div class="sf-split-bar">
                    <div class="split-segment ${clase1}" style="width:${prob.probJ1}%"></div>
                    <div class="split-segment ${clase2}" style="width:${prob.probJ2}%"></div>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 6px;">
                    <span class="sf-prob-badge ${clase1}">${prob.probJ1}%</span>
                    <span class="sf-prob-badge ${clase2}">${prob.probJ2}%</span>
                </div>
            </div>
        </div>
    `;
    container.style.display = 'block';
}

// Función para actualizar el estado de los botones y mostrar secciones
function actualizarBotones() {
    const seleccionados = getJugadoresSeleccionados();
    const habilitado = seleccionados.length === 2;
    const btnSimular = document.getElementById('simularPartidoBtn');

    if (btnSimular) btnSimular.disabled = !habilitado;

    // Mostrar probabilidad e historial si ambos jugadores están seleccionados
    if (habilitado) {
        const [jugador1, jugador2] = seleccionados;
        mostrarProbabilidad(jugador1, jugador2);
        mostrarHistorial(jugador1, jugador2);
    } else {
        document.getElementById('probabilidadContainer').style.display = 'none';
        document.getElementById('historialDirecto').style.display = 'none';
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // Cargar jugadores desde ranking.txt
    await cargarJugadoresDesdeArchivo();

    // Cargar enfrentamientos directos
    await cargarHistorialCompleto();

    // Poblar selectores
    poblarSelectores();

    // Evento de simular partido ha sido removido
});
