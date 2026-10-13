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
// Dos modos:
//   - Uno por uno: carga y commitea al toque.
//   - Tanda: vas armando la lista de la jornada y después se suben
//     todos, uno por uno (un commit por partido), de forma
//     secuencial para no pisarse entre ellos.
//
// Los partidos se guardan en localStorage, así que si se cierra la
// app (o se corta la señal) la tanda no se pierde.
// =====================================================

const API_URL = '/api/cargar-partido';
const TXT_URL = '/enfrentamientos_directos.txt';
const STORAGE_TANDA = 'tejo-cargar-tanda';
const STORAGE_JUGADORES = 'tejo-cargar-jugadores-extra';

// Para los amistosos de la Nations League estos dos campos son fijos.
const TORNEO = 'Amistoso';
const FASE = 'Amistoso';

const estado = {
    modo: 'directo',        // 'directo' | 'tanda'
    jugadores: [],          // lista completa de nombres disponibles
    ganador: null,
    perdedor: null,
    golesPerdedor: null,
    tanda: [],              // [{ id, ganador, perdedor, golesPerdedor, fecha, estado }]
    subiendo: false
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
async function cargarJugadores() {
    const extra = leerStorage(STORAGE_JUGADORES, []);
    try {
        const res = await fetch(TXT_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error('no se pudo leer el txt');
        const texto = await res.text();

        const set = new Set();
        texto.split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'))
            .forEach(l => {
                const p = l.split(',');
                if (p.length >= 2) {
                    if (p[0].trim()) set.add(p[0].trim());
                    if (p[1].trim()) set.add(p[1].trim());
                }
            });

        extra.forEach(n => set.add(n));
        return [...set].sort((a, b) => a.localeCompare(b, 'es'));
    } catch (err) {
        console.warn('No se pudo cargar la lista de jugadores:', err);
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

    document.getElementById('chip-nuevo').addEventListener('click', agregarJugadorNuevo);
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

function agregarJugadorNuevo() {
    const nombre = (prompt('Nombre del jugador nuevo:') || '').trim();
    if (!nombre) return;

    if (nombre.includes(',')) {
        mostrarToast('El nombre no puede tener comas', 'error');
        return;
    }
    if (estado.jugadores.some(j => j.toLowerCase() === nombre.toLowerCase())) {
        mostrarToast('Ese jugador ya está en la lista', 'error');
        return;
    }

    const extra = leerStorage(STORAGE_JUGADORES, []);
    extra.push(nombre);
    guardarStorage(STORAGE_JUGADORES, extra);

    estado.jugadores = [...estado.jugadores, nombre].sort((a, b) => a.localeCompare(b, 'es'));
    seleccionarJugador(nombre);
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

    const pendientes = estado.tanda.filter(p => p.estado !== 'ok').length;
    document.getElementById('btn-subir-tanda').disabled = pendientes === 0 || estado.subiendo;
    document.getElementById('btn-subir-tanda').textContent = estado.subiendo
        ? 'Subiendo...'
        : `Subir tanda (${pendientes})`;
}

function cambiarModo(modo) {
    estado.modo = modo;
    document.getElementById('modo-directo').classList.toggle('active', modo === 'directo');
    document.getElementById('modo-tanda').classList.toggle('active', modo === 'tanda');
    document.getElementById('accion-directo').style.display = modo === 'directo' ? '' : 'none';
    document.getElementById('accion-tanda').style.display = modo === 'tanda' ? '' : 'none';
    actualizarUI();
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
// Envío al backend
// =====================================================

async function enviarPartido({ ganador, perdedor, golesPerdedor, fecha }) {
    const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            jugador1: ganador,
            jugador2: perdedor,
            resultado: 'G',            // jugador1 siempre es el ganador
            marcador: `7-${golesPerdedor}`,
            torneo: TORNEO,
            fecha,
            fase: FASE
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
    document.getElementById('btn-cargar').addEventListener('click', cargarDirecto);
    document.getElementById('btn-agregar').addEventListener('click', agregarATanda);
    document.getElementById('btn-subir-tanda').addEventListener('click', subirTanda);
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
