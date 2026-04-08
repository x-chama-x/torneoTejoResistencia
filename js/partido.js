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

// Función para simular un partido con el historial de enfrentamientos
function simularPartidoConHistorial(jugador1, jugador2) {
    // Obtener historial de enfrentamientos
    const historial = obtenerHistorialEnfrentamiento(jugador1.nombre, jugador2.nombre);

    // FÓRMULA LOGÍSTICA (SIGMOIDE) - Base del simulador
    // Factor de fuerza combinado: 40% ranking + 60% winRate
    let fuerza1 = (jugador1.ranking * 0.4) + (jugador1.winRate * 100 * 0.6);
    let fuerza2 = (jugador2.ranking * 0.4) + (jugador2.winRate * 100 * 0.6);

    // Ajuste por historial de enfrentamientos directos (si existe)
    if (historial) {
        const totalEnfrentamientos = historial.victorias[jugador1.nombre] + historial.victorias[jugador2.nombre];

        if (totalEnfrentamientos > 0) {
            // Calcular winrate del enfrentamiento directo
            const winRateDirecto1 = historial.victorias[jugador1.nombre] / totalEnfrentamientos;
            const winRateDirecto2 = historial.victorias[jugador2.nombre] / totalEnfrentamientos;

            // El historial directo tiene un peso del 20% adicional
            // Esto afecta la fuerza de cada jugador
            const pesoHistorial = Math.min(0.2, totalEnfrentamientos * 0.02); // Máximo 20%, más partidos = más peso

            const ajusteHistorial1 = (winRateDirecto1 - 0.5) * 100 * pesoHistorial;
            const ajusteHistorial2 = (winRateDirecto2 - 0.5) * 100 * pesoHistorial;

            fuerza1 += ajusteHistorial1;
            fuerza2 += ajusteHistorial2;

            console.log(`📊 Historial aplicado: ${jugador1.nombre} (${historial.victorias[jugador1.nombre]} victorias) vs ${jugador2.nombre} (${historial.victorias[jugador2.nombre]} victorias)`);
            console.log(`   Ajuste: ${jugador1.nombre} +${ajusteHistorial1.toFixed(2)}, ${jugador2.nombre} +${ajusteHistorial2.toFixed(2)}`);
        }
    }

    // Diferencia de fuerza
    const diffFuerza = fuerza1 - fuerza2;

    // Función sigmoide: prob = 1 / (1 + e^(-x/k))
    const k = 30;
    const probFinal = 1 / (1 + Math.exp(-diffFuerza / k));

    const gana1 = Math.random() < probFinal;

    let goles1, goles2;

    // Calcular diferencia de goles basada en promedioGoles
    const promGanador = gana1 ? jugador1.promedioGoles : jugador2.promedioGoles;
    const promPerdedor = gana1 ? jugador2.promedioGoles : jugador1.promedioGoles;

    const diffPromedio = promGanador - promPerdedor;
    const bonusDiff = Math.max(0, Math.min(2, diffPromedio));
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
        resultado: `${goles1}-${goles2}`,
        probabilidadJ1: probFinal
    };
}

// Función para mostrar el resultado del partido
function mostrarResultadoPartido(jugador1, jugador2, resultado) {
    const resultadoDiv = document.getElementById('resultado');

    resultadoDiv.innerHTML = `
        <div class="resultado-partido">
            <div class="match-header">🏆 Resultado del Partido</div>
            <div class="players-display">
                <span class="player-name blue">${jugador1.nombre}</span>
                <span style="font-size: 1.5em; color: #666;">vs</span>
                <span class="player-name red">${jugador2.nombre}</span>
            </div>
            <div class="score-display">${resultado.goles1} - ${resultado.goles2}</div>
            <div class="winner-announcement">🏆 ¡${resultado.ganador} gana!</div>
        </div>
    `;
}


// Función para poblar los selectores con jugadores
function poblarSelectores() {
    const select1 = document.getElementById('jugador1');
    const select2 = document.getElementById('jugador2');

    // Limpiar opciones existentes
    select1.innerHTML = '<option value="">Seleccionar jugador...</option>';
    select2.innerHTML = '<option value="">Seleccionar jugador...</option>';

    // Agregar jugadores
    jugadoresDisponibles.forEach(jugador => {
        select1.innerHTML += `<option value="${jugador.nombre}">${jugador.nombre} (${jugador.ranking} pts)</option>`;
        select2.innerHTML += `<option value="${jugador.nombre}">${jugador.nombre} (${jugador.ranking} pts)</option>`;
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

// Función para mostrar la barra de probabilidad
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

    content.innerHTML = `
        <div class="probabilidad-barra-container">
            <div class="probabilidad-labels">
                <span class="prob-label blue">🔵 ${nombreJ1}</span>
                <span class="prob-label red">🔴 ${nombreJ2}</span>
            </div>
            <div class="probabilidad-barra">
                <div class="prob-fill blue" style="width: ${prob.probJ1}%;">
                    <span class="prob-percent">${prob.probJ1}%</span>
                </div>
                <div class="prob-fill red" style="width: ${prob.probJ2}%;">
                    <span class="prob-percent">${prob.probJ2}%</span>
                </div>
            </div>
            <div class="favorito-label">
                ⭐ Favorito: <strong>${parseFloat(prob.probJ1) > parseFloat(prob.probJ2) ? nombreJ1 : nombreJ2}</strong>
            </div>
        </div>
    `;
    container.style.display = 'block';
}

// Función para actualizar el estado de los botones
function actualizarBotones() {
    const jugador1 = document.getElementById('jugador1').value;
    const jugador2 = document.getElementById('jugador2').value;
    const btnSimular = document.getElementById('simularPartidoBtn');

    const habilitado = jugador1 && jugador2 && jugador1 !== jugador2;
    btnSimular.disabled = !habilitado;

    // Mostrar probabilidad e historial si ambos jugadores están seleccionados
    if (habilitado) {
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

    // Eventos de cambio en selectores
    document.getElementById('jugador1').addEventListener('change', () => {
        actualizarBotones();
        // Limpiar resultados anteriores
        document.getElementById('resultado').innerHTML = '';
    });

    document.getElementById('jugador2').addEventListener('change', () => {
        actualizarBotones();
        // Limpiar resultados anteriores
        document.getElementById('resultado').innerHTML = '';
    });

    // Evento de simular partido
    document.getElementById('simularPartidoBtn').addEventListener('click', () => {
        const nombreJ1 = document.getElementById('jugador1').value;
        const nombreJ2 = document.getElementById('jugador2').value;

        // Ocultar controles y selección de jugadores, dejando solo los nav-links
        const controls = document.querySelector('.controls');
        if (controls) {
            Array.from(controls.children).forEach(child => {
                if (!child.classList.contains('nav-links')) {
                    child.style.display = 'none';
                }
            });
        }

        const jugador1 = obtenerJugadorPorNombre(nombreJ1);
        const jugador2 = obtenerJugadorPorNombre(nombreJ2);

        if (jugador1 && jugador2) {
            const resultado = simularPartidoConHistorial(jugador1, jugador2);
            mostrarResultadoPartido(jugador1, jugador2, resultado);
        }
    });
});
