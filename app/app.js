// =====================================================
// APP DE CARGA DE PARTIDOS (PWA)
// =====================================================
// App personal, pensada para usar con el pulgar en el celular
// durante una jornada de amistosos.
//
// Atajo clave: en el tejo siempre se juega a 7, así que el ganador
// SIEMPRE hace 7 goles (verificado contra todo el historial del
// archivo). Por eso solo hay que elegir ganador, perdedor y los
// goles del perdedor (0 a 6): 3 toques por partido.
//
// Sirve para cualquier deporte de js/deportes.js: el de la URL
// (?deporte=metegol) decide a cuántos goles se juega (GOLES), a qué
// archivo van los partidos (la API recibe el mismo ?deporte=) y las
// claves de localStorage, así la tanda del tejo y la del metegol no
// se mezclan. Sin parámetro es el tejo, como siempre.
//
// Dos modos de carga:
//   - Uno por uno: carga y commitea al toque.
//   - Tanda: vas armando la lista de la jornada y después se suben
//     todos, uno por uno (un commit por partido), de forma
//     secuencial para no pisarse entre ellos.
//
// Y un tercer modo, Historial, para editar o borrar partidos ya
// cargados. Cada partido se identifica por su número de línea en el
// archivo más el contenido esperado de esa línea: el índice dice
// cuál, y el contenido confirma que el archivo no cambió en el medio
// (hay partidos repetidos, así que buscar por contenido solo sería
// ambiguo).
//
// Los partidos se guardan en localStorage, así que si se cierra la
// app (o se corta la señal) la tanda no se pierde.
// =====================================================

// Las URLs de la API ya llevan el ?deporte= (en el tejo no agregan nada).
// Para sumarles parámetros usar apiUrl(API_PARTIDOS, { limit: 200 }).
const API_URL = urlDeporte('/api/cargar-partido');
const API_PARTIDOS = urlDeporte('/api/partidos');
const TXT_URL = '/' + DEPORTE.archivoPartidos;
const STORAGE_TANDA = `${DEPORTE.prefijoStorage}-cargar-tanda`;
const STORAGE_JUGADORES = `${DEPORTE.prefijoStorage}-cargar-jugadores-extra`;

// Goles con los que gana siempre el ganador (7 en el tejo).
const GOLES = DEPORTE.golesParaGanar;

// =====================================================
// Modalidad: a goles o por tiempo (solo en los deportes que la tienen)
// =====================================================
// A goles (la de siempre): el ganador siempre hace GOLES, así que alcanza
// con elegir ganador, perdedor y los goles del perdedor.
//
// Por tiempo (metegol): se juegan los MINUTOS enteros, sin tope de goles
// (llegar a 5 no termina nada). Gana el que va arriba cuando suena el
// reloj, y si van iguales es empate. Por eso se cargan los goles de los
// DOS (de 0 a DEPORTE.golesMaximosPorTiempo): en esta modalidad
// estado.ganador y estado.perdedor son simplemente "jugador 1" y "jugador
// 2" (el orden en que se tocaron), con sus goles en estado.golesGanador y
// estado.golesPerdedor. partidoDelFormulario() los ordena al final: el que
// hizo más goles va primero, como en el resto del archivo.
//
// La modalidad la decide el torneo o la jornada al crearse; para los
// amistosos sueltos (Uno y Tanda) hay un selector arriba del formulario.
// Semis, tercer puesto, final y eliminatorio no pueden terminar empatados:
// se desempatan con gol de oro y se carga el resultado final.
const HAY_TIEMPO = DEPORTE.modalidades.includes('tiempo');
// Minutos por partido: se eligen al crear el torneo o la jornada (y para los
// amistosos sueltos, arriba del formulario). Este es el que viene puesto.
const MINUTOS_DEFAULT = DEPORTE.minutosPorPartido || 10;
const MINUTOS_MIN = 1;
const MINUTOS_MAX = 60;
const STORAGE_MODALIDAD = `${DEPORTE.prefijoStorage}-cargar-modalidad`;
const STORAGE_MINUTOS = `${DEPORTE.prefijoStorage}-cargar-minutos`;
const STORAGE_RELOJ = `${DEPORTE.prefijoStorage}-cargar-reloj`;
const MODALIDAD_DEFAULT = HAY_TIEMPO ? (DEPORTE.modalidadPorDefecto || 'goles') : 'goles';

function normalizarMinutos(n) {
    const v = parseInt(n, 10);
    if (isNaN(v)) return MINUTOS_DEFAULT;
    return Math.max(MINUTOS_MIN, Math.min(MINUTOS_MAX, v));
}

function nombreModalidad(m, minutos) {
    return m === 'tiempo'
        ? (minutos ? `⏱️ Por tiempo (${minutos}')` : '⏱️ Por tiempo')
        : `⚽ A ${GOLES} goles`;
}

function explicacionModalidad(m, minutos) {
    return m === 'tiempo'
        ? `Se juegan los ${minutos || MINUTOS_DEFAULT} minutos enteros, sin tope de goles. Gana el que va arriba cuando suena el reloj; iguales es empate (salvo en playoffs: gol de oro).`
        : `Gana el primero que llega a ${GOLES} goles.`;
}

// Botonera para elegir la modalidad y, si es por tiempo, los minutos (la
// usan el formulario, el torneo y la jornada). Devuelve '' en los deportes
// que solo se juegan a goles.
function htmlEleccionModalidad(id, actual, titulo = 'Cómo se juega', minutos = MINUTOS_DEFAULT) {
    if (!HAY_TIEMPO) return '';
    const min = normalizarMinutos(minutos);
    return `
        <div class="card">
            <label>${titulo}</label>
            <div class="filtro-row" id="${id}" style="margin-bottom: 0;">
                ${DEPORTE.modalidades.map(m =>
                    `<button class="filtro-btn${m === actual ? ' active' : ''}" data-modalidad="${m}">${nombreModalidad(m)}</button>`
                ).join('')}
            </div>
            <div class="minutos-row" id="${id}-fila-minutos" style="${actual === 'tiempo' ? '' : 'display: none;'}">
                <span>Minutos por partido</span>
                <button type="button" class="minutos-btn" data-minutos-delta="-1" aria-label="Un minuto menos">−</button>
                <input type="number" id="${id}-minutos" min="${MINUTOS_MIN}" max="${MINUTOS_MAX}" value="${min}" inputmode="numeric">
                <button type="button" class="minutos-btn" data-minutos-delta="1" aria-label="Un minuto más">+</button>
            </div>
            <p class="hint" id="${id}-hint">${explicacionModalidad(actual, min)}</p>
        </div>`;
}

// alCambiar(modalidad, minutos): se llama al cambiar cualquiera de las dos.
function bindEleccionModalidad(id, alCambiar) {
    const cont = document.getElementById(id);
    if (!cont) return;
    const input = document.getElementById(`${id}-minutos`);
    const fila = document.getElementById(`${id}-fila-minutos`);
    const hint = document.getElementById(`${id}-hint`);

    const avisar = () => {
        const m = modalidadElegida(id);
        const min = minutosElegidos(id);
        if (fila) fila.style.display = m === 'tiempo' ? '' : 'none';
        if (hint) hint.textContent = explicacionModalidad(m, min);
        alCambiar(m, min);
    };

    cont.querySelectorAll('[data-modalidad]').forEach(btn => {
        btn.addEventListener('click', () => {
            cont.querySelectorAll('[data-modalidad]').forEach(b => b.classList.toggle('active', b === btn));
            avisar();
        });
    });
    if (input) {
        input.addEventListener('change', () => { input.value = normalizarMinutos(input.value); avisar(); });
        fila.querySelectorAll('[data-minutos-delta]').forEach(btn => {
            btn.addEventListener('click', () => {
                input.value = normalizarMinutos(normalizarMinutos(input.value) + parseInt(btn.dataset.minutosDelta, 10));
                avisar();
            });
        });
    }
}

function modalidadElegida(id) {
    const btn = document.querySelector(`#${id} .filtro-btn.active`);
    return btn ? btn.dataset.modalidad : 'goles';
}

function minutosElegidos(id) {
    const input = document.getElementById(`${id}-minutos`);
    return normalizarMinutos(input ? input.value : MINUTOS_DEFAULT);
}

// Minutos del partido que está en el formulario (los del torneo o la
// jornada, o los elegidos para los amistosos sueltos).
function minutosActuales() {
    const cruce = cruceActual();
    if (cruce) return normalizarMinutos(cruce.minutos || MINUTOS_DEFAULT);
    return estado.minutosSueltos;
}

// El partido del fixture (torneo o jornada) que se está cargando, si hay.
function cruceActual() {
    return (typeof torneo !== 'undefined' && torneo.pendienteActual) || null;
}

// Modalidad del partido que está en el formulario.
function modalidadActual() {
    if (!HAY_TIEMPO) return 'goles';
    const cruce = cruceActual();
    if (cruce) return cruce.modalidad || 'goles';
    if (estado.editando) return estado.editando.modalidad || 'goles';
    return estado.modalidadSuelta;
}

function esPorTiempo() {
    return modalidadActual() === 'tiempo';
}

// Fase del partido del formulario (para saber si puede haber empate).
function faseActual() {
    const cruce = cruceActual();
    if (cruce) return cruce.fase;
    if (estado.editando) return estado.editando.fase;
    return FASE;
}

// El partido tal como quedaría en el archivo: { ganador, perdedor,
// golesGanador, golesPerdedor, fecha }, con el de más goles primero (en un
// empate, en el orden en que se tocaron). null si falta algún dato.
function partidoDelFormulario() {
    const { ganador, perdedor, golesPerdedor } = estado;
    if (!ganador || !perdedor || golesPerdedor === null) return null;
    const fecha = fechaFormateada();

    if (!esPorTiempo()) {
        return { ganador, perdedor, golesGanador: GOLES, golesPerdedor, fecha };
    }
    const g1 = estado.golesGanador;
    if (g1 === null || g1 === undefined) return null;
    return g1 >= golesPerdedor
        ? { ganador, perdedor, golesGanador: g1, golesPerdedor, fecha }
        : { ganador: perdedor, perdedor: ganador, golesGanador: golesPerdedor, golesPerdedor: g1, fecha };
}

// Por qué no se puede cargar ese marcador (o null si está bien).
function errorDelMarcador(p) {
    if (!p) return null;
    if (p.golesGanador === p.golesPerdedor && esFaseEliminatoria(faseActual())) {
        return `En ${faseActual().toLowerCase()} no hay empate: jueguen ${DEPORTE.desempatePlayoff || 'gol de oro'} y cargá el resultado final.`;
    }
    return null;
}

// "7-3" / "2-2". Los partidos viejos de la tanda no tienen golesGanador:
// son a goles, así que el ganador hizo GOLES.
function textoMarcador(p) {
    const gg = p.golesGanador === undefined || p.golesGanador === null ? GOLES : p.golesGanador;
    return `${gg}-${p.golesPerdedor}`;
}

function esEmpate(p) {
    return textoMarcador(p).split('-')[0] === String(p.golesPerdedor);
}

// Un partido ya cargado, leído del marcador: el de más goles primero.
function leerMarcador(p) {
    const [g1, g2] = String(p.marcador).split('-').map(Number);
    const gana1 = g1 >= g2;
    return {
        ganador: gana1 ? p.jugador1 : p.jugador2,
        perdedor: gana1 ? p.jugador2 : p.jugador1,
        golesGanador: Math.max(g1, g2),
        golesPerdedor: Math.min(g1, g2)
    };
}

// Suma parámetros a una URL que puede tener ya un "?" (el del deporte).
function apiUrl(base, params) {
    const qs = new URLSearchParams(params).toString();
    if (!qs) return base;
    return base + (base.includes('?') ? '&' : '?') + qs;
}

// Para los amistosos de la Nations League estos dos campos son fijos.
const TORNEO = 'Amistoso';
const FASE = 'Amistoso';

const estado = {
    modo: 'directo',        // 'directo' | 'tanda' | 'historial' | 'jornada' | 'torneo'
    jugadores: [],          // lista completa de nombres disponibles
    historial: [],          // todos los partidos del .txt (lo usa el modo Torneo)
    ganador: null,
    perdedor: null,
    golesPerdedor: null,
    golesGanador: null,     // solo por tiempo (a goles siempre es GOLES)
    modalidadSuelta: 'goles', // la de los amistosos de Uno y Tanda
    minutosSueltos: 10,     // y sus minutos, si son por tiempo
    gridModalidad: null,    // con qué modalidad se dibujaron los botones de goles
    tanda: [],              // [{ id, ganador, perdedor, golesGanador, golesPerdedor, fecha, estado }]
    subiendo: false,
    historialVista: [],     // partidos traídos del servidor para el modo Historial
    filtroHistorial: 'amistosos', // 'amistosos' | 'todos'
    cargandoHistorial: false,
    editando: null          // { indice, lineaEsperada, torneo, fase, resumen }
};

// =====================================================
// Arranque
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('fecha').value = hoyISO();
    renderCambioDeporte();

    estado.tanda = leerStorage(STORAGE_TANDA, []);
    // Los que quedaron a medio subir vuelven a "pendiente" al reabrir la app
    estado.tanda.forEach(p => { if (p.estado === 'subiendo') p.estado = 'pendiente'; });
    if (HAY_TIEMPO) {
        const guardada = leerStorage(STORAGE_MODALIDAD, MODALIDAD_DEFAULT);
        estado.modalidadSuelta = DEPORTE.modalidades.includes(guardada) ? guardada : MODALIDAD_DEFAULT;
        estado.minutosSueltos = normalizarMinutos(leerStorage(STORAGE_MINUTOS, MINUTOS_DEFAULT));
    }

    renderModalidadFormulario();
    renderGolesGrid();
    iniciarReloj();
    bindEventos();
    renderTanda();
    actualizarUI();

    estado.jugadores = await cargarJugadores();
    renderChips();

    registrarServiceWorker();
});

// Título de la pestaña y link para pasar al otro deporte (arriba a la derecha).
function renderCambioDeporte() {
    document.title = `${DEPORTE.nombre} - Cargar Partidos`;
    actualizarSubtitulo();
    const link = document.getElementById('cambiar-deporte');
    if (!link) return;
    const otro = Object.values(DEPORTES).find(d => d.id !== DEPORTE.id);
    if (!otro) { link.remove(); return; }
    link.href = urlDeporte('./', otro.id);
    link.textContent = `⇄ ${otro.nombre}`;
    link.title = `Cargar partidos de ${otro.nombre}`;
}

function registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {
            // Si falla (ej. abierto como archivo local) la app funciona igual.
        });
    }
}

// =====================================================
// Jugadores
// =====================================================

// Saca la lista de jugadores del propio archivo de partidos, así no
// hay que mantenerla a mano: si aparece un jugador nuevo en el txt,
// aparece solo acá.
// Lee el .txt una sola vez y saca de ahí dos cosas: la lista de jugadores
// (así no hay que mantenerla a mano) y el historial completo de partidos,
// que el modo Torneo usa para sugerir el nombre del torneo siguiente y para
// detectar partidos que quedaron pendientes.
async function cargarJugadores() {
    const extra = leerStorage(STORAGE_JUGADORES, []);
    try {
        const res = await fetch(TXT_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error('no se pudo leer el txt');
        const texto = await res.text();

        const set = new Set();
        estado.historial = texto.split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'))
            .map(l => l.split(','))
            .filter(p => p.length >= 7)
            .map(p => {
                const jugador1 = p[0].trim();
                const jugador2 = p[1].trim();
                if (jugador1) set.add(jugador1);
                if (jugador2) set.add(jugador2);
                return {
                    jugador1, jugador2,
                    resultado: p[2].trim(),
                    marcador: p[3].trim(),
                    torneo: p[4].trim(),
                    fecha: p[5].trim(),
                    fase: p[6].trim()
                };
            });

        // Jugadores de otro deporte del mismo grupo (el metegol ofrece a los
        // del tejo). Solo los nombres: el historial es el de este deporte.
        if (DEPORTE.compartirJugadoresCon && DEPORTES[DEPORTE.compartirJugadoresCon]) {
            try {
                const r = await fetch('/' + DEPORTES[DEPORTE.compartirJugadoresCon].archivoPartidos, { cache: 'no-store' });
                if (r.ok) {
                    (await r.text()).split('\n')
                        .map(l => l.trim())
                        .filter(l => l && !l.startsWith('#'))
                        .map(l => l.split(','))
                        .filter(p => p.length >= 7)
                        .forEach(p => { if (p[0].trim()) set.add(p[0].trim()); if (p[1].trim()) set.add(p[1].trim()); });
                }
            } catch { /* si falla, quedan los propios */ }
        }

        extra.forEach(n => set.add(n));
        return [...set].sort((a, b) => a.localeCompare(b, 'es'));
    } catch (err) {
        console.warn('No se pudo cargar la lista de jugadores:', err);
        estado.historial = [];
        return extra.sort((a, b) => a.localeCompare(b, 'es'));
    }
}

function renderChips() {
    const cont = document.getElementById('chips-jugadores');

    cont.innerHTML = estado.jugadores.map(nombre => {
        let clase = 'chip';
        if (nombre === estado.ganador) clase += ' sel-1';
        else if (nombre === estado.perdedor) clase += ' sel-2';
        return `<button class="${clase}" data-jugador="${escaparHtml(nombre)}">${escaparHtml(nombre)}</button>`;
    }).join('') + '<button class="chip nuevo" id="chip-nuevo">+ Otro</button>';

    cont.querySelectorAll('[data-jugador]').forEach(btn => {
        btn.addEventListener('click', () => seleccionarJugador(btn.dataset.jugador));
    });

    document.getElementById('chip-nuevo').addEventListener('click', () => {
        const nombre = agregarJugadorNuevo();
        if (nombre) seleccionarJugador(nombre);
    });
}

// Primer toque = ganador, segundo = perdedor. Volver a tocar deselecciona.
function seleccionarJugador(nombre) {
    if (estado.ganador === nombre) {
        estado.ganador = null;
    } else if (estado.perdedor === nombre) {
        estado.perdedor = null;
    } else if (!estado.ganador) {
        estado.ganador = nombre;
    } else if (!estado.perdedor) {
        estado.perdedor = nombre;
    } else {
        // Ya están los dos: el nuevo toque reemplaza al perdedor
        estado.perdedor = nombre;
    }
    renderChips();
    actualizarUI();
}

// Agrega un jugador a la lista y devuelve su nombre (o null si no se agregó).
// No lo selecciona: de eso se encarga quien la llama, porque el modo Torneo
// y el formulario de amistosos hacen cosas distintas con él.
function agregarJugadorNuevo() {
    const nombre = (prompt('Nombre del jugador nuevo:') || '').trim();
    if (!nombre) return null;

    if (nombre.includes(',')) {
        mostrarToast('El nombre no puede tener comas', 'error');
        return null;
    }
    if (estado.jugadores.some(j => j.toLowerCase() === nombre.toLowerCase())) {
        mostrarToast('Ese jugador ya está en la lista', 'error');
        return null;
    }

    const extra = leerStorage(STORAGE_JUGADORES, []);
    extra.push(nombre);
    guardarStorage(STORAGE_JUGADORES, extra);

    estado.jugadores = [...estado.jugadores, nombre].sort((a, b) => a.localeCompare(b, 'es'));
    return nombre;
}

// =====================================================
// Marcador
// =====================================================

// A goles: una sola fila, los goles del perdedor (0 a GOLES-1).
// Por tiempo: los goles de cada jugador, de 0 a golesMaximosPorTiempo
// (no hay tope real, pero en 10 minutos no se pasa de eso), en filas de 8.
const GOLES_MAX_TIEMPO = DEPORTE.golesMaximosPorTiempo || 15;

function renderGolesGrid() {
    const porTiempo = esPorTiempo();
    estado.gridModalidad = modalidadActual();
    const cantidad = porTiempo ? GOLES_MAX_TIEMPO + 1 : GOLES;
    const columnas = porTiempo ? Math.min(cantidad, 8) : cantidad;

    // Al volver a "a goles", unos goles que ya no entran se descartan
    if (!porTiempo && estado.golesPerdedor !== null && estado.golesPerdedor >= GOLES) estado.golesPerdedor = null;

    const armar = (cont, atributo, campo) => {
        cont.style.gridTemplateColumns = `repeat(${columnas}, 1fr)`;
        cont.innerHTML = Array.from({ length: cantidad }, (_, n) => n).map(n =>
            `<button class="gol-btn" ${atributo}="${n}">${n}</button>`
        ).join('');
        cont.querySelectorAll(`[${atributo}]`).forEach(btn => {
            btn.addEventListener('click', () => {
                const n = parseInt(btn.getAttribute(atributo), 10);
                estado[campo] = (estado[campo] === n) ? null : n;
                actualizarUI();
            });
        });
    };

    armar(document.getElementById('goles-grid'), 'data-goles', 'golesPerdedor');

    const fila1 = document.getElementById('goles-grid-1');
    const label1 = document.getElementById('label-goles-1');
    if (fila1) {
        fila1.style.display = porTiempo ? '' : 'none';
        if (label1) label1.style.display = porTiempo ? '' : 'none';
        if (porTiempo) armar(fila1, 'data-goles-1', 'golesGanador');
        else fila1.innerHTML = '';
    }
}

// Selector de modalidad de los amistosos sueltos (Uno y Tanda), y en una
// edición, la del partido que se edita. En un partido del fixture no se
// muestra: la modalidad es la del torneo o la jornada.
function renderModalidadFormulario() {
    const cont = document.getElementById('card-modalidad');
    if (!cont) return;
    if (!HAY_TIEMPO || cruceActual()) {
        cont.innerHTML = '';
        return;
    }
    cont.innerHTML = htmlEleccionModalidad('modalidad-formulario', modalidadActual(), 'Cómo se juega', estado.minutosSueltos);
    bindEleccionModalidad('modalidad-formulario', (m, minutos) => {
        if (estado.editando) {
            estado.editando.modalidad = m;
        } else {
            estado.modalidadSuelta = m;
            guardarStorage(STORAGE_MODALIDAD, m);
        }
        estado.minutosSueltos = minutos;
        guardarStorage(STORAGE_MINUTOS, minutos);
        actualizarUI();
    });
}

// =====================================================
// Reloj (partidos por tiempo)
// =====================================================
// Cuenta regresiva de los minutos del partido (minutosActuales()). Guarda
// el momento en que termina (no los segundos que faltan), así sigue bien
// aunque el celular apague la pantalla o se cierre la app: al volver,
// recalcula. Al llegar a cero vibra y suena. Mientras corre pide que la
// pantalla no se apague. Si cambian los minutos (otro torneo, otra
// jornada) y el reloj no arrancó, se ajusta solo; si está corriendo, se
// respeta y el cambio vale para el próximo partido.
const reloj = {
    finEn: null,                          // timestamp de cuando termina (corriendo)
    duracionMs: MINUTOS_DEFAULT * 60000,  // lo que dura un partido entero
    restanteMs: MINUTOS_DEFAULT * 60000,  // lo que falta (pausado)
    timer: null,
    audio: null,
    wakeLock: null
};

// Pone el reloj en los minutos del partido actual, si no está a mitad de uno.
function sincronizarReloj() {
    if (!HAY_TIEMPO) return;
    const duracion = minutosActuales() * 60000;
    if (duracion === reloj.duracionMs) return;
    const sinArrancar = !reloj.finEn && (reloj.restanteMs === reloj.duracionMs || reloj.restanteMs <= 0);
    reloj.duracionMs = duracion;
    if (sinArrancar) reloj.restanteMs = duracion;
    guardarReloj();
    tickReloj();
}

function iniciarReloj() {
    if (!HAY_TIEMPO) return;
    const guardado = leerStorage(STORAGE_RELOJ, null);
    if (guardado) {
        reloj.finEn = guardado.finEn || null;
        reloj.duracionMs = typeof guardado.duracionMs === 'number' ? guardado.duracionMs : reloj.duracionMs;
        reloj.restanteMs = typeof guardado.restanteMs === 'number' ? guardado.restanteMs : reloj.restanteMs;
    }
    document.getElementById('reloj-play').addEventListener('click', () => (reloj.finEn ? pausarReloj() : arrancarReloj()));
    document.getElementById('reloj-reiniciar').addEventListener('click', () => reiniciarReloj());
    if (reloj.finEn) reloj.timer = setInterval(tickReloj, 250);
    tickReloj();
}

function guardarReloj() {
    guardarStorage(STORAGE_RELOJ, { finEn: reloj.finEn, duracionMs: reloj.duracionMs, restanteMs: reloj.restanteMs });
}

function arrancarReloj() {
    if (reloj.restanteMs <= 0) reloj.restanteMs = reloj.duracionMs;
    // El audio solo se puede preparar con un toque del usuario
    try {
        reloj.audio = reloj.audio || new (window.AudioContext || window.webkitAudioContext)();
        reloj.audio.resume();
    } catch { /* sin audio, queda la vibración */ }
    try {
        navigator.wakeLock?.request('screen').then(w => { reloj.wakeLock = w; }).catch(() => {});
    } catch { /* no soportado */ }

    reloj.finEn = Date.now() + reloj.restanteMs;
    clearInterval(reloj.timer);
    reloj.timer = setInterval(tickReloj, 250);
    guardarReloj();
    tickReloj();
}

function pausarReloj() {
    if (!reloj.finEn) return;
    reloj.restanteMs = Math.max(0, reloj.finEn - Date.now());
    reloj.finEn = null;
    clearInterval(reloj.timer);
    soltarWakeLock();
    guardarReloj();
    tickReloj();
}

function reiniciarReloj() {
    if (!HAY_TIEMPO) return;
    reloj.finEn = null;
    reloj.duracionMs = minutosActuales() * 60000;
    reloj.restanteMs = reloj.duracionMs;
    clearInterval(reloj.timer);
    soltarWakeLock();
    guardarReloj();
    tickReloj();
}

function soltarWakeLock() {
    try { reloj.wakeLock?.release(); } catch { /* nada */ }
    reloj.wakeLock = null;
}

function tickReloj() {
    const display = document.getElementById('reloj-display');
    const btn = document.getElementById('reloj-play');
    if (!display || !btn) return;

    let restante = reloj.finEn ? reloj.finEn - Date.now() : reloj.restanteMs;
    if (reloj.finEn && restante <= 0) {
        restante = 0;
        reloj.finEn = null;
        reloj.restanteMs = 0;
        clearInterval(reloj.timer);
        soltarWakeLock();
        guardarReloj();
        sonarFinDelReloj();
    }

    const seg = Math.ceil(Math.max(0, restante) / 1000);
    display.textContent = `${String(Math.floor(seg / 60)).padStart(2, '0')}:${String(seg % 60).padStart(2, '0')}`;
    display.classList.toggle('ultimo-minuto', seg > 0 && seg <= 60);
    display.classList.toggle('terminado', seg === 0);

    const lleno = reloj.restanteMs === reloj.duracionMs;
    btn.textContent = reloj.finEn ? '⏸ Pausar' : (seg === 0 ? '▶ Otro partido' : (lleno ? '▶ Empezar' : '▶ Seguir'));
}

function sonarFinDelReloj() {
    mostrarToast('⏱️ ¡Tiempo! Cargá el resultado', 'ok');
    try { navigator.vibrate?.([500, 200, 500, 200, 900]); } catch { /* nada */ }
    try {
        const ctx = reloj.audio;
        if (!ctx) return;
        [0, 0.45, 0.9].forEach(t => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.35);
            osc.connect(gain).connect(ctx.destination);
            osc.start(ctx.currentTime + t);
            osc.stop(ctx.currentTime + t + 0.36);
        });
    } catch { /* sin audio */ }
}

// =====================================================
// UI
// =====================================================

function actualizarUI() {
    const { ganador, perdedor, golesPerdedor } = estado;
    const porTiempo = esPorTiempo();

    // Si cambió la modalidad (otro partido, otro torneo), se redibujan los goles
    if (estado.gridModalidad !== modalidadActual()) renderGolesGrid();

    // El reloj solo aparece en los partidos por tiempo, con sus minutos
    const cardReloj = document.getElementById('card-reloj');
    if (cardReloj) cardReloj.style.display = porTiempo ? '' : 'none';
    if (porTiempo) sincronizarReloj();

    // Nombres arriba del marcador
    const elP1 = document.getElementById('vs-p1');
    const elP2 = document.getElementById('vs-p2');
    elP1.textContent = ganador || (porTiempo ? 'Jugador 1' : 'Ganador');
    elP1.classList.toggle('vacio', !ganador);
    elP2.textContent = perdedor || (porTiempo ? 'Jugador 2' : 'Perdedor');
    elP2.classList.toggle('vacio', !perdedor);

    // Títulos de las filas de goles
    const label1 = document.getElementById('label-goles-1');
    const label2 = document.getElementById('label-goles-2');
    if (label1) label1.textContent = `Goles de ${ganador || 'jugador 1'}`;
    if (label2) label2.textContent = porTiempo ? `Goles de ${perdedor || 'jugador 2'}` : 'Goles del perdedor';

    // Botones de goles
    document.querySelectorAll('[data-goles]').forEach(btn => {
        btn.classList.toggle('sel', parseInt(btn.dataset.goles, 10) === golesPerdedor);
    });
    document.querySelectorAll('[data-goles-1]').forEach(btn => {
        btn.classList.toggle('sel', parseInt(btn.getAttribute('data-goles-1'), 10) === estado.golesGanador);
    });

    // Chips deshabilitados (no podés elegir dos veces al mismo)
    document.querySelectorAll('[data-jugador]').forEach(btn => {
        const n = btn.dataset.jugador;
        const yaElegido = (n === ganador || n === perdedor);
        btn.classList.toggle('disabled', false);
        if (!yaElegido && ganador && perdedor) btn.classList.remove('disabled');
    });

    // Hint
    const hint = document.getElementById('hint-jugadores');
    if (cruceActual()) hint.textContent = porTiempo
        ? 'Los jugadores los fija el fixture: cargá los goles de cada uno.'
        : 'Tocá al ganador (los jugadores los fija el fixture).';
    else if (porTiempo && !ganador) hint.textContent = 'Tocá a los dos jugadores.';
    else if (porTiempo && !perdedor) hint.textContent = `Ahora tocá al rival de ${ganador}.`;
    else if (!ganador) hint.textContent = 'Tocá el ganador y después el perdedor.';
    else if (!perdedor) hint.textContent = `Ganó ${ganador}. Ahora tocá el perdedor.`;
    else hint.textContent = 'Tocá un jugador elegido para sacarlo.';

    // Preview del marcador (siempre con el de más goles primero)
    const preview = document.getElementById('marcador-preview');
    const partido = partidoDelFormulario();
    const error = errorDelMarcador(partido);
    if (partido && error) {
        preview.innerHTML = `<span class="vacio" style="color: var(--amber);">${escaparHtml(error)}</span>`;
    } else if (partido && esEmpate(partido)) {
        preview.innerHTML = `${escaparHtml(partido.ganador)} ${textoMarcador(partido)} ${escaparHtml(partido.perdedor)} <span class="vacio">· empate</span>`;
    } else if (partido) {
        preview.innerHTML = `<span class="ganador">${escaparHtml(partido.ganador)} ${partido.golesGanador}</span> - ${partido.golesPerdedor} ${escaparHtml(partido.perdedor)}`;
    } else {
        preview.innerHTML = '<span class="vacio">Elegí los jugadores y los goles</span>';
    }

    // Botones de acción
    const listo = !!partido && !error && !estado.subiendo;
    document.getElementById('btn-cargar').disabled = !listo;
    document.getElementById('btn-agregar').disabled = !listo;
    document.getElementById('btn-guardar-edicion').disabled = !listo;
    document.getElementById('btn-guardar-fixture').disabled = !listo;

    const pendientes = estado.tanda.filter(p => p.estado !== 'ok').length;
    document.getElementById('btn-subir-tanda').disabled = pendientes === 0 || estado.subiendo;
    document.getElementById('btn-subir-tanda').textContent = estado.subiendo
        ? 'Subiendo...'
        : `Subir tanda (${pendientes})`;
}

function cambiarModo(modo) {
    // Cambiar de modo cancela una edición en curso, para no guardar sin querer
    if (estado.editando && modo !== estado.modo) cancelarEdicion(true);

    estado.modo = modo;
    document.getElementById('modo-directo').classList.toggle('active', modo === 'directo');
    document.getElementById('modo-tanda').classList.toggle('active', modo === 'tanda');
    document.getElementById('modo-historial').classList.toggle('active', modo === 'historial');
    document.getElementById('modo-jornada').classList.toggle('active', modo === 'jornada');
    document.getElementById('modo-torneo').classList.toggle('active', modo === 'torneo');

    const conSeccionPropia = modo === 'historial' || modo === 'jornada' || modo === 'torneo';
    document.getElementById('formulario').style.display = conSeccionPropia ? 'none' : '';
    document.getElementById('accion-directo').style.display = modo === 'directo' ? '' : 'none';
    document.getElementById('accion-tanda').style.display = modo === 'tanda' ? '' : 'none';
    document.getElementById('seccion-historial').style.display = modo === 'historial' ? '' : 'none';
    document.getElementById('seccion-jornada').style.display = modo === 'jornada' ? '' : 'none';
    document.getElementById('seccion-torneo').style.display = modo === 'torneo' ? '' : 'none';
    document.getElementById('accion-fixture').style.display = 'none';
    document.getElementById('fixture-banner').style.display = 'none';

    renderModalidadFormulario();
    actualizarSubtitulo();

    if (modo === 'historial' && estado.historialVista.length === 0) {
        cargarHistorial();
    }
    if (modo === 'jornada') {
        entrarModoJornada();
    }
    if (modo === 'torneo') {
        entrarModoTorneo();
    }
    actualizarUI();
}

// El subtítulo acompaña al modo: en Torneo no tiene nada que ver con los
// amistosos de la Nations League, y si hay un torneo abierto se muestra su
// nombre.
function actualizarSubtitulo(texto) {
    const el = document.getElementById('subtitulo');
    if (!el) return;

    if (texto) {
        el.textContent = texto;
        return;
    }

    const porModo = {
        directo: `Amistosos · ${DEPORTE.nombreLiga}`,
        tanda: `Amistosos · ${DEPORTE.nombreLiga}`,
        historial: 'Historial de partidos cargados',
        jornada: `Jornada · ${DEPORTE.nombreLiga}`,
        torneo: 'Torneos oficiales'
    };
    el.textContent = porModo[estado.modo] || porModo.directo;
}

function limpiarFormulario() {
    estado.ganador = null;
    estado.perdedor = null;
    estado.golesPerdedor = null;
    estado.golesGanador = null;
    renderChips();
    actualizarUI();
}

// =====================================================
// Tanda
// =====================================================

function renderTanda() {
    const cont = document.getElementById('lista-tanda');
    const count = document.getElementById('tanda-count');

    if (estado.tanda.length === 0) {
        cont.innerHTML = '<div class="vacio-msg">Todavía no agregaste partidos</div>';
        count.textContent = '';
        return;
    }

    count.textContent = `(${estado.tanda.length})`;
    cont.innerHTML = estado.tanda.map(p => {
        const iconos = { pendiente: '•', subiendo: '⏳', ok: '✅', error: '⚠️' };
        const clase = p.estado === 'ok' ? 'ok' : (p.estado === 'error' ? 'error' : '');
        return `
            <div class="lista-item ${clase}">
                <span class="estado">${iconos[p.estado] || '•'}</span>
                <span class="texto">
                    ${escaparHtml(p.ganador)} <span class="marcador">${textoMarcador(p)}</span> ${escaparHtml(p.perdedor)}
                    <br><span style="color: var(--text-dim); font-size: 0.78rem;">${escaparHtml(p.fecha)}</span>
                </span>
                ${p.estado !== 'ok' ? `<button class="borrar" data-borrar="${p.id}">×</button>` : ''}
            </div>
        `;
    }).join('');

    cont.querySelectorAll('[data-borrar]').forEach(btn => {
        btn.addEventListener('click', () => {
            estado.tanda = estado.tanda.filter(p => String(p.id) !== btn.dataset.borrar);
            guardarStorage(STORAGE_TANDA, estado.tanda);
            renderTanda();
            actualizarUI();
        });
    });
}

function agregarATanda() {
    const partido = partidoDelFormulario();
    if (!partido || errorDelMarcador(partido)) return;
    estado.tanda.push({
        id: Date.now() + Math.random(),
        ...partido,
        estado: 'pendiente'
    });
    guardarStorage(STORAGE_TANDA, estado.tanda);
    renderTanda();
    limpiarFormulario();
    if (esPorTiempo()) reiniciarReloj();
    mostrarToast('Agregado a la tanda');
}

// Sube los partidos de a uno (un commit por partido) y en secuencia:
// si fueran en paralelo, GitHub rechazaría los commits por conflicto de sha.
async function subirTanda() {
    if (estado.subiendo) return;
    estado.subiendo = true;
    actualizarUI();

    let ok = 0;
    let fallaron = 0;

    for (const partido of estado.tanda) {
        if (partido.estado === 'ok') continue;

        partido.estado = 'subiendo';
        renderTanda();

        try {
            await enviarPartido(partido);
            partido.estado = 'ok';
            ok++;
        } catch (err) {
            partido.estado = 'error';
            partido.error = err.message;
            fallaron++;
        }

        guardarStorage(STORAGE_TANDA, estado.tanda);
        renderTanda();
    }

    estado.subiendo = false;

    if (fallaron === 0) {
        mostrarToast(`Listo: ${ok} partido${ok === 1 ? '' : 's'} subido${ok === 1 ? '' : 's'}`, 'ok');
        // Limpia los que salieron bien, deja los que fallaron para reintentar
        setTimeout(() => {
            estado.tanda = estado.tanda.filter(p => p.estado !== 'ok');
            guardarStorage(STORAGE_TANDA, estado.tanda);
            renderTanda();
            actualizarUI();
        }, 1600);
    } else {
        mostrarToast(`${ok} subidos, ${fallaron} fallaron. Tocá "Subir tanda" de nuevo`, 'error');
    }

    actualizarUI();
}

// =====================================================
// Historial: listar, borrar y editar partidos ya cargados
// =====================================================

async function cargarHistorial() {
    if (estado.cargandoHistorial) return;
    estado.cargandoHistorial = true;

    const cont = document.getElementById('lista-historial');
    cont.innerHTML = '<div class="vacio-msg">Cargando...</div>';

    const params = new URLSearchParams({ limit: '25' });
    if (estado.filtroHistorial === 'amistosos') params.set('torneo', TORNEO);

    try {
        const res = await fetch(apiUrl(API_PARTIDOS, params), { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        estado.historialVista = data.partidos || [];
        renderHistorial();
    } catch (err) {
        cont.innerHTML = `<div class="vacio-msg">No se pudo cargar: ${escaparHtml(err.message)}</div>`;
    } finally {
        estado.cargandoHistorial = false;
    }
}

function renderHistorial() {
    const cont = document.getElementById('lista-historial');

    if (estado.historialVista.length === 0) {
        cont.innerHTML = '<div class="vacio-msg">No hay partidos cargados</div>';
        return;
    }

    cont.innerHTML = estado.historialVista.map(p => {
        // En el archivo el ganador puede estar en cualquiera de las dos columnas
        const { ganador, perdedor, golesGanador, golesPerdedor } = leerMarcador(p);

        const esAmistoso = p.torneo.toLowerCase() === 'amistoso';
        const badge = esAmistoso
            ? '<span class="badge">Amistoso</span>'
            : `<span class="badge torneo">${escaparHtml(p.torneo)}</span>`;

        const editandoEste = estado.editando && estado.editando.indice === p.indice;

        return `
            <div class="hist-item ${editandoEste ? 'editando' : ''}">
                <span class="hist-texto">
                    ${escaparHtml(ganador)} <span class="mk">${golesGanador}-${golesPerdedor}</span> ${escaparHtml(perdedor)}
                    <span class="hist-meta">${escaparHtml(p.fecha)} ${badge}</span>
                </span>
                <span class="hist-acciones">
                    <button class="icon-btn" data-editar="${p.indice}" title="Editar">✏️</button>
                    <button class="icon-btn borrar" data-borrar-partido="${p.indice}" title="Borrar">🗑️</button>
                </span>
            </div>
        `;
    }).join('');

    cont.querySelectorAll('[data-editar]').forEach(btn => {
        btn.addEventListener('click', () => empezarEdicion(parseInt(btn.dataset.editar, 10)));
    });
    cont.querySelectorAll('[data-borrar-partido]').forEach(btn => {
        btn.addEventListener('click', () => borrarPartido(parseInt(btn.dataset.borrarPartido, 10)));
    });
}

async function borrarPartido(indice) {
    const p = estado.historialVista.find(x => x.indice === indice);
    if (!p) return;

    const { ganador, perdedor, golesGanador, golesPerdedor } = leerMarcador(p);

    const esAmistoso = p.torneo.toLowerCase() === 'amistoso';
    const aviso = esAmistoso
        ? ''
        : `\n\n⚠️ OJO: este partido NO es un amistoso, es de "${p.torneo}".`;

    if (!confirm(`¿Borrar este partido?\n\n${ganador} ${golesGanador}-${golesPerdedor} ${perdedor}\n${p.fecha}${aviso}`)) {
        return;
    }

    try {
        const res = await fetch(API_PARTIDOS, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ indice: p.indice, lineaEsperada: p.linea })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        mostrarToast('🗑️ Partido borrado', 'ok');
        await cargarHistorial();
    } catch (err) {
        mostrarToast(`No se pudo borrar: ${err.message}`, 'error');
    }
}

// Carga el partido en el formulario de arriba para modificarlo.
// Mantiene el torneo y la fase originales: así se pueden corregir también
// partidos de torneos sin convertirlos sin querer en amistosos.
function empezarEdicion(indice) {
    const p = estado.historialVista.find(x => x.indice === indice);
    if (!p) return;

    const { ganador, perdedor, golesGanador, golesPerdedor } = leerMarcador(p);

    estado.editando = {
        indice: p.indice,
        lineaEsperada: p.linea,
        torneo: p.torneo,
        fase: p.fase,
        // Si el ganador no hizo justo GOLES (o fue empate), solo pudo ser
        // por tiempo. Si hizo GOLES se edita como "a goles": da el mismo
        // marcador, y si en realidad fue por tiempo se cambia arriba.
        modalidad: HAY_TIEMPO && (golesGanador !== GOLES || golesGanador === golesPerdedor) ? 'tiempo' : 'goles',
        resumen: `${ganador} ${golesGanador}-${golesPerdedor} ${perdedor} · ${p.fecha}`
    };

    estado.ganador = ganador;
    estado.perdedor = perdedor;
    estado.golesPerdedor = golesPerdedor;
    estado.golesGanador = golesGanador;
    document.getElementById('fecha').value = fechaAISO(p.fecha);

    // Muestra el formulario con los botones de edición
    document.getElementById('formulario').style.display = '';
    document.getElementById('accion-directo').style.display = 'none';
    document.getElementById('accion-tanda').style.display = 'none';
    document.getElementById('accion-edicion').style.display = '';
    document.getElementById('editando-banner').style.display = '';
    document.getElementById('editando-original').textContent = `Original: ${estado.editando.resumen}`;

    renderModalidadFormulario();
    renderChips();
    renderHistorial();
    actualizarUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelarEdicion(silencioso = false) {
    estado.editando = null;
    document.getElementById('accion-edicion').style.display = 'none';
    document.getElementById('editando-banner').style.display = 'none';
    document.getElementById('fecha').value = hoyISO();
    limpiarFormulario();
    renderModalidadFormulario();

    if (estado.modo === 'historial') {
        document.getElementById('formulario').style.display = 'none';
        renderHistorial();
    } else {
        cambiarModo(estado.modo);
    }
    if (!silencioso) mostrarToast('Edición cancelada');
}

async function guardarEdicion() {
    if (!estado.editando || estado.subiendo) return;
    estado.subiendo = true;
    actualizarUI();

    const { indice, lineaEsperada, torneo, fase } = estado.editando;
    const partido = partidoDelFormulario();

    try {
        const res = await fetch(API_PARTIDOS, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                indice,
                lineaEsperada,
                partido: {
                    jugador1: partido.ganador,
                    jugador2: partido.perdedor,
                    resultado: esEmpate(partido) ? 'E' : 'G',
                    marcador: textoMarcador(partido),
                    torneo,
                    fase,
                    fecha: partido.fecha
                }
            })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        mostrarToast('✅ Partido actualizado', 'ok');
        estado.subiendo = false;
        estado.editando = null;
        document.getElementById('accion-edicion').style.display = 'none';
        document.getElementById('editando-banner').style.display = 'none';
        document.getElementById('formulario').style.display = 'none';
        document.getElementById('fecha').value = hoyISO();
        limpiarFormulario();
        renderModalidadFormulario();
        await cargarHistorial();
    } catch (err) {
        mostrarToast(`No se pudo guardar: ${err.message}`, 'error');
    } finally {
        estado.subiendo = false;
        actualizarUI();
    }
}

function cambiarFiltroHistorial(filtro) {
    estado.filtroHistorial = filtro;
    document.getElementById('filtro-amistosos').classList.toggle('active', filtro === 'amistosos');
    document.getElementById('filtro-todos').classList.toggle('active', filtro === 'todos');
    cargarHistorial();
}

// =====================================================
// Envío al backend
// =====================================================

// `partido` viene de partidoDelFormulario() (o de la tanda): el de más goles
// primero. Sin golesGanador (partidos viejos de la tanda) es a goles.
async function enviarPartido(partido, torneoNombre = TORNEO, faseNombre = FASE) {
    const { ganador, perdedor, fecha } = partido;
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jugador1: ganador,
            jugador2: perdedor,
            resultado: esEmpate(partido) ? 'E' : 'G', // jugador1 es el ganador (o empataron)
            marcador: textoMarcador(partido),
            torneo: torneoNombre,
            fecha,
            fase: faseNombre
        })
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`);
    }
    return data;
}

async function cargarDirecto() {
    if (estado.subiendo) return;
    estado.subiendo = true;
    actualizarUI();

    const partido = partidoDelFormulario();
    if (!partido || errorDelMarcador(partido)) {
        estado.subiendo = false;
        actualizarUI();
        return;
    }

    try {
        await enviarPartido(partido);
        mostrarToast(`✅ ${partido.ganador} ${textoMarcador(partido)} ${partido.perdedor}`, 'ok');
        limpiarFormulario();
        if (esPorTiempo()) reiniciarReloj();
    } catch (err) {
        mostrarToast(`No se pudo cargar: ${err.message}`, 'error');
    } finally {
        estado.subiendo = false;
        actualizarUI();
    }
}

// =====================================================
// Eventos
// =====================================================

function bindEventos() {
    document.getElementById('modo-directo').addEventListener('click', () => cambiarModo('directo'));
    document.getElementById('modo-tanda').addEventListener('click', () => cambiarModo('tanda'));
    document.getElementById('modo-historial').addEventListener('click', () => cambiarModo('historial'));
    document.getElementById('modo-jornada').addEventListener('click', () => cambiarModo('jornada'));
    document.getElementById('modo-torneo').addEventListener('click', () => cambiarModo('torneo'));
    document.getElementById('btn-guardar-fixture').addEventListener('click', guardarResultadoFixture);
    document.getElementById('btn-cancelar-fixture').addEventListener('click', cerrarCargaDeFixture);
    document.getElementById('btn-cargar').addEventListener('click', cargarDirecto);
    document.getElementById('btn-agregar').addEventListener('click', agregarATanda);
    document.getElementById('btn-subir-tanda').addEventListener('click', subirTanda);
    document.getElementById('btn-refrescar').addEventListener('click', cargarHistorial);
    document.getElementById('btn-guardar-edicion').addEventListener('click', guardarEdicion);
    document.getElementById('btn-cancelar-edicion').addEventListener('click', () => cancelarEdicion());
    document.getElementById('filtro-amistosos').addEventListener('click', () => cambiarFiltroHistorial('amistosos'));
    document.getElementById('filtro-todos').addEventListener('click', () => cambiarFiltroHistorial('todos'));
}

// =====================================================
// Utilidades
// =====================================================

function hoyISO() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
}

// El txt usa D/M/AAAA, el input date devuelve AAAA-MM-DD.
function fechaFormateada() {
    const valor = document.getElementById('fecha').value || hoyISO();
    const [anio, mes, dia] = valor.split('-').map(n => parseInt(n, 10));
    return `${dia}/${mes}/${anio}`;
}

// Igual que fechaFormateada pero leyendo cualquier input de fecha.
function fechaDesdeInput(id) {
    const el = document.getElementById(id);
    const valor = (el && el.value) || hoyISO();
    const [anio, mes, dia] = valor.split('-').map(n => parseInt(n, 10));
    return `${dia}/${mes}/${anio}`;
}

// La inversa: D/M/AAAA -> AAAA-MM-DD, para cargar una fecha del archivo
// dentro del input date al editar.
function fechaAISO(fecha) {
    const p = String(fecha).split('/');
    if (p.length !== 3) return hoyISO();
    const [dia, mes, anio] = p.map(n => parseInt(n, 10));
    if ([dia, mes, anio].some(isNaN)) return hoyISO();
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function escaparHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function leerStorage(clave, porDefecto) {
    try {
        const raw = localStorage.getItem(clave);
        return raw ? JSON.parse(raw) : porDefecto;
    } catch {
        return porDefecto;
    }
}

function guardarStorage(clave, valor) {
    try {
        localStorage.setItem(clave, JSON.stringify(valor));
    } catch {
        // Si no hay storage (modo incógnito, etc.) la app sigue funcionando en memoria.
    }
}

let toastTimer = null;
function mostrarToast(mensaje, tipo = '') {
    const el = document.getElementById('toast');
    el.textContent = mensaje;
    el.className = `show ${tipo}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = tipo; }, 3200);
}
