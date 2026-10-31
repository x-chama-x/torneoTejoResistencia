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

const API_URL = '/api/cargar-partido';
const API_PARTIDOS = '/api/partidos';
const TXT_URL = '/enfrentamientos_directos.txt';
const STORAGE_TANDA = 'tejo-cargar-tanda';
const STORAGE_JUGADORES = 'tejo-cargar-jugadores-extra';

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
    tanda: [],              // [{ id, ganador, perdedor, golesPerdedor, fecha, estado }]
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

    estado.tanda = leerStorage(STORAGE_TANDA, []);
    // Los que quedaron a medio subir vuelven a "pendiente" al reabrir la app
    estado.tanda.forEach(p => { if (p.estado === 'subiendo') p.estado = 'pendiente'; });

    renderGolesGrid();
    bindEventos();
    renderTanda();
    actualizarUI();

    estado.jugadores = await cargarJugadores();
    renderChips();

    registrarServiceWorker();
});

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

function renderGolesGrid() {
    const cont = document.getElementById('goles-grid');
    cont.innerHTML = [0, 1, 2, 3, 4, 5, 6].map(n =>
        `<button class="gol-btn" data-goles="${n}">${n}</button>`
    ).join('');

    cont.querySelectorAll('[data-goles]').forEach(btn => {
        btn.addEventListener('click', () => {
            const n = parseInt(btn.dataset.goles, 10);
            estado.golesPerdedor = (estado.golesPerdedor === n) ? null : n;
            actualizarUI();
        });
    });
}

// =====================================================
// UI
// =====================================================

function actualizarUI() {
    const { ganador, perdedor, golesPerdedor } = estado;

    // Nombres arriba del marcador
    const elP1 = document.getElementById('vs-p1');
    const elP2 = document.getElementById('vs-p2');
    elP1.textContent = ganador || 'Ganador';
    elP1.classList.toggle('vacio', !ganador);
    elP2.textContent = perdedor || 'Perdedor';
    elP2.classList.toggle('vacio', !perdedor);

    // Botones de goles
    document.querySelectorAll('[data-goles]').forEach(btn => {
        btn.classList.toggle('sel', parseInt(btn.dataset.goles, 10) === golesPerdedor);
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
    if (!ganador) hint.textContent = 'Tocá el ganador y después el perdedor.';
    else if (!perdedor) hint.textContent = `Ganó ${ganador}. Ahora tocá el perdedor.`;
    else hint.textContent = 'Tocá un jugador elegido para sacarlo.';

    // Preview del marcador
    const preview = document.getElementById('marcador-preview');
    if (ganador && perdedor && golesPerdedor !== null) {
        preview.innerHTML = `<span class="ganador">${escaparHtml(ganador)} 7</span> - ${golesPerdedor} ${escaparHtml(perdedor)}`;
    } else {
        preview.innerHTML = '<span class="vacio">Elegí los jugadores y los goles</span>';
    }

    // Botones de acción
    const listo = !!(ganador && perdedor && golesPerdedor !== null) && !estado.subiendo;
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
        directo: 'Amistosos · Tejo Nations League',
        tanda: 'Amistosos · Tejo Nations League',
        historial: 'Historial de partidos cargados',
        jornada: 'Jornada · Tejo Nations League',
        torneo: 'Torneos oficiales'
    };
    el.textContent = porModo[estado.modo] || porModo.directo;
}

function limpiarFormulario() {
    estado.ganador = null;
    estado.perdedor = null;
    estado.golesPerdedor = null;
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
                    ${escaparHtml(p.ganador)} <span class="marcador">7-${p.golesPerdedor}</span> ${escaparHtml(p.perdedor)}
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
    estado.tanda.push({
        id: Date.now() + Math.random(),
        ganador: estado.ganador,
        perdedor: estado.perdedor,
        golesPerdedor: estado.golesPerdedor,
        fecha: fechaFormateada(),
        estado: 'pendiente'
    });
    guardarStorage(STORAGE_TANDA, estado.tanda);
    renderTanda();
    limpiarFormulario();
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
        const res = await fetch(`${API_PARTIDOS}?${params}`, { cache: 'no-store' });
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
        const [g1, g2] = p.marcador.split('-').map(Number);
        const ganador = g1 > g2 ? p.jugador1 : p.jugador2;
        const perdedor = g1 > g2 ? p.jugador2 : p.jugador1;
        const golesPerdedor = Math.min(g1, g2);

        const esAmistoso = p.torneo.toLowerCase() === 'amistoso';
        const badge = esAmistoso
            ? '<span class="badge">Amistoso</span>'
            : `<span class="badge torneo">${escaparHtml(p.torneo)}</span>`;

        const editandoEste = estado.editando && estado.editando.indice === p.indice;

        return `
            <div class="hist-item ${editandoEste ? 'editando' : ''}">
                <span class="hist-texto">
                    ${escaparHtml(ganador)} <span class="mk">7-${golesPerdedor}</span> ${escaparHtml(perdedor)}
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

    const [g1, g2] = p.marcador.split('-').map(Number);
    const ganador = g1 > g2 ? p.jugador1 : p.jugador2;
    const perdedor = g1 > g2 ? p.jugador2 : p.jugador1;

    const esAmistoso = p.torneo.toLowerCase() === 'amistoso';
    const aviso = esAmistoso
        ? ''
        : `\n\n⚠️ OJO: este partido NO es un amistoso, es de "${p.torneo}".`;

    if (!confirm(`¿Borrar este partido?\n\n${ganador} ${p.marcador.includes('-') ? `7-${Math.min(g1, g2)}` : p.marcador} ${perdedor}\n${p.fecha}${aviso}`)) {
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

    const [g1, g2] = p.marcador.split('-').map(Number);
    const ganador = g1 > g2 ? p.jugador1 : p.jugador2;
    const perdedor = g1 > g2 ? p.jugador2 : p.jugador1;

    estado.editando = {
        indice: p.indice,
        lineaEsperada: p.linea,
        torneo: p.torneo,
        fase: p.fase,
        resumen: `${ganador} 7-${Math.min(g1, g2)} ${perdedor} · ${p.fecha}`
    };

    estado.ganador = ganador;
    estado.perdedor = perdedor;
    estado.golesPerdedor = Math.min(g1, g2);
    document.getElementById('fecha').value = fechaAISO(p.fecha);

    // Muestra el formulario con los botones de edición
    document.getElementById('formulario').style.display = '';
    document.getElementById('accion-directo').style.display = 'none';
    document.getElementById('accion-tanda').style.display = 'none';
    document.getElementById('accion-edicion').style.display = '';
    document.getElementById('editando-banner').style.display = '';
    document.getElementById('editando-original').textContent = `Original: ${estado.editando.resumen}`;

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

    try {
        const res = await fetch(API_PARTIDOS, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                indice,
                lineaEsperada,
                partido: {
                    jugador1: estado.ganador,
                    jugador2: estado.perdedor,
                    resultado: 'G',
                    marcador: `7-${estado.golesPerdedor}`,
                    torneo,
                    fase,
                    fecha: fechaFormateada()
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

async function enviarPartido({ ganador, perdedor, golesPerdedor, fecha }, torneoNombre = TORNEO, faseNombre = FASE) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jugador1: ganador,
            jugador2: perdedor,
            resultado: 'G',            // jugador1 siempre es el ganador
            marcador: `7-${golesPerdedor}`,
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

    const partido = {
        ganador: estado.ganador,
        perdedor: estado.perdedor,
        golesPerdedor: estado.golesPerdedor,
        fecha: fechaFormateada()
    };

    try {
        await enviarPartido(partido);
        mostrarToast(`✅ ${partido.ganador} 7-${partido.golesPerdedor} ${partido.perdedor}`, 'ok');
        limpiarFormulario();
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
