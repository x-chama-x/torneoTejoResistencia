// Variables globales para los jugadores (ranking calculado desde enfrentamientos_directos.txt)
let jugadoresBase = [];
let nuevosJugadores = [];
let jugadoresDisponibles = [];

// Variables para almacenar el historial de enfrentamientos directos
let enfrentamientosDirectos = {};
let partidosDetallados = [];
let maxEnfrentamientosGlobal = 1; // Máximo de partidos entre cualquier par de jugadores

// Variable global para la configuración manual de grupos
window.gruposManualConfig = null; // { grupoA: [...], grupoB: [...], grupoC: [...] }

// Función para calcular los jugadores y su ranking FIFA a partir del historial de partidos
async function cargarJugadoresDesdeArchivo() {
    try {
        const rankingCalculado = await cargarRankingCalculado();

        // Validar que se hayan calculado jugadores
        if (rankingCalculado.length === 0) {
            throw new Error('No hay partidos en enfrentamientos_directos.txt para calcular el ranking');
        }

        const jugadores = rankingCalculado.map(r => ({
            nombre: r.nombre,
            ranking: r.ranking,
            winRate: 0,
            promedioGoles: 0
        }));

        // Los primeros 8 son jugadoresBase, el resto son nuevosJugadores
        jugadoresBase = jugadores.slice(0, 8);
        nuevosJugadores = jugadores.slice(8);
        jugadoresDisponibles = [...jugadores];

        console.log('✅ Ranking FIFA calculado desde enfrentamientos_directos.txt:', jugadoresDisponibles);
        return true;
    } catch (error) {
        console.error('❌ Error al calcular el ranking FIFA:', error);
        alert('Error: No se pudo calcular el ranking FIFA desde enfrentamientos_directos.txt. Verificá que el archivo exista y tenga el formato correcto.');
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
        const statsGeneral = {}; // Para calcular winRate y promedioGoles globales

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
                const resultado = partes[2].trim(); // G o P para jugador1 (E si empate)
                const marcador = partes[3].trim();
                const [goles1Str, goles2Str] = marcador.split('-');
                const goles1 = parseInt(goles1Str.trim());
                const goles2 = parseInt(goles2Str.trim());

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

                const ganador = resultado === 'G' ? jugador1 : (resultado === 'P' ? jugador2 : null);

                const partido = {
                    jugador1,
                    jugador2,
                    ganador,
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
                if (ganador) {
                    enfrentamientosDirectos[clave].victorias[ganador]++;
                }
            }
        }

        // Asignar el winRate y promedioGoles a cada jugador
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
        // Actualizar jugadoresBase y nuevosJugadores si cambiaron
        jugadoresBase.forEach(j => {
            const s = statsGeneral[j.nombre];
            if (s && s.pj > 0) { j.winRate = s.g / s.pj; j.promedioGoles = s.gf / s.pj; }
        });
        nuevosJugadores.forEach(j => {
            const s = statsGeneral[j.nombre];
            if (s && s.pj > 0) { j.winRate = s.g / s.pj; j.promedioGoles = s.gf / s.pj; }
        });

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
    // La fórmula (40% ranking + 60% winRate, ajuste por mano a mano y
    // sigmoide) vive en js/probabilidades.js, que es el único lugar donde se
    // toca, con la suavidad de PROB_K. Lo único propio del Simulador es el
    // ajuste por campeón defensor de js/campeon.js.
    //
    // Con PROB_K = 60 la curva es la misma que muestran las páginas de datos:
    // - Diferencia 0 → 50%
    // - Diferencia 20 → 58%
    // - Diferencia 40 → 66%
    // - Diferencia 60 → 73%
    // - Diferencia 80 → 79%
    const probFinal = probabilidadEntre(
        jugador1,
        jugador2,
        obtenerHistorialEnfrentamiento(jugador1.nombre, jugador2.nombre),
        { campeon: true }
    );

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

// --- Helper para la calibración de la maldición del campeón (js/campeon.js) ---
// Simula un round-robin y devuelve el ranking (1°..n°) sin efectos secundarios.
// Se inyecta como callback `simGrupo` en calibrarSiCorresponde()/calibrarPesoCampeon().
function simGrupoBicampeon(jugadoresGrupo) {
    const stats = {};
    jugadoresGrupo.forEach(j => { stats[j.nombre] = { pg: 0, pp: 0, gf: 0, gc: 0, pts: 0 }; });
    for (let i = 0; i < jugadoresGrupo.length; i++) {
        for (let j = i + 1; j < jugadoresGrupo.length; j++) {
            const r = simularPartido(jugadoresGrupo[i], jugadoresGrupo[j]);
            const a = jugadoresGrupo[i].nombre, b = jugadoresGrupo[j].nombre;
            stats[a].gf += r.goles1; stats[a].gc += r.goles2;
            stats[b].gf += r.goles2; stats[b].gc += r.goles1;
            if (r.ganador === a) {
                stats[a].pg++; stats[b].pp++; stats[a].pts += r.goles1; stats[b].pts += r.goles2;
            } else {
                stats[b].pg++; stats[a].pp++; stats[b].pts += r.goles2; stats[a].pts += r.goles1;
            }
        }
    }
    return Object.entries(stats)
        .sort((x, y) => y[1].pts - x[1].pts || y[1].pg - x[1].pg || (y[1].gf - y[1].gc) - (x[1].gf - x[1].gc))
        .map((e, i) => ({ pos: i + 1, nombre: e[0], ...e[1] }));
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
                    estadisticasGlobales[jugadoresGrupo[i].nombre].gc += resultado.goles2;
                    estadisticasGlobales[jugadoresGrupo[i].nombre].partidosJugados++;
                    if (resultado.ganador === jugadoresGrupo[i].nombre) estadisticasGlobales[jugadoresGrupo[i].nombre].pg++;
                    else estadisticasGlobales[jugadoresGrupo[i].nombre].pp++;
                }
                if (estadisticasGlobales[jugadoresGrupo[j].nombre]) {
                    estadisticasGlobales[jugadoresGrupo[j].nombre].golesLiga += resultado.goles2;
                    estadisticasGlobales[jugadoresGrupo[j].nombre].gc += resultado.goles1;
                    estadisticasGlobales[jugadoresGrupo[j].nombre].partidosJugados++;
                    if (resultado.ganador === jugadoresGrupo[j].nombre) estadisticasGlobales[jugadoresGrupo[j].nombre].pg++;
                    else estadisticasGlobales[jugadoresGrupo[j].nombre].pp++;
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

// ===============================================
// LÓGICA COMPARTIDA ENTRE LA SIMULACIÓN ÚNICA Y
// LA SIMULACIÓN MONTE CARLO (10.000 torneos)
// ===============================================

// Resuelve el objeto jugador completo (ranking/winRate/promedioGoles) a partir de un nombre.
// Las filas de las tablas de posiciones NO sirven para simular: sin estos campos
// simularPartido() devuelve NaN.
function resolverJugador(nombre, jugadores) {
    return (jugadores && jugadores.find(j => j.nombre === nombre))
        || jugadoresDisponibles.find(j => j.nombre === nombre)
        || { nombre: nombre, ranking: 50, winRate: 0.5, promedioGoles: 5 };
}

// Convierte filas de ranking (2°/3° puestos) en candidatos con su objeto jugador resuelto.
function construirCandidatos(filasRanking, jugadores) {
    return filasRanking.map(f => ({
        nombre: f.nombre,
        grupo: f.grupo,
        data: resolverJugador(f.nombre, jugadores)
    }));
}

// Mini-liga (todos contra todos) usada en los repechajes de 2° y 3° puestos.
function simularMiniLiga(candidatos, estadisticasGlobales = null) {
    const stats = {};
    candidatos.forEach(c => {
        stats[c.nombre] = { pj: 0, pg: 0, pp: 0, gf: 0, gc: 0, pts: 0, grupo: c.grupo };
    });

    const partidos = [];
    for (let i = 0; i < candidatos.length; i++) {
        for (let j = i + 1; j < candidatos.length; j++) {
            const j1 = candidatos[i].data;
            const j2 = candidatos[j].data;
            const resultadoMini = simularPartido(j1, j2);

            partidos.push({
                azul: j1.nombre,
                rojo: j2.nombre,
                golesAzul: resultadoMini.goles1,
                golesRojo: resultadoMini.goles2,
                ganador: resultadoMini.ganador
            });

            stats[j1.nombre].pj++;
            stats[j2.nombre].pj++;
            stats[j1.nombre].gf += resultadoMini.goles1;
            stats[j1.nombre].gc += resultadoMini.goles2;
            stats[j2.nombre].gf += resultadoMini.goles2;
            stats[j2.nombre].gc += resultadoMini.goles1;

            if (estadisticasGlobales) {
                if (estadisticasGlobales[j1.nombre]) {
                    estadisticasGlobales[j1.nombre].golesLiga += resultadoMini.goles1;
                    estadisticasGlobales[j1.nombre].gc += resultadoMini.goles2;
                    estadisticasGlobales[j1.nombre].partidosJugados++;
                    if (resultadoMini.ganador === j1.nombre) estadisticasGlobales[j1.nombre].pg++;
                    else estadisticasGlobales[j1.nombre].pp++;
                }
                if (estadisticasGlobales[j2.nombre]) {
                    estadisticasGlobales[j2.nombre].golesLiga += resultadoMini.goles2;
                    estadisticasGlobales[j2.nombre].gc += resultadoMini.goles1;
                    estadisticasGlobales[j2.nombre].partidosJugados++;
                    if (resultadoMini.ganador === j2.nombre) estadisticasGlobales[j2.nombre].pg++;
                    else estadisticasGlobales[j2.nombre].pp++;
                }
            }

            if (resultadoMini.ganador === j1.nombre) {
                stats[j1.nombre].pg++;
                stats[j2.nombre].pp++;
                stats[j1.nombre].pts += resultadoMini.goles1;
                stats[j2.nombre].pts += resultadoMini.goles2;
            } else {
                stats[j2.nombre].pg++;
                stats[j1.nombre].pp++;
                stats[j2.nombre].pts += resultadoMini.goles2;
                stats[j1.nombre].pts += resultadoMini.goles1;
            }
        }
    }

    const ranking = Object.entries(stats)
        .map(entry => ({ nombre: entry[0], ...entry[1] }))
        .sort((a, b) => b.pts - a.pts || b.pg - a.pg || (b.gf - b.gc) - (a.gf - a.gc));

    return { partidos, ranking };
}

// Resuelve el 4° clasificado del formato de 9 jugadores: 1° del repechaje de 2°
// contra 1° del repechaje de 3°.
function simularPrePlayoff(primeroSegundos, primeroTerceros, jugadores, estadisticasJugadores) {
    const dataSegundos = resolverJugador(primeroSegundos.nombre, jugadores);
    const dataTerceros = resolverJugador(primeroTerceros.nombre, jugadores);

    const repechajePre = simularPartido(dataSegundos, dataTerceros);

    if (estadisticasJugadores[primeroSegundos.nombre]) {
        estadisticasJugadores[primeroSegundos.nombre].golesFaseFinal += repechajePre.goles1;
        estadisticasJugadores[primeroSegundos.nombre].gc += repechajePre.goles2;
        estadisticasJugadores[primeroSegundos.nombre].partidosJugados++;
        if (repechajePre.ganador === primeroSegundos.nombre) estadisticasJugadores[primeroSegundos.nombre].pg++;
        else estadisticasJugadores[primeroSegundos.nombre].pp++;
    }
    if (estadisticasJugadores[primeroTerceros.nombre]) {
        estadisticasJugadores[primeroTerceros.nombre].golesFaseFinal += repechajePre.goles2;
        estadisticasJugadores[primeroTerceros.nombre].gc += repechajePre.goles1;
        estadisticasJugadores[primeroTerceros.nombre].partidosJugados++;
        if (repechajePre.ganador === primeroTerceros.nombre) estadisticasJugadores[primeroTerceros.nombre].pg++;
        else estadisticasJugadores[primeroTerceros.nombre].pp++;
    }

    const cuartoClasificado = repechajePre.ganador === dataSegundos.nombre ? primeroSegundos : primeroTerceros;

    return {
        match: { data: repechajePre, j1: primeroSegundos.nombre, j2: primeroTerceros.nombre },
        cuartoClasificado
    };
}

// Simula la fase final completa (semifinales, tercer puesto y final) a partir de
// los 4 clasificados. Devuelve todo lo necesario para renderizar el bracket.
function simularPlayoffs(clasificados, jugadores, estadisticasJugadores) {
    // Semifinales (sorteo aleatorio de clasificados)
    const semifinalistas = [...clasificados].sort(() => Math.random() - 0.5);

    const sf1Jugador1 = resolverJugador(semifinalistas[0].nombre, jugadores);
    const sf1Jugador2 = resolverJugador(semifinalistas[1].nombre, jugadores);
    const sf2Jugador1 = resolverJugador(semifinalistas[2].nombre, jugadores);
    const sf2Jugador2 = resolverJugador(semifinalistas[3].nombre, jugadores);

    // Establecer etapa 'semifinal' para aplicar bonus correcto del bicampeonato
    if (typeof establecerEtapaBicampeon === 'function') {
        establecerEtapaBicampeon('semifinal');
    }
    const sf1 = simularPartido(sf1Jugador1, sf1Jugador2);
    const sf2 = simularPartido(sf2Jugador1, sf2Jugador2);

    // Helper local para acumular estadísticas de fase final
    const acumular = (nombre, gf, gc, ganador) => {
        const st = estadisticasJugadores[nombre];
        if (!st) return;
        st.golesFaseFinal += gf;
        st.gc += gc;
        st.partidosJugados++;
        if (ganador === nombre) st.pg++; else st.pp++;
    };

    acumular(semifinalistas[0].nombre, sf1.goles1, sf1.goles2, sf1.ganador);
    acumular(semifinalistas[1].nombre, sf1.goles2, sf1.goles1, sf1.ganador);
    acumular(semifinalistas[2].nombre, sf2.goles1, sf2.goles2, sf2.ganador);
    acumular(semifinalistas[3].nombre, sf2.goles2, sf2.goles1, sf2.ganador);

    // Tercer Puesto
    const perdedorSF1 = sf1.ganador === semifinalistas[0].nombre ? semifinalistas[1].nombre : semifinalistas[0].nombre;
    const perdedorSF2 = sf2.ganador === semifinalistas[2].nombre ? semifinalistas[3].nombre : semifinalistas[2].nombre;

    // Tercer puesto no recibe bonus (no es campeonable en bicampeonato)
    if (typeof establecerEtapaBicampeon === 'function') {
        establecerEtapaBicampeon('ninguna');
    }
    const tercerPuesto = simularPartido(resolverJugador(perdedorSF1, jugadores), resolverJugador(perdedorSF2, jugadores));

    acumular(perdedorSF1, tercerPuesto.goles1, tercerPuesto.goles2, tercerPuesto.ganador);
    acumular(perdedorSF2, tercerPuesto.goles2, tercerPuesto.goles1, tercerPuesto.ganador);

    // Establecer etapa 'final' para aplicar máximo bonus del bicampeonato
    if (typeof establecerEtapaBicampeon === 'function') {
        establecerEtapaBicampeon('final');
    }
    const final = simularPartido(resolverJugador(sf1.ganador, jugadores), resolverJugador(sf2.ganador, jugadores));

    acumular(sf1.ganador, final.goles1, final.goles2, final.ganador);
    acumular(sf2.ganador, final.goles2, final.goles1, final.ganador);

    return { semifinalistas, sf1, sf2, tercerPuesto, perdedorSF1, perdedorSF2, final };
}

// Genera el HTML del bracket de playoffs (idéntico para simulación única y Monte Carlo)
function renderPlayoffsHTML(playoffs, numJugadores, repechajePreMatch) {
    const { semifinalistas, sf1, sf2, tercerPuesto, perdedorSF1, perdedorSF2, final } = playoffs;

    let html = `
        <div class="panel playoffs-section" style="margin-bottom: 2rem;">
            <h2>👑 Playoffs</h2><br>
            <div class="playoff-bracket" id="sim-playoff-bracket">
                <div class="bracket-fixture">
                    <div class="bracket-col-semis">
                        <h3 class="round-title">⚔️ Semifinales</h3>
                        <div id="sim-sf1-wrap">
                            ${createMatchCardSimulador(sf1.ganador, semifinalistas[0].nombre, semifinalistas[1].nombre, sf1.goles1, sf1.goles2, "Semifinal 1")}
                        </div>
                        <div id="sim-sf2-wrap">
                            ${createMatchCardSimulador(sf2.ganador, semifinalistas[2].nombre, semifinalistas[3].nombre, sf2.goles1, sf2.goles2, "Semifinal 2")}
                        </div>
                    </div>
                    <div class="bracket-connector-col" id="sim-bracket-connector-col">
                        <svg id="sim-bracket-svg" style="width:100%; height:100%; display:block; overflow:visible;"></svg>
                    </div>
                    <div class="bracket-col-final">
                        <h3 class="round-title">👑 Final</h3>
                        <div id="sim-final-wrap">
                            ${createMatchCardSimulador(final.ganador, sf1.ganador, sf2.ganador, final.goles1, final.goles2, "Gran Final")}
                        </div>
                    </div>
                </div>
            </div>`;

    if (numJugadores === 9 && repechajePreMatch) {
        html += `<div class="extra-matches-container" style="display: flex; justify-content: center; gap: 2rem; margin-top: 1rem; flex-wrap: wrap;">`;
        // Pre-Playoffs
        html += `<div id="pre-playoff-container" style="text-align: center; flex: 1; min-width: 0; box-sizing: border-box;">
                <h3 style="margin-bottom: 1rem; color:#e67e22; text-align: center;">⚔️ Pre-Playoffs</h3>
                <div style="display: flex; justify-content: center;">
                ${createMatchCardSimulador(repechajePreMatch.data.ganador, repechajePreMatch.j1, repechajePreMatch.j2, repechajePreMatch.data.goles1, repechajePreMatch.data.goles2, "Repechaje")}
                </div>
            </div>`;
        // Tercer Puesto
        html += `<div id="tercer-puesto-container" style="text-align: center; flex: 1; min-width: 0; box-sizing: border-box;">
                <h3 style="margin-bottom: 1rem; color:#f39c12; text-align: center;">🥉 Tercer Puesto</h3>
                <div style="display: flex; justify-content: center;">
                ${createMatchCardSimulador(tercerPuesto.ganador, perdedorSF1, perdedorSF2, tercerPuesto.goles1, tercerPuesto.goles2, "Tercer Puesto")}
                </div>
            </div>`;
        html += `</div>`;
    } else if (tercerPuesto) {
        // Mostrar sección de tercer puesto normal
        html += `<div id="tercer-puesto-container" style="margin-top: 1rem; text-align: center;">
                <h3 style="margin-bottom: 1rem; color:#f39c12; text-align: center;">🥉 Tercer Puesto</h3>
                <div style="display: flex; justify-content: center;">
                    ${createMatchCardSimulador(tercerPuesto.ganador, perdedorSF1, perdedorSF2, tercerPuesto.goles1, tercerPuesto.goles2, "Tercer Puesto")}
                </div>
            </div>`;
    }

    html += `</div>`;
    return html;
}

// Genera el HTML de la tabla de estadísticas del torneo
function renderEstadisticasHTML(estadisticasJugadores, numJugadores, soloFaseFinal = false) {
    let htmlStats = '<h2>📊 ESTADÍSTICAS DEL TORNEO</h2><br>';
    htmlStats += '<div class="table-responsive"><table class="ranking-table densa-max">';
    const groupLabel = (numJugadores === 7 || numJugadores === 6) ? "G(FL)" : "G(FG)";
    htmlStats += `
        <thead>
            <tr>
                <th>Jugador</th>
                ${soloFaseFinal ? '' : `<th>${groupLabel}</th>`}
                <th>${soloFaseFinal ? 'Goles' : 'G(PO)'}</th>
                <th>TG</th>
                <th>GC</th>
                <th>DIF</th>
                <th>PJ</th>
                <th>PG</th>
                <th>PP</th>
                <th>Prom TG/PJ</th>
            </tr>
        </thead>
        <tbody>`;

    // Convertir estadísticas a array y ordenar por promedio TG/PJ (descendente)
    const statsArray = Object.entries(estadisticasJugadores).map(([nombre, stats]) => {
        const totalGoles = stats.golesLiga + stats.golesFaseFinal;
        return {
            nombre,
            golesLiga: stats.golesLiga,
            golesFaseFinal: stats.golesFaseFinal,
            totalGoles: totalGoles,
            gc: stats.gc,
            dif: totalGoles - stats.gc,
            partidosJugados: stats.partidosJugados,
            pg: stats.pg,
            pp: stats.pp,
            promedio: stats.partidosJugados > 0 ? (totalGoles / stats.partidosJugados) : 0,
            promedioStr: stats.partidosJugados > 0 ? (totalGoles / stats.partidosJugados).toFixed(2) : '0.00'
        };
    }).sort((a, b) => b.promedio - a.promedio || b.totalGoles - a.totalGoles || b.dif - a.dif);

    statsArray.forEach(stat => {
        htmlStats += `
            <tr>
                <td><strong>${stat.nombre}</strong></td>
                ${soloFaseFinal ? '' : `<td>${stat.golesLiga}</td>`}
                <td>${stat.golesFaseFinal}</td>
                <td><strong>${stat.totalGoles}</strong></td>
                <td>${stat.gc}</td>
                <td>${stat.dif > 0 ? '+' : ''}${stat.dif}</td>
                <td>${stat.partidosJugados}</td>
                <td>${stat.pg}</td>
                <td>${stat.pp}</td>
                <td><strong>${stat.promedioStr}</strong></td>
            </tr>`;
    });

    htmlStats += '</tbody></table></div>';

    if (statsArray.length === 0) return htmlStats;

    // Texto informativo sobre el goleador (maneja empates)
    const mejorPromedio = statsArray[0].promedio;
    const goleadores = statsArray.filter(stat => stat.promedio === mejorPromedio);

    htmlStats += `<div style="text-align: center; margin-top: 20px; padding: 15px; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">`;

    if (goleadores.length === 1) {
        // Un solo goleador
        htmlStats += `<p style="margin: 0; font-size: 18px; font-weight: bold; color: #000;">
            <strong style="color: #1a56db;">${goleadores[0].nombre}</strong> es el goleador del torneo con un promedio de <strong style="color: #1a56db;">${goleadores[0].promedioStr}</strong> goles por partido
        </p>`;
    } else {
        // Empate: múltiples goleadores
        const nombresGoleadores = goleadores.map(g => `<strong style="color: #1a56db;">${g.nombre}</strong>`).join(', ').replace(/,([^,]*)$/, ' y$1');
        htmlStats += `<p style="margin: 0; font-size: 18px; font-weight: bold; color: #000;">
            ⚽ ${nombresGoleadores} son los goleadores del torneo con un promedio de <strong style="color: #1a56db;">${goleadores[0].promedioStr}</strong> goles por partido
        </p>`;
    }

    htmlStats += `<p style="margin: 5px 0 0 0; font-size: 14px; color: #333; font-style: italic;">
            El goleador del torneo es el jugador con el mejor promedio de goles
        </p>
    </div>`;

    return htmlStats;
}

function drawSimBracketLines() {
    const sf1El = document.getElementById("sim-sf1-wrap");
    const sf2El = document.getElementById("sim-sf2-wrap");
    const finalEl = document.getElementById("sim-final-wrap");
    const connEl = document.getElementById("sim-bracket-connector-col");
    const svg = document.getElementById("sim-bracket-svg");

    if (!sf1El || !sf2El || !finalEl || !connEl || !svg) return;

    const sf1Card = sf1El.querySelector('.match-card');
    const sf2Card = sf2El.querySelector('.match-card');
    const finalCard = finalEl.querySelector('.match-card');

    if (!sf1Card || !sf2Card || !finalCard) return;

    const connRect = connEl.getBoundingClientRect();
    const sf1CardRect = sf1Card.getBoundingClientRect();
    const sf2CardRect = sf2Card.getBoundingClientRect();
    const finalCardRect = finalCard.getBoundingClientRect();

    const sf1Mid = (sf1CardRect.top + sf1CardRect.bottom) / 2 - connRect.top;
    const sf2Mid = (sf2CardRect.top + sf2CardRect.bottom) / 2 - connRect.top;
    const finalMid = (finalCardRect.top + finalCardRect.bottom) / 2 - connRect.top;
    const w = connRect.width;
    const h = connRect.height;

    const leftX1 = sf1CardRect.right - connRect.left;
    const leftX2 = sf2CardRect.right - connRect.left;
    const rightX = finalCardRect.left - connRect.left;

    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);

    svg.innerHTML = `
        <line x1="${leftX1.toFixed(1)}" y1="${sf1Mid.toFixed(1)}" x2="${(w/2).toFixed(1)}" y2="${sf1Mid.toFixed(1)}" stroke="#58a6ff" stroke-width="2" stroke-linecap="round"/>
        <line x1="${(w/2).toFixed(1)}" y1="${sf1Mid.toFixed(1)}" x2="${(w/2).toFixed(1)}" y2="${sf2Mid.toFixed(1)}" stroke="#58a6ff" stroke-width="2" stroke-linecap="round"/>
        <line x1="${leftX2.toFixed(1)}" y1="${sf2Mid.toFixed(1)}" x2="${(w/2).toFixed(1)}" y2="${sf2Mid.toFixed(1)}" stroke="#58a6ff" stroke-width="2" stroke-linecap="round"/>
        <line x1="${(w/2).toFixed(1)}" y1="${finalMid.toFixed(1)}" x2="${rightX.toFixed(1)}" y2="${finalMid.toFixed(1)}" stroke="#58a6ff" stroke-width="2" stroke-linecap="round"/>
    `;
}

function renderGrupoUIX(partidos, rankingGrupo, clasifCount) {
    let out = '<div class="home-container" style="margin-bottom:2rem;">';
    out += '<div><h4 style="margin-bottom: 1rem; text-align: center; color: #eff0f3;">Posiciones</h4>';
    out += '<div class="table-responsive"><table class="ranking-table densa">';
    out += '<thead><tr><th>#</th><th>Jugador</th><th>PJ</th><th>PG</th><th>PP</th><th>GF</th><th>GC</th><th>DIF</th><th>PTS</th></tr></thead><tbody>';
    rankingGrupo.forEach((r, idx) => {
        out += `<tr ${idx < clasifCount ? 'style="background: rgba(46, 160, 67, 0.15);"' : ''}>
            <td>${idx + 1}</td>
            <td><strong>${r.nombre}</strong></td>
            <td>${r.pj}</td>
            <td>${r.pg}</td>
            <td>${r.pp}</td>
            <td>${r.gf}</td>
            <td>${r.gc}</td>
            <td>${r.gf - r.gc > 0 ? '+' : ''}${r.gf - r.gc}</td>
            <td><strong>${r.pts}</strong></td>
        </tr>`;
    });
    out += '</tbody></table></div>';
    if(clasifCount>0) {
        out += `<div class="leyenda-clasificacion" style="margin-top: 10px; font-size: 0.85rem; color: #8b949e; display: flex; align-items: center;"><span style="display:inline-block; width:12px; height:12px; background: rgba(46, 160, 67, 0.5); border-radius: 2px; margin-right: 5px;"></span><span>[1-${clasifCount}] Clasifica</span></div>`;
    }
    out += '</div>';

    out += '<div><h4 style="margin-bottom: 1rem; text-align: center; color: #eff0f3;">Resultados</h4>';
    out += '<div class="table-responsive"><table class="ranking-table align-center large-table-font">';
    out += '<thead><tr><th style="text-align: right;">Azul</th><th style="text-align: center;">Resultado</th><th style="text-align: left;">Rojo</th></tr></thead><tbody>';
    partidos.forEach(p => {
        const w1 = p.ganador === p.azul;
        const w2 = p.ganador === p.rojo;
        out += `<tr>
            <td style="text-align: right; ${w1 ? 'font-weight: bold; color: #58a6ff;' : ''}">${p.azul}</td>
            <td style="text-align: center; font-weight: bold; letter-spacing: 2px;">${p.golesAzul}-${p.golesRojo}</td>
            <td style="text-align: left; ${w2 ? 'font-weight: bold; color: #f85149;' : ''}">${p.rojo}</td>
        </tr>`;
    });
    out += '</tbody></table></div></div>';
    out += '</div>';
    return out;
}

function createMatchCardSimulador(ganador, j1, j2, g1, g2, title) {
    let winnerLabel = `🏆 ${ganador}`;
    if (title.includes("Final")) winnerLabel = `👑 CAMPEÓN: ${ganador}`;
    else if (title.includes("Tercer")) winnerLabel = `🥉 ${ganador}`;
    return `
        <div class="match-card">
            <div class="match-number">${title}</div>
            <div class="match-players">
                <div class="player blue">${j1}</div>
                <div class="vs">VS</div>
                <div class="player red">${j2}</div>
            </div>
            <div class="score">${g1} - ${g2}</div>
            <div class="winner-badge">${winnerLabel}</div>
        </div>
    `;
}

// ================================================
// COPA DE CAMPEONES (formato de 4 jugadores en el simulador): Semifinal 1,
// Semifinal 2 y Final, cada cruce a Ida y Vuelta. Si el global termina
// empatado se define con un partido extra de Gol de Oro. No hay fase de
// grupos ni tercer puesto (con solo 4 jugadores no hay repechaje posible).
// ================================================

// Simula un cruce a ida y vuelta entre dos jugadores y, si hace falta,
// un partido extra de Gol de Oro (se representa siempre como 1-0).
function simularSerieCopa(pA, pB, estadisticasJugadores, etapaBicampeon) {
    if (typeof establecerEtapaBicampeon === 'function') {
        establecerEtapaBicampeon(etapaBicampeon);
    }

    const rIda = simularPartido(pA, pB);
    const rVuelta = simularPartido(pB, pA);

    const legs = [
        { j1: pA.nombre, j2: pB.nombre, g1: rIda.goles1, g2: rIda.goles2, etiqueta: "Ida" },
        { j1: pB.nombre, j2: pA.nombre, g1: rVuelta.goles1, g2: rVuelta.goles2, etiqueta: "Vuelta" }
    ];

    const goles = { [pA.nombre]: 0, [pB.nombre]: 0 };
    legs.forEach(l => { goles[l.j1] += l.g1; goles[l.j2] += l.g2; });

    let ganador;
    if (goles[pA.nombre] === goles[pB.nombre]) {
        const rDesempate = simularPartido(pA, pB);
        ganador = rDesempate.ganador;
        legs.push({
            j1: pA.nombre, j2: pB.nombre,
            g1: ganador === pA.nombre ? 1 : 0,
            g2: ganador === pB.nombre ? 1 : 0,
            etiqueta: "Desempate (Gol de Oro)"
        });
    } else {
        ganador = goles[pA.nombre] > goles[pB.nombre] ? pA.nombre : pB.nombre;
    }

    // Acumular estadísticas de cada partido jugado en esta serie
    legs.forEach(l => {
        const stJ1 = estadisticasJugadores[l.j1];
        const stJ2 = estadisticasJugadores[l.j2];
        if (stJ1) {
            stJ1.golesFaseFinal += l.g1;
            stJ1.gc += l.g2;
            stJ1.partidosJugados++;
            if (l.g1 > l.g2) stJ1.pg++; else stJ1.pp++;
        }
        if (stJ2) {
            stJ2.golesFaseFinal += l.g2;
            stJ2.gc += l.g1;
            stJ2.partidosJugados++;
            if (l.g2 > l.g1) stJ2.pg++; else stJ2.pp++;
        }
    });

    return { pA: pA.nombre, pB: pB.nombre, legs, goles, ganador };
}

// Convierte el resultado de simularSerieCopa() al formato { ida, vuelta,
// desempate } que espera createSeriesCard() (definida en js/copa_campeones.js),
// para que el bracket simulado se vea igual que en copadecampeones.html.
function serieCopaToLegsFormat(serie) {
    function leg(etiqueta) {
        const l = serie.legs.find(x => x.etiqueta === etiqueta);
        if (!l) return null;
        return { j1: l.j1, j2: l.j2, marcador: `${l.g1}-${l.g2}`, fecha: null, fase: etiqueta };
    }
    return {
        ida: leg("Ida"),
        vuelta: leg("Vuelta"),
        desempate: leg("Desempate (Gol de Oro)")
    };
}

// Simula la Copa de Campeones completa para los 4 jugadores elegidos.
// Como los 4 participantes son (en la ficción del simulador) igualmente
// "campeones", se desactiva temporalmente el bonus de campeón defensor de
// js/campeon.js: no tendría sentido premiar/castigar solo a uno de los
// cuatro por ser el último campeón real.
function simularCopaCampeonesFormato(jugadoresCopa, estadisticasJugadores) {
    const campeonPrevio = window.CAMPEON ? window.CAMPEON.activo : null;
    if (window.CAMPEON) window.CAMPEON.activo = false;

    try {
        const shuffled = [...jugadoresCopa].sort(() => Math.random() - 0.5);
        const [p1, p2, p3, p4] = shuffled;

        const sf1 = simularSerieCopa(p1, p2, estadisticasJugadores, 'semifinal');
        const sf2 = simularSerieCopa(p3, p4, estadisticasJugadores, 'semifinal');

        const finalista1 = jugadoresCopa.find(j => j.nombre === sf1.ganador);
        const finalista2 = jugadoresCopa.find(j => j.nombre === sf2.ganador);
        const final = simularSerieCopa(finalista1, finalista2, estadisticasJugadores, 'final');

        if (typeof establecerEtapaBicampeon === 'function') {
            establecerEtapaBicampeon('ninguna');
        }

        return {
            sf1, sf2, final,
            ganador: final.ganador,
            semifinalistas: [sf1.ganador, sf2.ganador],
            clasificados: jugadoresCopa.map(j => j.nombre)
        };
    } finally {
        if (window.CAMPEON) window.CAMPEON.activo = campeonPrevio;
    }
}

// Genera el HTML del bracket de la Copa de Campeones simulada (reutiliza
// createSeriesCard() de js/copa_campeones.js).
function renderPlayoffsCopaHTML(resultadoCopa) {
    return `
        <div class="panel playoffs-section" style="margin-bottom: 2rem;">
            <h2>👑 Playoffs — Copa de Campeones (simulado)</h2><br>
            <div class="playoff-bracket">
                <div class="bracket-fixture">
                    <div class="bracket-col-semis">
                        <h3 class="round-title">⚔️ Semifinales</h3>
                        <div id="sf1-wrap">${createSeriesCard(serieCopaToLegsFormat(resultadoCopa.sf1), "Semifinal 1", false)}</div>
                        <div id="sf2-wrap">${createSeriesCard(serieCopaToLegsFormat(resultadoCopa.sf2), "Semifinal 2", false)}</div>
                    </div>
                    <div class="bracket-connector-col" id="bracket-connector-col">
                        <svg id="bracket-svg" style="width:100%; height:100%; display:block; overflow:visible;"></svg>
                    </div>
                    <div class="bracket-col-final">
                        <h3 class="round-title">👑 Final</h3>
                        <div id="final-wrap">${createSeriesCard(serieCopaToLegsFormat(resultadoCopa.final), "Final", true)}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function simularTorneo(mantenerGrupos = false) {
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
    if (mantenerGrupos && window.ultimoOrdenJugadores && (modoGrupos === 'aleatorio' || !window.gruposManualConfig)) {
        // Mantener el orden de jugadores de la simulación anterior para tener los mismos grupos
        jugadores = window.ultimoOrdenJugadores.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
        // Si por falta de algún jugador no cuadra, completamos
        if (jugadores.length < numJugadores) {
            const faltantes = [...jugadoresBase].filter(j => !jugadores.includes(j));
            jugadores.push(...faltantes);
            jugadores = jugadores.slice(0, numJugadores);
        }
    } else if (modoGrupos === 'aleatorio' || !window.gruposManualConfig) {
        jugadores = jugadores.sort(() => Math.random() - 0.5);
        window.ultimoOrdenJugadores = jugadores.map(j => j.nombre);
    } else {
        // Para modo manual, guardamos el orden igual como base para futuros cambios si hiciera falta
        window.ultimoOrdenJugadores = jugadores.map(j => j.nombre);
    }

    // Inicializar estadísticas de jugadores para la tabla final
    const estadisticasJugadores = {};
    jugadores.forEach(j => {
        estadisticasJugadores[j.nombre] = {
            golesLiga: 0,
            golesFaseFinal: 0,
            gc: 0,
            partidosJugados: 0,
            pg: 0,
            pp: 0
        };
    });

    // Copa de Campeones: sin fase de grupos, se resuelve directo en semifinales.
    if (numJugadores === 4) {
        const resultadoCopa = simularCopaCampeonesFormato(jugadores, estadisticasJugadores);
        const htmlPlayoffsCopa = renderPlayoffsCopaHTML(resultadoCopa);
        const htmlStatsCopa = renderEstadisticasHTML(estadisticasJugadores, numJugadores, true);

        requestAnimationFrame(() => drawBracketLines());
        if (!window._copaResizeListenerAdded) {
            window.addEventListener('resize', drawBracketLines);
            window._copaResizeListenerAdded = true;
        }

        const reSimulateButtonsCopa = `<div style="display:flex; justify-content:center; gap:15px; margin-bottom: 25px; margin-top: 10px;">
            <button onclick="ejecutarSimulacion(false)" class="re-simular-btn">🔄 Volver a simular Copa</button>
        </div>`;

        document.getElementById('resultado').innerHTML = reSimulateButtonsCopa + htmlPlayoffsCopa + htmlStatsCopa;

        setTimeout(() => {
            drawBracketLines();
        }, 50);
        return;
    }

    let htmlFase = '';
    let clasificados = [];
    let repechajePreMatch = null;
    // Estructura de grupos para el cálculo de bicampeonato (Monte Carlo)
    let gruposBicampeon = null;

    // Contexto del peso de bicampeonato: el formato define la ruta de etapas
    // y cuánto peso recibe cada una (ver js/campeon.js)
    if (typeof establecerFormatoBicampeon === 'function') {
        establecerFormatoBicampeon(numJugadores);
    }
    // Establecer etapa inicial (liga para 7 jugadores, grupos para el resto)
    if (typeof establecerEtapaBicampeon === 'function') {
        establecerEtapaBicampeon((numJugadores === 7 || numJugadores === 6) ? 'liga' : 'grupos');
    }

    if (numJugadores === 7 || numJugadores === 6) {
        // Formato Liga: Todos contra todos
        // FASE DE LIGA COMPLETA (4, 5 o 6 jugadores)
        htmlFase += '<h2>🏆 Fase de Liga</h2><br>';

        gruposBicampeon = { all: jugadores.slice() };
        if (typeof calibrarSiCorresponde === 'function') {
            calibrarSiCorresponde(gruposBicampeon, numJugadores, simularPartido, simGrupoBicampeon);
        }

        const { partidos, rankingGrupo } = simularGrupo(jugadores, 'Liga', 1, estadisticasJugadores);

        htmlFase += renderGrupoUIX(partidos, rankingGrupo, 4);

        clasificados = rankingGrupo.slice(0, 4);

    } else if (numJugadores === 8) {
        // 2 grupos de 4
        htmlFase += '<h2>🏆 Fase de Grupos</h2><br>';

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

        gruposBicampeon = { A: grupoA.slice(), B: grupoB.slice() };
        if (typeof calibrarSiCorresponde === 'function') {
            calibrarSiCorresponde(gruposBicampeon, numJugadores, simularPartido, simGrupoBicampeon);
        }

        const resultadoA = simularGrupo(grupoA, 'A', 1, estadisticasJugadores);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber, estadisticasJugadores);

        // Mostrar partidos por grupo
        htmlFase += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO A</h3>';
        htmlFase += renderGrupoUIX(resultadoA.partidos, resultadoA.rankingGrupo, 2);

        htmlFase += '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔶 GRUPO B</h3>';
        htmlFase += renderGrupoUIX(resultadoB.partidos, resultadoB.rankingGrupo, 2);

        // Los 2 primeros de cada grupo clasifican
        clasificados = [
            ...resultadoA.rankingGrupo.slice(0, 2),
            ...resultadoB.rankingGrupo.slice(0, 2)
        ];

    } else if (numJugadores === 9) {
        // 3 grupos de 3
        htmlFase += '<h2>🏆 Fase de Grupos</h2><br>';

        // Separar en 3 grupos (A, B, C)
        let grupos = [[], [], []];
        if (modoGrupos === 'manual' && window.gruposManualConfig) {
            grupos[0] = window.gruposManualConfig.grupoA.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
            grupos[1] = window.gruposManualConfig.grupoB.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
            grupos[2] = window.gruposManualConfig.grupoC.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
        } else {
            grupos[0] = jugadores.slice(0, 3);
            grupos[1] = jugadores.slice(3, 6);
            grupos[2] = jugadores.slice(6, 9);
        }
        gruposBicampeon = { A: grupos[0].slice(), B: grupos[1].slice(), C: grupos[2].slice() };
        if (typeof calibrarSiCorresponde === 'function') {
            calibrarSiCorresponde(gruposBicampeon, numJugadores, simularPartido, simGrupoBicampeon);
        }

        let resultadosGrupos9 = [];
        // Simular y mostrar cada grupo
        for (let i = 0; i < grupos.length; i++) {
            const resultadoGrupo = simularGrupo(grupos[i], String.fromCharCode(65 + i), 1, estadisticasJugadores);
            resultadosGrupos9.push(resultadoGrupo);
            htmlFase += `<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO ${String.fromCharCode(65 + i)}</h3>`;
            htmlFase += renderGrupoUIX(resultadoGrupo.partidos, resultadoGrupo.rankingGrupo, 1);
        }

        // Clasifican los 3 primeros de cada grupo directo
        const primeros = resultadosGrupos9.map(r => r.rankingGrupo[0]);
        const segundos = resultadosGrupos9.map(r => r.rankingGrupo[1]);
        const terceros = resultadosGrupos9.map(r => r.rankingGrupo[2]);

        // A partir de acá empieza la etapa 'repechaje' del peso de bicampeonato:
        // mini-ligas de 2°/3° + partido eliminatorio (ver js/campeon.js)
        if (typeof establecerEtapaBicampeon === 'function') {
            establecerEtapaBicampeon('repechaje');
        }

        // ========== MINI-LIGA ENTRE SEGUNDOS ==========
        const miniSegundos = simularMiniLiga(construirCandidatos(segundos, jugadores), estadisticasJugadores);

        htmlFase += '<h2>⚖️ REPECHAJE 2° PUESTOS - MINI-LIGA (3 PARTIDOS)</h2><br>';
        htmlFase += renderGrupoUIX(miniSegundos.partidos, miniSegundos.ranking, 1);

        // ========== REPECHAJE ENTRE TERCEROS ==========
        const miniTerceros = simularMiniLiga(construirCandidatos(terceros, jugadores), estadisticasJugadores);

        htmlFase += '<h2>⚖️ REPECHAJE 3° PUESTOS - MINI-LIGA (3 PARTIDOS)</h2><br>';
        htmlFase += renderGrupoUIX(miniTerceros.partidos, miniTerceros.ranking, 1);

        // ========== PARTIDO ELIMINATORIO PRE-PLAYOFFS ==========
        // 1° de repechaje segundos vs 1° de repechaje terceros
        const prePlayoff = simularPrePlayoff(miniSegundos.ranking[0], miniTerceros.ranking[0], jugadores, estadisticasJugadores);
        repechajePreMatch = prePlayoff.match;

        // El ganador del partido eliminatorio es el 4° clasificado
        clasificados = [...primeros, prePlayoff.cuartoClasificado];

    } else if (numJugadores === 10) {
        // 2 grupos de 5
        htmlFase += '<h2>🏆 Fase de Grupos</h2><br>';

        let grupos = [[], []];
        if (modoGrupos === 'manual' && window.gruposManualConfig) {
            grupos[0] = window.gruposManualConfig.grupoA.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
            grupos[1] = window.gruposManualConfig.grupoB.map(nombre => jugadores.find(j => j.nombre === nombre)).filter(Boolean);
        } else {
            grupos[0] = jugadores.slice(0, 5);
            grupos[1] = jugadores.slice(5, 10);
        }
        gruposBicampeon = { A: grupos[0].slice(), B: grupos[1].slice() };
        if (typeof calibrarSiCorresponde === 'function') {
            calibrarSiCorresponde(gruposBicampeon, numJugadores, simularPartido, simGrupoBicampeon);
        }

        let resultadosGrupos = [];
        // Simular y mostrar cada grupo
        for (let i = 0; i < grupos.length; i++) {
            const resultadoGrupo = simularGrupo(grupos[i], String.fromCharCode(65 + i), 1, estadisticasJugadores);
            resultadosGrupos.push(resultadoGrupo);
            htmlFase += `<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO ${String.fromCharCode(65 + i)}</h3>`;
            htmlFase += renderGrupoUIX(resultadoGrupo.partidos, resultadoGrupo.rankingGrupo, 2);
        }

        // Los 2 primeros de cada grupo clasifican
        clasificados = [
            ...resultadosGrupos[0].rankingGrupo.slice(0, 2),
            ...resultadosGrupos[1].rankingGrupo.slice(0, 2)
        ];
    }

    // Fase Final (Playoffs) - común para todos los formatos
    const playoffs = simularPlayoffs(clasificados, jugadores, estadisticasJugadores);

    // Generar html para playoffs con formato bracket y conector de SVG
    const htmlPlayoffs = renderPlayoffsHTML(playoffs, numJugadores, repechajePreMatch);

    requestAnimationFrame(() => drawSimBracketLines());
    if (!window._simResizeListenerAdded) {
        window.addEventListener('resize', drawSimBracketLines);
        window._simResizeListenerAdded = true;
    }

    // Tabla de estadísticas
    const htmlStats = renderEstadisticasHTML(estadisticasJugadores, numJugadores);

    // Crear el container de acciones sutiles de simulación
    let reSimulateButtons = `<div style="display:flex; justify-content:center; gap:15px; margin-bottom: 25px; margin-top: 10px;">
        <button onclick="ejecutarSimulacion(false)" class="re-simular-btn">🔄 Volver a simular torneo</button>`;

    if (numJugadores >= 8) {
        reSimulateButtons += `
        <button onclick="ejecutarSimulacion(true)" class="re-simular-btn">🔄 Simular mismos grupos</button>`;
    }
    
    reSimulateButtons += `</div>`;

    document.getElementById('resultado').innerHTML =
        reSimulateButtons + htmlPlayoffs + htmlFase + htmlStats;

    // Draw SVG lines after injecting HTML
    setTimeout(() => {
        drawSimBracketLines();
    }, 50);
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

    let html = '';

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
        container.innerHTML = `<div style="background:#2d2008; padding:15px; border-radius:8px; margin-bottom:15px; border:1px solid #7d4e00;">
            <p style="margin:0; color:#e3b341; font-weight:600;">⚠️ Primero seleccioná los ${numJugadores} jugadores para poder armar los grupos manualmente.</p>
        </div>`;
        return;
    }

    container.style.display = 'block';

    let html = `<div style="background:#161b22; padding:20px; border-radius:10px; margin-bottom:20px; border:2px solid #58a6ff;">
        <h3 style="margin:0 0 15px 0; color:#58a6ff; text-align:center;">✋ ARMADO MANUAL DE GRUPOS</h3>
        <p style="margin:0 0 15px 0; text-align:center; color:#c9d1d9;">Arrastrá los jugadores a cada grupo o usá los selectores</p>`;

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
        <button id="confirmarGruposBtn" style="background:#238636; color:white; padding:10px 25px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:14px;">
            ✅ Confirmar Grupos
        </button>
        <button id="resetGruposBtn" style="background:#8b949e; color:white; padding:10px 25px; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:14px; margin-left:10px;">
            🔄 Resetear
        </button>
    </div>`;

    html += `<div id="gruposConfirmados" style="display:none; margin-top:15px; padding:10px; background:#1e3a1f; border-radius:6px; text-align:center;">
        <p style="margin:0; color:#3fb950; font-weight:bold;">✅ Grupos confirmados correctamente</p>
    </div>`;

    html += `<div id="gruposError" style="display:none; margin-top:15px; padding:10px; background:#4a1e1e; border-radius:6px; text-align:center;">
        <p style="margin:0; color:#ff7b72; font-weight:bold;" id="gruposErrorMsg"></p>
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
    let html = `<div class="grupo-manual-container" style="background:#21262d; padding:15px; border-radius:8px; margin-bottom:10px; border:1px solid #30363d;">
        <h4 style="margin:0 0 10px 0; color:#667eea;">🔷 Grupo ${nombreGrupo} (${cantidad} jugadores)</h4>
        <div class="grupo-selectors" style="display:flex; flex-wrap:wrap; gap:10px;">`;

    for (let i = 0; i < cantidad; i++) {
        html += `<select class="grupo-select" data-grupo="${nombreGrupo}" data-pos="${i}" style="padding:8px 12px; border-radius:5px; border:1px solid #30363d; background:#0d1117; color:#c9d1d9; min-width:150px;">
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

window.ejecutarSimulacion = function(mantenerGrupos = false) {
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

    simularTorneo(mantenerGrupos);

    // Restaurar jugadoresBase original
    for (let i = 0; i < originalBase.length; i++) jugadoresBase[i] = originalBase[i];
    jugadoresBase.length = originalBase.length;
};

// Enlazar botón simular al DOM
const simBtn = document.getElementById('simularBtn');
if (simBtn) {
    simBtn.addEventListener('click', () => {
        ejecutarSimulacion(false);
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
    // Detectar el último campeón para el peso de bicampeonato
    if (typeof detectarUltimoCampeon === 'function') {
        await detectarUltimoCampeon();
    }

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

// ===============================================
// SIMULACIÓN MONTE CARLO: 10,000 TORNEOS
// Registra los cruces y resultados más probables
// ===============================================

window.simularTorneoMonteCarlo = async function() {
    const num = parseInt(document.getElementById('numPlayers').value);
    const seleccion = obtenerJugadoresSeleccionadosPorNombre(num);
    if (seleccion.length !== num) {
       alert(`Por favor seleccioná exactamente ${num} jugadores antes de simular.`);
       return;
    }

    // Verificar si hay grupos manuales configurados cuando el modo es manual
    const modoGruposEl = document.getElementById('modoGrupos');
    const modoGrupos = modoGruposEl ? modoGruposEl.value : 'aleatorio';

    if (modoGrupos === 'manual' && num >= 8 && !window.gruposManualConfig) {
       alert('Por favor configurá y confirmá los grupos manualmente antes de simular.');
       return;
    }

    // Ocultar controles
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

    // Mostrar banner de progreso
    const resultado = document.getElementById('resultado');
    resultado.innerHTML = `
       <div style="text-align:center; padding:40px; background:#0d1117; border-radius:10px; margin:20px 0;">
           <h2 style="color:#58a6ff; margin-bottom:20px;">⏳ Simulando 10,000 torneos...</h2>
           <div style="background:#30363d; border-radius:6px; overflow:hidden;">
               <div id="mcProgressBar" style="height:30px; width:0%; background:linear-gradient(90deg, #58a6ff, #1f6feb); transition:width 0.1s; display:flex; align-items:center; justify-content:center; color:white; font-weight:bold;">0%</div>
           </div>
           <p style="color:#8b949e; margin-top:15px;">Esto puede tomar unos segundos...</p>
       </div>
    `;

    // Guardar configuración original
    const originalBase = [...jugadoresBase];
    let seleccionCompleta = [...seleccion];
    if (seleccionCompleta.length < num) {
       const faltan = num - seleccionCompleta.length;
       for (let i = 0; i < faltan; i++) {
           if (nuevosJugadores[i]) seleccionCompleta.push(nuevosJugadores[i]);
       }
    }

    // Reemplazar jugadoresBase con la selección
    for (let i = 0; i < jugadoresBase.length; i++) {
       jugadoresBase[i] = seleccionCompleta[i] || jugadoresBase[i];
    }
    if (seleccionCompleta.length > jugadoresBase.length) {
       for (let i = jugadoresBase.length; i < seleccionCompleta.length; i++) jugadoresBase.push(seleccionCompleta[i]);
    }

    // Estructura para registrar torneos
    const historialTorneos = {};
    const simulacionesCount = 10000;
    let completadas = 0;

    // Simular en chunks para no bloquear la UI
    return new Promise((resolve) => {
       const simularChunk = () => {
           const chunkSize = 50;
           const hasta = Math.min(completadas + chunkSize, simulacionesCount);

           for (let sim = completadas; sim < hasta; sim++) {
               // Ejecutar una simulación silenciosa
               const torneo = ejecutarSimulacionSilenciosa();
                
               // Registrar el torneo completo
               registrarTorneoCompleto(torneo, historialTorneos);

               // Actualizar progreso
               completadas++;
               const porcentaje = Math.round((completadas / simulacionesCount) * 100);
               const progressBar = document.getElementById('mcProgressBar');
               if (progressBar) {
                   progressBar.style.width = porcentaje + '%';
                   progressBar.textContent = porcentaje + '%';
               }
           }

           if (completadas < simulacionesCount) {
               // Continuar con siguiente chunk
               setTimeout(simularChunk, 10);
           } else {
               // Listo: encontrar el torneo más frecuente y mostrarlo
               const torneosMasFrequentes = Object.values(historialTorneos)
                   .sort((a, b) => b.frecuencia - a.frecuencia);
                
               if (torneosMasFrequentes.length > 0) {
                   const torneoMasPromedio = torneosMasFrequentes[0].torneo;
                   const frecuencia = torneosMasFrequentes[0].frecuencia;
                   mostrarTorneoMasPromedio(torneoMasPromedio, frecuencia, simulacionesCount);
               }
                
               // Restaurar jugadoresBase
               for (let i = 0; i < originalBase.length; i++) jugadoresBase[i] = originalBase[i];
               jugadoresBase.length = originalBase.length;
                
               resolve();
           }
       };

       simularChunk();
    });
};

// Ejecuta una simulación completa (sin renderizar) y retorna la estructura del torneo.
// Sigue exactamente el mismo formato que simularTorneo() para que el resultado se pueda
// mostrar con el mismo diseño.
function ejecutarSimulacionSilenciosa() {
    const numJugadores = parseInt(document.getElementById('numPlayers').value);

    let jugadores = [...jugadoresBase];
    const jugadoresNecesarios = numJugadores - jugadoresBase.length;
    if (jugadoresNecesarios > 0) {
        for (let i = 0; i < jugadoresNecesarios; i++) {
            jugadores.push(nuevosJugadores[i]);
        }
    } else if (jugadoresNecesarios < 0) {
        jugadores = jugadores.slice(0, numJugadores);
    }

    // Respetar el modo de armado de grupos elegido por el usuario
    const modoGruposEl = document.getElementById('modoGrupos');
    const modoGrupos = modoGruposEl ? modoGruposEl.value : 'aleatorio';
    const usarGruposManuales = modoGrupos === 'manual' && !!window.gruposManualConfig;

    if (!usarGruposManuales) {
        jugadores = jugadores.sort(() => Math.random() - 0.5);
    }

    // Inicializar estadísticas de jugadores para la tabla final
    const estadisticasJugadores = {};
    jugadores.forEach(j => {
        estadisticasJugadores[j.nombre] = {
            golesLiga: 0,
            golesFaseFinal: 0,
            gc: 0,
            partidosJugados: 0,
            pg: 0,
            pp: 0
        };
    });

    // Copa de Campeones: sin fase de grupos, se resuelve directo en semifinales
    // (misma lógica que en simularTorneo(), pero sin renderizar nada acá).
    if (numJugadores === 4) {
        const resultadoCopa = simularCopaCampeonesFormato(jugadores, estadisticasJugadores);
        return {
            numJugadores: 4,
            grupos: [],
            repechajes: [],
            repechajePreMatch: null,
            clasificados: resultadoCopa.clasificados,
            playoffs: null,
            playoffsCopa: resultadoCopa,
            esCopa: true,
            semifinalistas: resultadoCopa.semifinalistas,
            ganador: resultadoCopa.ganador,
            estadisticas: estadisticasJugadores,
            gruposBicampeon: null
        };
    }

    const torneoData = {
        numJugadores: numJugadores,
        grupos: [],              // [{ titulo, partidos, ranking, clasifCount }]
        repechajes: [],          // [{ titulo, partidos, ranking, clasifCount }]
        repechajePreMatch: null, // Partido eliminatorio de 9 jugadores
        clasificados: [],
        playoffs: null,
        semifinalistas: [],
        ganador: null,
        estadisticas: estadisticasJugadores,
        // Composición de grupos, para alimentar el panel de bicampeonato
        gruposBicampeon: null
    };

    // Devuelve el grupo correspondiente según el modo (manual o por corte de la lista mezclada)
    const armarGrupo = (letra, desde, hasta) => {
        if (usarGruposManuales) {
            const nombres = window.gruposManualConfig['grupo' + letra] || [];
            const grupo = nombres.map(n => jugadores.find(j => j.nombre === n)).filter(Boolean);
            if (grupo.length) return grupo;
        }
        return jugadores.slice(desde, hasta);
    };

    // Contexto del peso de bicampeonato: formato + etapa inicial (ver js/campeon.js)
    if (typeof establecerFormatoBicampeon === 'function') {
        establecerFormatoBicampeon(numJugadores);
    }
    if (typeof establecerEtapaBicampeon === 'function') {
        establecerEtapaBicampeon((numJugadores === 7 || numJugadores === 6) ? 'liga' : 'grupos');
    }

    let clasificados = [];

    if (numJugadores === 7 || numJugadores === 6) {
        // Formato Liga: todos contra todos
        torneoData.gruposBicampeon = { all: jugadores.slice() };
        if (typeof calibrarSiCorresponde === 'function') {
            calibrarSiCorresponde(torneoData.gruposBicampeon, numJugadores, simularPartido, simGrupoBicampeon);
        }
        const { partidos, rankingGrupo } = simularGrupo(jugadores, 'Liga', 1, estadisticasJugadores);
        torneoData.grupos.push({
            titulo: '<h2>🏆 Fase de Liga</h2><br>',
            partidos: partidos,
            ranking: rankingGrupo,
            clasifCount: 4
        });
        clasificados = rankingGrupo.slice(0, 4);

    } else if (numJugadores === 8) {
        // 2 grupos de 4
        const grupoA = armarGrupo('A', 0, 4);
        const grupoB = armarGrupo('B', 4, 8);
        torneoData.gruposBicampeon = { A: grupoA.slice(), B: grupoB.slice() };
        if (typeof calibrarSiCorresponde === 'function') {
            calibrarSiCorresponde(torneoData.gruposBicampeon, numJugadores, simularPartido, simGrupoBicampeon);
        }

        const resultadoA = simularGrupo(grupoA, 'A', 1, estadisticasJugadores);
        const resultadoB = simularGrupo(grupoB, 'B', resultadoA.matchNumber, estadisticasJugadores);

        torneoData.grupos.push({
            titulo: '<h2>🏆 Fase de Grupos</h2><br><h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO A</h3>',
            partidos: resultadoA.partidos,
            ranking: resultadoA.rankingGrupo,
            clasifCount: 2
        });
        torneoData.grupos.push({
            titulo: '<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔶 GRUPO B</h3>',
            partidos: resultadoB.partidos,
            ranking: resultadoB.rankingGrupo,
            clasifCount: 2
        });

        clasificados = [
            ...resultadoA.rankingGrupo.slice(0, 2),
            ...resultadoB.rankingGrupo.slice(0, 2)
        ];

    } else if (numJugadores === 9) {
        // 3 grupos de 3
        const grupos = [armarGrupo('A', 0, 3), armarGrupo('B', 3, 6), armarGrupo('C', 6, 9)];
        torneoData.gruposBicampeon = { A: grupos[0].slice(), B: grupos[1].slice(), C: grupos[2].slice() };
        if (typeof calibrarSiCorresponde === 'function') {
            calibrarSiCorresponde(torneoData.gruposBicampeon, numJugadores, simularPartido, simGrupoBicampeon);
        }

        const resultadosGrupos9 = [];
        for (let i = 0; i < grupos.length; i++) {
            const letra = String.fromCharCode(65 + i);
            const resultadoGrupo = simularGrupo(grupos[i], letra, 1, estadisticasJugadores);
            resultadosGrupos9.push(resultadoGrupo);
            torneoData.grupos.push({
                titulo: (i === 0 ? '<h2>🏆 Fase de Grupos</h2><br>' : '') +
                    `<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO ${letra}</h3>`,
                partidos: resultadoGrupo.partidos,
                ranking: resultadoGrupo.rankingGrupo,
                clasifCount: 1
            });
        }

        const primeros = resultadosGrupos9.map(r => r.rankingGrupo[0]);
        const segundos = resultadosGrupos9.map(r => r.rankingGrupo[1]);
        const terceros = resultadosGrupos9.map(r => r.rankingGrupo[2]);

        // Etapa 'repechaje' del peso de bicampeonato (ver js/campeon.js)
        if (typeof establecerEtapaBicampeon === 'function') {
            establecerEtapaBicampeon('repechaje');
        }

        // Mini-liga entre 2° puestos
        const miniSegundos = simularMiniLiga(construirCandidatos(segundos, jugadores), estadisticasJugadores);
        torneoData.repechajes.push({
            titulo: '<h2>⚖️ REPECHAJE 2° PUESTOS - MINI-LIGA (3 PARTIDOS)</h2><br>',
            partidos: miniSegundos.partidos,
            ranking: miniSegundos.ranking,
            clasifCount: 1
        });

        // Mini-liga entre 3° puestos
        const miniTerceros = simularMiniLiga(construirCandidatos(terceros, jugadores), estadisticasJugadores);
        torneoData.repechajes.push({
            titulo: '<h2>⚖️ REPECHAJE 3° PUESTOS - MINI-LIGA (3 PARTIDOS)</h2><br>',
            partidos: miniTerceros.partidos,
            ranking: miniTerceros.ranking,
            clasifCount: 1
        });

        // Partido eliminatorio pre-playoffs: define el 4° clasificado
        const prePlayoff = simularPrePlayoff(miniSegundos.ranking[0], miniTerceros.ranking[0], jugadores, estadisticasJugadores);
        torneoData.repechajePreMatch = prePlayoff.match;

        clasificados = [...primeros, prePlayoff.cuartoClasificado];

    } else if (numJugadores === 10) {
        // 2 grupos de 5
        const grupos = [armarGrupo('A', 0, 5), armarGrupo('B', 5, 10)];
        torneoData.gruposBicampeon = { A: grupos[0].slice(), B: grupos[1].slice() };
        if (typeof calibrarSiCorresponde === 'function') {
            calibrarSiCorresponde(torneoData.gruposBicampeon, numJugadores, simularPartido, simGrupoBicampeon);
        }

        const resultadosGrupos = [];
        for (let i = 0; i < grupos.length; i++) {
            const letra = String.fromCharCode(65 + i);
            const resultadoGrupo = simularGrupo(grupos[i], letra, 1, estadisticasJugadores);
            resultadosGrupos.push(resultadoGrupo);
            torneoData.grupos.push({
                titulo: (i === 0 ? '<h2>🏆 Fase de Grupos</h2><br>' : '') +
                    `<h3 style="text-align: center; margin: 20px 0; color: #667eea;">🔷 GRUPO ${letra}</h3>`,
                partidos: resultadoGrupo.partidos,
                ranking: resultadoGrupo.rankingGrupo,
                clasifCount: 2
            });
        }

        // Los 2 primeros de cada grupo clasifican
        clasificados = [
            ...resultadosGrupos[0].rankingGrupo.slice(0, 2),
            ...resultadosGrupos[1].rankingGrupo.slice(0, 2)
        ];
    }

    torneoData.clasificados = clasificados.map(c => c.nombre);

    // Fase final: usa exactamente la misma lógica que la simulación única.
    // Importante: simularPlayoffs() resuelve los objetos jugador completos
    // (ranking/winRate/promedioGoles); pasarle filas de la tabla de posiciones
    // produciría resultados NaN.
    if (clasificados.length >= 4) {
        const playoffs = simularPlayoffs(clasificados, jugadores, estadisticasJugadores);
        torneoData.playoffs = playoffs;
        torneoData.semifinalistas = [playoffs.sf1.ganador, playoffs.sf2.ganador];
        torneoData.ganador = playoffs.final.ganador;
    }

    return torneoData;
}

// Registra una estructura de torneo completo
function registrarTorneoCompleto(torneoCompleto, historialTorneos) {
    // Crear una clave única para este torneo basada en sus características
    // incluyendo ganador y semifinalistas
    const clave = JSON.stringify({
        ganador: torneoCompleto.ganador,
        semifinalistas: torneoCompleto.semifinalistas || [],
        clasificados: torneoCompleto.clasificados || []
    });

    if (!historialTorneos[clave]) {
        historialTorneos[clave] = {
            torneo: torneoCompleto,
            frecuencia: 0
        };
    }

    historialTorneos[clave].frecuencia++;
}

// Muestra el torneo más frecuente con el mismo diseño que la simulación única
function mostrarTorneoMasPromedio(torneoData, frecuencia, totalSimulaciones = 10000) {
    const numJugadores = torneoData.numJugadores;

    // Banner de información
    const htmlBanner = `<div style="text-align:center; padding:15px; background:#0d1117; border-radius:10px; margin-bottom:20px; border-left:4px solid #58a6ff;">
       <h3 style="color:#58a6ff; margin:0 0 5px 0;">📊 Torneo Más Probable</h3>
       <p style="color:#8b949e; margin:0; font-size:12px;">Este torneo ocurrió <strong>${frecuencia}</strong> veces de ${totalSimulaciones.toLocaleString('es-AR')} simulaciones (${((frecuencia / totalSimulaciones) * 100).toFixed(2)}%)</p>
    </div>`;

    // Fase de grupos y repechajes
    let htmlFase = '';
    [...torneoData.grupos, ...torneoData.repechajes].forEach(seccion => {
        htmlFase += seccion.titulo;
        htmlFase += renderGrupoUIX(seccion.partidos, seccion.ranking, seccion.clasifCount);
    });

    // Playoffs: mismo bracket que la simulación única (la Copa de Campeones
    // usa su propio bracket a ida y vuelta, ver renderPlayoffsCopaHTML)
    const htmlPlayoffs = torneoData.esCopa
        ? renderPlayoffsCopaHTML(torneoData.playoffsCopa)
        : (torneoData.playoffs
            ? renderPlayoffsHTML(torneoData.playoffs, numJugadores, torneoData.repechajePreMatch)
            : '');

    // Tabla de estadísticas
    const htmlStats = renderEstadisticasHTML(torneoData.estadisticas, numJugadores, !!torneoData.esCopa);

    // Botones de acción
    const reSimulateButtons = `<div style="display:flex; justify-content:center; gap:15px; margin-bottom: 25px; margin-top: 10px;">
       <button onclick="volverASeleccionar()" class="re-simular-btn">↩️ Volver a seleccionar</button>
       <button onclick="ejecutarSimulacion(false)" class="re-simular-btn">🔄 Simular torneo único</button>
       <button onclick="window.simularTorneoMonteCarlo();" class="re-simular-btn">📊 Analizar de nuevo</button>
    </div>`;

    document.getElementById('resultado').innerHTML =
        htmlBanner + reSimulateButtons + htmlPlayoffs + htmlFase + htmlStats;

    // Dibujar los conectores SVG del bracket una vez inyectado el HTML
    const dibujarLineas = torneoData.esCopa ? drawBracketLines : drawSimBracketLines;
    requestAnimationFrame(() => dibujarLineas());
    if (torneoData.esCopa) {
        if (!window._copaResizeListenerAdded) {
            window.addEventListener('resize', drawBracketLines);
            window._copaResizeListenerAdded = true;
        }
    } else if (!window._simResizeListenerAdded) {
        window.addEventListener('resize', drawSimBracketLines);
        window._simResizeListenerAdded = true;
    }
    setTimeout(() => {
        dibujarLineas();
    }, 50);
}

// Vuelve a la pantalla de selección restaurando los controles ocultados al simular
window.volverASeleccionar = function() {
    const controls = document.querySelector('.controls');
    if (controls) {
        Array.from(controls.children).forEach(child => {
            child.style.display = '';
        });
    }
    // mostrarFormato() re-renderiza la selección y vuelve a ocultar el selector de
    // armado manual si el formato elegido no tiene grupos
    mostrarFormato();
};

// Botón Monte Carlo event listener
document.addEventListener('DOMContentLoaded', () => {
    const mcBtn = document.getElementById('simularMonteCarloBtn');
    if (mcBtn) {
       mcBtn.addEventListener('click', () => {
           window.simularTorneoMonteCarlo();
       });
    }
});
