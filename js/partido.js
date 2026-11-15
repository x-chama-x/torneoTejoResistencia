// Variables para almacenar el historial de enfrentamientos directos
// let enfrentamientosDirectos = {}; // Definido mundialmente en simulador.js
// let partidosDetallados = []; // Definido mundialmente en simulador.js
// let maxEnfrentamientosGlobal = 1; // Definido mundialmente en simulador.js

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
        const statsGeneral = {};

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

                if (!statsGeneral[jugador1]) statsGeneral[jugador1] = { pj: 0, g: 0, gf: 0 };
                if (!statsGeneral[jugador2]) statsGeneral[jugador2] = { pj: 0, g: 0, gf: 0 };

                if (!isNaN(goles1) && !isNaN(goles2)) {
                    statsGeneral[jugador1].pj++;
                    statsGeneral[jugador2].pj++;
                    statsGeneral[jugador1].gf += goles1;
                    statsGeneral[jugador2].gf += goles2;

                    if (resultado === 'G') {
                        statsGeneral[jugador1].g++;
                    } else if (resultado === 'P') {
                        statsGeneral[jugador2].g++;
                    }
                }

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

        for (const j of jugadoresDisponibles) {
            const s = statsGeneral[j.nombre];
            if (s && s.pj > 0) {
                j.winRate = s.g / s.pj;
                j.promedioGoles = s.gf / s.pj;
            } else {
                j.winRate = 0;
                j.promedioGoles = 0;
            }
        }

        // Calcular el máximo de enfrentamientos entre cualquier par de jugadores
        maxEnfrentamientosGlobal = 1; // Mínimo 1 para evitar división por cero
        for (const clave in enfrentamientosDirectos) {
            const h = enfrentamientosDirectos[clave];
            const total = Object.values(h.victorias).reduce((a, b) => a + b, 0);
            if (total > maxEnfrentamientosGlobal) {
                maxEnfrentamientosGlobal = total;
            }
        }
        console.log('📊 Máximo de enfrentamientos entre un par de jugadores:', maxEnfrentamientosGlobal);

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

// ---- Cómo se ve un partido (lo usan el cruce y la vista individual) ----

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// "2/8/2026" -> "2 Ago 2026", igual que los Resultados por Fecha del inicio
function fechaCorta(fecha) {
    const partes = String(fecha || '').split('/');
    if (partes.length === 3) {
        const d = parseInt(partes[0], 10);
        const m = parseInt(partes[1], 10) - 1;
        if (m >= 0 && m < 12) return `${d} ${MESES_CORTOS[m]} ${partes[2]}`;
    }
    return fecha;
}

// "Tercer torneo de hockey de mesa" -> "Torneo 3". Con el nombre entero la
// línea de abajo de cada partido se partía en dos o tres. El resto
// (amistosos, Copa) queda igual.
const ORDINALES_TORNEO = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo'];
function torneoCorto(torneo) {
    const primera = String(torneo || '').split(' ')[0].toLowerCase();
    const n = ORDINALES_TORNEO.indexOf(primera);
    return n >= 0 && /torneo/i.test(torneo) ? `Torneo ${n + 1}` : torneo;
}

// Un partido es "histórico" si fue una paliza (5 goles o más de diferencia:
// 7-2, 7-1, 7-0) o si se definió por un solo gol (7-6).
const DIFERENCIA_PALIZA = 5;
function tipoHistorico(p) {
    const dif = Math.abs(p.goles1 - p.goles2);
    if (dif >= DIFERENCIA_PALIZA) return 'paliza';
    if (dif === 1) return 'peleado';
    return null;
}

// Tarjeta de un partido. `izquierda` es el jugador que va a la izquierda: el
// marcador se da vuelta para que sus goles queden de su lado. El escudo va
// pegado al resultado, como en las tablas de Resultados.
//   opciones.sinTorneo -> no muestra el torneo (la vista individual ya lo dice)
//   opciones.compacta  -> versión chica, para la columna de históricos
function tarjetaPartido(p, izquierda, opciones) {
    const op = opciones || {};
    const esJ1 = p.jugador1 === izquierda;
    const derecha = esJ1 ? p.jugador2 : p.jugador1;
    const golesIzq = esJ1 ? p.goles1 : p.goles2;
    const golesDer = esJ1 ? p.goles2 : p.goles1;
    const tipo = tipoHistorico(p);
    const etiqueta = tipo === 'paliza' ? 'Paliza' : tipo === 'peleado' ? 'Peleado' : '';
    const clases = ['partido-item', tipo, op.compacta ? 'compacta' : ''].filter(Boolean).join(' ');
    const torneo = torneoCorto(p.torneo);
    // En los amistosos la fase también dice "Amistoso": no hace falta dos veces
    const fase = !op.sinTorneo && p.fase === p.torneo ? '' : p.fase;

    return `
        <div class="${clases}">
            <div class="partido-resultado">
                <span class="jugador-nombre local">${conEscudo(izquierda, { derecha: true })}</span>
                <span class="marcador">${golesIzq}-${golesDer}</span>
                <span class="jugador-nombre visitante">${conEscudo(derecha)}</span>
            </div>
            <div class="partido-info">
                ${op.sinTorneo ? '' : `<span class="torneo">${torneo}</span>`}
                ${fase ? `<span class="fase">${fase}</span>` : ''}
                <span class="fecha">${fechaCorta(p.fecha)}</span>
                ${etiqueta && !op.compacta ? `<span class="etiqueta-historico ${tipo}">${etiqueta}</span>` : ''}
            </div>
        </div>`;
}

// Función para mostrar el historial de enfrentamientos
//
// Arriba el resumen (victorias y goles de cada uno). Abajo, en dos columnas:
// todos los partidos entre ellos, de a 5 con flechas, y al costado los
// históricos (palizas y peleados). En celular la de históricos va debajo.
const PARTIDOS_POR_TANDA = 5;

function mostrarHistorial(nombreJ1, nombreJ2) {
    const historialContainer = document.getElementById('historialDirecto');
    const historialContent = document.getElementById('historialContent');

    // En orden cronológico: el primero es el más viejo
    const partidos = obtenerPartidosEntreJugadores(nombreJ1, nombreJ2);
    historialContainer.style.display = 'block';

    if (partidos.length === 0) {
        historialContent.innerHTML = `
            <div class="no-historial">
                No hay historial de enfrentamientos previos entre ${nombreJ1} y ${nombreJ2}
            </div>
        `;
        return;
    }

    const historial = obtenerHistorialEnfrentamiento(nombreJ1, nombreJ2);
    const victoriasJ1 = historial ? (historial.victorias[nombreJ1] || 0) : 0;
    const victoriasJ2 = historial ? (historial.victorias[nombreJ2] || 0) : 0;
    const golesJ1 = historial ? (historial.goles[nombreJ1] || 0) : 0;
    const golesJ2 = historial ? (historial.goles[nombreJ2] || 0) : 0;
    const total = partidos.length;

    const resumenJugador = (nombre, victorias, goles) => `
        <div class="historial-player">
            ${escudoImg(nombre, 'escudo-cruce')}
            <div class="nombre">${nombre}</div>
            <div class="victorias">${victorias}</div>
            <div class="victorias-texto">victoria${victorias === 1 ? '' : 's'}</div>
            <div class="goles">${goles} goles</div>
        </div>`;

    // Históricos del cruce. Palizas: la más grande primero; a igual
    // diferencia, la más reciente. Peleados: el más reciente primero.
    const conOrden = partidos.map((p, i) => ({ p, i }));
    const dif = x => Math.abs(x.p.goles1 - x.p.goles2);
    const palizas = conOrden.filter(x => tipoHistorico(x.p) === 'paliza')
        .sort((a, b) => dif(b) - dif(a) || b.i - a.i).map(x => x.p);
    const peleados = conOrden.filter(x => tipoHistorico(x.p) === 'peleado')
        .sort((a, b) => b.i - a.i).map(x => x.p);

    const grupoHistorico = (tipo, titulo, descripcion, lista, vacio) => `
        <div class="historicos-grupo ${tipo}">
            <div class="historicos-titulo">
                <span>${titulo}</span>
                <span class="historicos-cantidad">${lista.length}</span>
            </div>
            <div class="historicos-desc">${descripcion}</div>
            ${lista.length
                ? `<div class="partidos-lista">${lista.map(p => tarjetaPartido(p, nombreJ1, { compacta: true })).join('')}</div>`
                : `<div class="historicos-vacio">${vacio}</div>`}
        </div>`;

    historialContent.innerHTML = `
        <div class="historial-stats">
            ${resumenJugador(nombreJ1, victoriasJ1, golesJ1)}
            <div class="historial-middle">
                <div class="total-partidos">${total}</div>
                <div class="subtitulo">partido${total === 1 ? '' : 's'} jugado${total === 1 ? '' : 's'}</div>
            </div>
            ${resumenJugador(nombreJ2, victoriasJ2, golesJ2)}
        </div>
        <div class="cruce-cuerpo">
            <section class="cruce-todos">
                <h4>Todos los partidos</h4>
                <div id="cruceTandas"></div>
            </section>
            <aside class="cruce-historicos">
                <h4>Partidos históricos</h4>
                ${grupoHistorico('paliza', 'Palizas', `Ganados por ${DIFERENCIA_PALIZA} goles o más`, palizas, 'Ninguna entre ellos todavía')}
                ${grupoHistorico('peleado', 'Peleados', 'Definidos por un solo gol (7-6)', peleados, 'Ninguno entre ellos todavía')}
            </aside>
        </div>
    `;

    // Tandas de a 5, la primera con los más recientes. La flecha izquierda
    // va para atrás en el tiempo, como en los Resultados por Fecha del inicio.
    const recientes = partidos.slice().reverse();
    const tandas = Math.ceil(total / PARTIDOS_POR_TANDA);
    const cont = document.getElementById('cruceTandas');
    let tanda = 0;

    function pintarTanda() {
        const desde = tanda * PARTIDOS_POR_TANDA;
        const lista = recientes.slice(desde, desde + PARTIDOS_POR_TANDA);
        // Número de cada partido contando desde el primero que jugaron
        const hasta = total - desde;
        const primero = hasta - lista.length + 1;
        const rango = primero === hasta
            ? `Partido ${hasta} de ${total}`
            : `Partidos ${primero} a ${hasta} de ${total}`;
        const hayViejos = tanda < tandas - 1;
        const hayNuevos = tanda > 0;

        cont.innerHTML = `
            ${tandas > 1 ? `
            <div class="tanda-nav">
                <button type="button" class="tanda-flecha" id="tandaViejos" ${hayViejos ? '' : 'disabled'}
                        aria-label="Partidos anteriores">&#8592;</button>
                <span class="tanda-rango">${rango}</span>
                <button type="button" class="tanda-flecha" id="tandaNuevos" ${hayNuevos ? '' : 'disabled'}
                        aria-label="Partidos más recientes">&#8594;</button>
            </div>` : ''}
            <div class="partidos-lista">
                ${lista.map(p => tarjetaPartido(p, nombreJ1)).join('')}
            </div>
        `;

        const viejos = document.getElementById('tandaViejos');
        const nuevos = document.getElementById('tandaNuevos');
        if (viejos) viejos.addEventListener('click', () => { if (tanda < tandas - 1) { tanda++; pintarTanda(); } });
        if (nuevos) nuevos.addEventListener('click', () => { if (tanda > 0) { tanda--; pintarTanda(); } });
    }

    pintarTanda();
}

// ---- Vista individual: partidos de un solo jugador filtrados por evento (torneo/amistoso) ----

// Devuelve la lista de eventos disponibles (torneos + "Amistoso"), sin duplicados
function obtenerEventosDisponibles() {
    const eventos = [...new Set(partidosDetallados.map(p => p.torneo))];
    // Los amistosos van al final, los torneos oficiales mantienen su orden cronológico
    eventos.sort((a, b) => {
        if (a === 'Amistoso' && b !== 'Amistoso') return 1;
        if (b === 'Amistoso' && a !== 'Amistoso') return -1;
        return 0;
    });
    return eventos;
}

// Partidos de un jugador dentro de un evento puntual
function obtenerPartidosIndividuales(nombreJugador, evento) {
    return partidosDetallados.filter(p =>
        p.torneo === evento && (p.jugador1 === nombreJugador || p.jugador2 === nombreJugador)
    );
}

// Estadísticas rápidas (PJ, G, P, WR) de un jugador sobre una lista de partidos ya filtrada
function calcularStatsIndividuales(nombreJugador, partidos) {
    let g = 0, p = 0, gf = 0, gc = 0;
    partidos.forEach(partido => {
        const esJugador1 = partido.jugador1 === nombreJugador;
        gf += esJugador1 ? partido.goles1 : partido.goles2;
        gc += esJugador1 ? partido.goles2 : partido.goles1;
        if (partido.ganador === nombreJugador) g++; else p++;
    });
    const pj = partidos.length;
    const wr = pj > 0 ? ((g / pj) * 100).toFixed(1) : '0.0';
    return { pj, g, p, gf, gc, wr };
}

// Pinta el listado de partidos de un jugador dentro del evento seleccionado
function mostrarPartidosIndividuales(nombreJugador, evento) {
    const content = document.getElementById('individualContent');
    if (!content) return;

    // Más recientes primero (el archivo está en orden cronológico ascendente)
    const partidos = obtenerPartidosIndividuales(nombreJugador, evento).slice().reverse();

    if (partidos.length === 0) {
        content.innerHTML = `<div class="no-historial">${nombreJugador} no tiene partidos registrados en "${evento}"</div>`;
        return;
    }

    const stats = calcularStatsIndividuales(nombreJugador, partidos);

    content.innerHTML = `
        <div class="stats-grid-4">
            <div class="stat-item"><div class="stat-label">PJ</div><div class="stat-value">${stats.pj}</div></div>
            <div class="stat-item"><div class="stat-label">Ganados</div><div class="stat-value">${stats.g}</div></div>
            <div class="stat-item"><div class="stat-label">Perdidos</div><div class="stat-value">${stats.p}</div></div>
            <div class="stat-item"><div class="stat-label">WR</div><div class="stat-value">${stats.wr}%</div></div>
        </div>
        <div class="partidos-previos">
            <h4>Partidos en ${evento}</h4>
            <div class="partidos-lista">
                ${partidos.map(p => tarjetaPartido(p, nombreJugador, { sinTorneo: true })).join('')}
            </div>
        </div>
    `;
}

// Pinta los botones de evento (torneos/amistosos) y muestra el primero seleccionado
function mostrarSelectorEventos(nombreJugador) {
    const container = document.getElementById('individualContainer');
    const selectorDiv = document.getElementById('eventoSelector');
    const nameSpan = document.getElementById('individualPlayerName');
    if (!container || !selectorDiv) return;

    const eventos = obtenerEventosDisponibles();

    if (eventos.length === 0) {
        container.style.display = 'none';
        return;
    }

    if (nameSpan) nameSpan.textContent = nombreJugador;

    selectorDiv.innerHTML = eventos.map(ev =>
        `<button type="button" class="evento-btn" data-evento="${ev}">${ev}</button>`
    ).join('');

    const botones = Array.from(selectorDiv.querySelectorAll('.evento-btn'));
    botones.forEach(btn => {
        btn.addEventListener('click', () => {
            botones.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mostrarPartidosIndividuales(nombreJugador, btn.getAttribute('data-evento'));
        });
    });

    // Por defecto mostramos el primer evento de la lista
    botones[0].classList.add('active');
    mostrarPartidosIndividuales(nombreJugador, botones[0].getAttribute('data-evento'));

    container.style.display = 'block';
}

// Función para poblar los selectores con jugadores
function poblarSelectores() {
    inicializarSelectorJugadores(2, () => {
        actualizarBotones();
    });
}

// Función para obtener jugador por nombre
function obtenerJugadorPorNombre(nombre) {
    return jugadoresDisponibles.find(j => j.nombre === nombre);
}

// Función para calcular la probabilidad de victoria (sin simular, usando la fórmula directa)
// La fórmula vive en js/probabilidades.js, que es el único lugar donde se
// toca. Sin el ajuste por campeón defensor: esta pantalla es para cargar un
// partido suelto, que no tiene por qué ser de un torneo.
function calcularProbabilidad(jugador1, jugador2) {
    const probJ1 = probabilidadEntre(
        jugador1,
        jugador2,
        obtenerHistorialEnfrentamiento(jugador1.nombre, jugador2.nombre)
    );

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
        <div class="sf-grid" style="justify-content: center;">
            <div class="sf-card">
                <div class="sf-card-header">Partido</div>
                <div class="sf-matchup">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                        <div class="sf-player-info">
                            <span class="sf-player-name">${conEscudo(jugador1.nombre)}</span>
                        </div>
                        <div class="sf-player-info" style="align-items: flex-end;">
                            <span class="sf-player-name">${conEscudo(jugador2.nombre, { derecha: true })}</span>
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
                <div class="sf-insight">Probabilidad de ganar</div>
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
    const individualContainer = document.getElementById('individualContainer');

    if (btnSimular) btnSimular.disabled = !habilitado;

    if (habilitado) {
        // Dos jugadores seleccionados: enfrentamiento directo
        const [jugador1, jugador2] = seleccionados;
        mostrarProbabilidad(jugador1, jugador2);
        mostrarHistorial(jugador1, jugador2);
        if (individualContainer) individualContainer.style.display = 'none';
    } else if (seleccionados.length === 1) {
        // Un solo jugador seleccionado: vista de partidos individuales por evento
        document.getElementById('probabilidadContainer').style.display = 'none';
        document.getElementById('historialDirecto').style.display = 'none';
        mostrarSelectorEventos(seleccionados[0]);
    } else {
        document.getElementById('probabilidadContainer').style.display = 'none';
        document.getElementById('historialDirecto').style.display = 'none';
        if (individualContainer) individualContainer.style.display = 'none';
    }
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // Cargar jugadores y ranking FIFA (calculado desde enfrentamientos_directos.txt)
    await cargarJugadoresDesdeArchivo();

    // Cargar enfrentamientos directos
    await cargarHistorialCompleto();

    // Poblar selectores
    poblarSelectores();

    // Evento de simular partido ha sido removido
});
