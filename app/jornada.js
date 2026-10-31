// =====================================================
// MODO JORNADA (app de carga)
// =====================================================
// Una jornada es un día que el grupo se junta a jugar amistosos de la
// Tejo Nations League. Este modo arma todos los cruces posibles entre
// los que vinieron y permite cargarlos uno por uno, igual que el
// fixture de un torneo.
//
// Cómo se reconstruye el estado, igual que en el modo Torneo: el JSON
// del repo (jornadas/index.json) guarda SOLO la fecha y quiénes
// vinieron. Los cruces no se guardan, se deducen (son todos contra
// todos), y los resultados tampoco: viven en
// enfrentamientos_directos.txt. Así que:
//
//   cruces      = todos contra todos entre los jugadores de la jornada
//   jugados     = los amistosos del .txt con esa misma fecha
//   pendientes  = cruces - jugados
//
// Por eso se puede cerrar la app, quedarse sin batería o seguir desde
// otro teléfono sin perder nada, y por eso también la página de la
// Nations League puede mostrar lo que falta jugar.
//
// El orden de los cruces sale de ordenarParaQueDescansen()
// (lib/torneo-formatos.js), la misma que usa el fixture de los torneos,
// así nadie juega dos partidos seguidos.
// =====================================================

const API_JORNADA = '/api/jornada';

const jornada = {
    abierta: null,      // { fecha, jugadores }
    seleccion: [],      // jugadores tildados en la pantalla de creación
    editando: false,    // true cuando se cambia el plantel de una jornada abierta
    cargando: false
};

// =====================================================
// Entrada al modo
// =====================================================

async function entrarModoJornada() {
    const cont = document.getElementById('seccion-jornada');
    if (!cont) return;

    if (jornada.abierta) {
        renderJornadaEnCurso();
        return;
    }

    cont.innerHTML = '<div class="vacio-msg">Cargando...</div>';

    try {
        const res = await fetch(API_JORNADA, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        const abiertas = data.jornadas || [];
        if (abiertas.length > 0) {
            // La última por fecha: el endpoint las devuelve ordenadas
            jornada.abierta = abiertas[abiertas.length - 1];
            renderJornadaEnCurso();
        } else {
            renderInicioJornada();
        }
    } catch (err) {
        cont.innerHTML = `<div class="vacio-msg">No se pudo cargar: ${escaparHtml(err.message)}</div>`;
    }
}

// =====================================================
// Pantalla inicial
// =====================================================

function renderInicioJornada() {
    actualizarSubtitulo();
    const cont = document.getElementById('seccion-jornada');

    cont.innerHTML = `
        <div class="card">
            <label>Nueva jornada</label>
            <p class="hint" style="margin: 0 0 14px 0;">
                Marcá quiénes vinieron y la app arma todos los cruces posibles.
                Después los vas cargando uno por uno, en el orden que quieras.
            </p>
            <button class="btn btn-primary" id="btn-nueva-jornada">🗓️ Armar jornada</button>
        </div>
    `;

    // Con la función pelada, el MouseEvent entraría como `editando`
    document.getElementById('btn-nueva-jornada').addEventListener('click', () => renderCrearJornada(false));
}

// =====================================================
// Crear la jornada, o cambiar quiénes están
// =====================================================
// La misma pantalla sirve para las dos cosas. Editar hace falta más de
// lo que parece: siempre cae alguien tarde, o alguien se va antes. Como
// los cruces se deducen de la lista de jugadores, agregar a uno hace
// aparecer sus partidos como pendientes sin tocar nada de lo ya jugado.

function renderCrearJornada(editando = false) {
    actualizarSubtitulo(editando ? 'Editar jugadores' : 'Nueva jornada');
    jornada.seleccion = editando ? jornada.abierta.jugadores.slice() : [];
    jornada.editando = editando;
    const cont = document.getElementById('seccion-jornada');

    cont.innerHTML = `
        <div class="card">
            <label>¿Quiénes ${editando ? 'están' : 'vinieron'}? <span id="contador-jornada" style="color: var(--accent);"></span></label>
            <div class="chips" id="chips-jornada-jugadores"></div>
            <p class="hint" id="hint-jornada"></p>
        </div>

        <div class="card">
            <label>Fecha</label>
            ${editando
                ? `<p class="hint" style="margin:0;">${escaparHtml(jornada.abierta.fecha)} · la fecha es la que identifica la jornada, no se cambia.</p>`
                : '<input type="date" id="fecha-jornada">'}
        </div>

        <div class="btn-row">
            <button class="btn btn-secondary" id="btn-cancelar-jornada">Cancelar</button>
            <button class="btn btn-primary" id="btn-crear-jornada" disabled>Armar cruces</button>
        </div>
    `;

    if (!editando) document.getElementById('fecha-jornada').value = hoyISO();
    renderChipsJornada();

    document.getElementById('btn-cancelar-jornada').addEventListener('click',
        () => (editando ? renderJornadaEnCurso() : renderInicioJornada()));
    document.getElementById('btn-crear-jornada').addEventListener('click', crearJornada);
}

// Quiénes ya jugaron algo hoy: a esos no se los puede sacar de la
// jornada, porque sus partidos ya están en el .txt y quedarían sueltos.
function yaJugaronHoy() {
    if (!jornada.editando || !jornada.abierta) return new Set();
    const nombres = new Set();
    jugadosDeLaJornada().forEach(p => { nombres.add(p.jugador1); nombres.add(p.jugador2); });
    return nombres;
}

function renderChipsJornada() {
    const cont = document.getElementById('chips-jornada-jugadores');
    if (!cont) return;

    const fijos = yaJugaronHoy();

    cont.innerHTML = estado.jugadores.map(nombre => {
        const sel = jornada.seleccion.includes(nombre);
        const fijo = fijos.has(nombre);
        const titulo = fijo ? ' title="Ya jugó: no se puede sacar"' : '';
        return `<button class="chip${sel ? ' sel-1' : ''}" data-jj="${escaparHtml(nombre)}"${titulo}>${escaparHtml(nombre)}${fijo ? ' ✓' : ''}</button>`;
    }).join('') + '<button class="chip nuevo" id="chip-nuevo-jornada">+ Otro</button>';

    cont.querySelectorAll('[data-jj]').forEach(btn => {
        btn.addEventListener('click', () => {
            const n = btn.dataset.jj;
            const i = jornada.seleccion.indexOf(n);
            if (i >= 0) {
                if (fijos.has(n)) {
                    mostrarToast(`${n} ya jugó en esta jornada`, 'error');
                    return;
                }
                jornada.seleccion.splice(i, 1);
            } else {
                jornada.seleccion.push(n);
            }
            renderChipsJornada();
        });
    });

    document.getElementById('chip-nuevo-jornada').addEventListener('click', async () => {
        await agregarJugadorNuevo();
        renderChipsJornada();
    });

    actualizarUIJornada();
}

// Cuántos partidos salen de todos contra todos, para avisar antes de armar.
function cuantosCruces(n) {
    return (n * (n - 1)) / 2;
}

function actualizarUIJornada() {
    const contador = document.getElementById('contador-jornada');
    const hint = document.getElementById('hint-jornada');
    const btn = document.getElementById('btn-crear-jornada');
    if (!contador || !btn) return;

    const n = jornada.seleccion.length;
    contador.textContent = `(${n})`;
    btn.disabled = n < 2 || jornada.cargando;

    if (n < 2) {
        hint.textContent = 'Elegí por lo menos dos.';
        btn.textContent = jornada.editando ? 'Guardar' : 'Armar cruces';
        return;
    }

    const cruces = cuantosCruces(n);
    // Con 3 o 4 no existe ningun orden en el que nadie repita: con 4, cada
    // partido tiene un solo rival disjunto, asi que no se pueden encadenar
    // los 6. Se avisa para que no parezca un error del fixture.
    const avisoPocos = (n === 3 || n === 4)
        ? ` Con ${n} es inevitable que a alguien le toque jugar seguido alguna vez.`
        : '';

    if (jornada.editando) {
        // Lo que importa al editar no es el total sino cuántos se suman
        const antes = cuantosCruces(jornada.abierta.jugadores.length);
        const suman = cruces - antes;
        hint.textContent = (suman === 0
            ? `${n} jugadores: ${cruces} partidos en total.`
            : `${n} jugadores: ${cruces} partidos en total (${suman > 0 ? '+' : ''}${suman}).`) + avisoPocos;
        btn.textContent = jornada.cargando ? 'Guardando...' : 'Guardar';
    } else {
        hint.textContent = `${n} jugadores: ${cruces} partidos, todos contra todos.` + avisoPocos;
        btn.textContent = jornada.cargando ? 'Armando...' : `Armar ${cruces} cruces`;
    }
}

async function crearJornada() {
    if (jornada.cargando || jornada.seleccion.length < 2) return;

    // Al editar, la fecha es la de la jornada abierta: es lo que la
    // identifica en el archivo, así que no se toca.
    const fecha = jornada.editando ? jornada.abierta.fecha : fechaDesdeInput('fecha-jornada');
    jornada.cargando = true;
    actualizarUIJornada();

    try {
        const res = await fetch(API_JORNADA, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha, jugadores: jornada.seleccion })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        const eraEdicion = jornada.editando;
        jornada.abierta = { fecha, jugadores: jornada.seleccion.slice() };
        jornada.editando = false;
        mostrarToast(eraEdicion ? 'Plantel actualizado' : `🗓️ Jornada del ${fecha} armada`, 'ok');
        renderJornadaEnCurso();
    } catch (err) {
        mostrarToast(`No se pudo armar: ${err.message}`, 'error');
    } finally {
        jornada.cargando = false;
        actualizarUIJornada();
    }
}

// =====================================================
// Los cruces y qué falta
// =====================================================

// D/M/AAAA -> AAAAMMDD. Hace falta porque en el .txt conviven
// "15/05/2026" y "2/4/2026": como texto no coinciden, como número sí.
function claveDeFecha(fecha) {
    const [d, m, a] = String(fecha).split('/').map(n => parseInt(n, 10));
    if ([d, m, a].some(isNaN)) return null;
    return a * 10000 + m * 100 + d;
}

// Todos contra todos entre los de la jornada, ordenados para que nadie
// juegue dos partidos seguidos.
function crucesDeLaJornada() {
    if (!jornada.abierta) return [];
    const todos = roundRobin(jornada.abierta.jugadores, FASE);
    return ordenarParaQueDescansen(todos);
}

// Los amistosos del .txt de esa misma fecha.
function jugadosDeLaJornada() {
    if (!jornada.abierta) return [];
    const clave = claveDeFecha(jornada.abierta.fecha);
    return estado.historial.filter(p =>
        p.torneo && p.torneo.toLowerCase() === TORNEO.toLowerCase() &&
        claveDeFecha(p.fecha) === clave
    );
}

function buscarJugadoEnJornada(cruce, jugados) {
    return jugados.find(p =>
        (p.jugador1 === cruce.j1 && p.jugador2 === cruce.j2) ||
        (p.jugador1 === cruce.j2 && p.jugador2 === cruce.j1)
    ) || null;
}

// =====================================================
// Jornada en curso
// =====================================================

function renderJornadaEnCurso() {
    if (!jornada.abierta) return renderInicioJornada();
    jornada.editando = false;

    actualizarSubtitulo(`Jornada del ${jornada.abierta.fecha}`);
    const cont = document.getElementById('seccion-jornada');

    const cruces = crucesDeLaJornada();
    const jugados = jugadosDeLaJornada();
    const faltan = cruces.filter(c => !buscarJugadoEnJornada(c, jugados)).length;

    const filas = cruces.map((c, i) => {
        const jugado = buscarJugadoEnJornada(c, jugados);
        if (jugado) {
            const [g1, g2] = jugado.marcador.split('-').map(Number);
            const gana1 = g1 > g2;
            return `
                <div class="hist-item ok">
                    <span class="estado">✅</span>
                    <span class="hist-texto">
                        <span style="${gana1 ? 'font-weight:700;color:var(--accent);' : ''}">${escaparHtml(jugado.jugador1)}</span>
                        <span class="mk">${escaparHtml(jugado.marcador)}</span>
                        <span style="${!gana1 ? 'font-weight:700;color:var(--accent);' : ''}">${escaparHtml(jugado.jugador2)}</span>
                    </span>
                </div>`;
        }
        return `
            <div class="hist-item">
                <span class="estado">•</span>
                <span class="hist-texto">
                    ${escaparHtml(c.j1)} <span class="mk">vs</span> ${escaparHtml(c.j2)}
                </span>
                <span class="hist-acciones">
                    <button class="icon-btn" data-jugar-jornada="${i}" title="Cargar resultado">▶</button>
                </span>
            </div>`;
    }).join('');

    const total = cruces.length;
    const listos = total - faltan;

    cont.innerHTML = `
        <div class="card">
            <label>Jornada del ${escaparHtml(jornada.abierta.fecha)}</label>
            <p class="hint" style="margin: 0 0 10px 0;">
                ${jornada.abierta.jugadores.length} jugadores ·
                ${listos} de ${total} jugados${faltan === 0 ? ' · completa 🎉' : ''}
            </p>
            <div class="chips">
                ${jornada.abierta.jugadores.map(n => `<span class="chip sel-1">${escaparHtml(n)}</span>`).join('')}
            </div>
        </div>

        <div class="card">
            <label>Partidos ${faltan === 0
                ? '<span style="color:var(--green);">✓</span>'
                : `<span style="color:var(--text-dim);">(faltan ${faltan})</span>`}</label>
            ${filas}
        </div>

        <div class="btn-row">
            <button class="btn btn-secondary" id="btn-editar-jornada">Cambiar jugadores</button>
            <button class="btn btn-secondary" id="btn-cerrar-jornada">Cerrar jornada</button>
        </div>
        <p class="hint" style="text-align:center; margin-top: 6px;">
            ¿Cayó alguien más? "Cambiar jugadores" y se suman sus cruces.<br>
            Cerrar la jornada saca los partidos que falten de la página; los cargados quedan.
        </p>
    `;

    cont.querySelectorAll('[data-jugar-jornada]').forEach(btn => {
        btn.addEventListener('click', () => {
            const cruce = cruces[parseInt(btn.dataset.jugarJornada, 10)];
            abrirCargaDeFixture({
                j1: cruce.j1,
                j2: cruce.j2,
                fase: FASE,
                torneoSuelto: TORNEO,
                origen: 'jornada',
                fecha: jornada.abierta.fecha
            });
        });
    });

    document.getElementById('btn-editar-jornada').addEventListener('click', () => renderCrearJornada(true));
    document.getElementById('btn-cerrar-jornada').addEventListener('click', cerrarJornada);
}

async function cerrarJornada() {
    if (!jornada.abierta || jornada.cargando) return;

    const faltan = crucesDeLaJornada().filter(c => !buscarJugadoEnJornada(c, jugadosDeLaJornada())).length;
    const aviso = faltan > 0
        ? `Todavía faltan ${faltan} partidos. ¿Cerrar igual la jornada del ${jornada.abierta.fecha}?`
        : `¿Cerrar la jornada del ${jornada.abierta.fecha}?`;
    if (!confirm(aviso)) return;

    jornada.cargando = true;

    try {
        const res = await fetch(API_JORNADA, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fecha: jornada.abierta.fecha })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        mostrarToast('Jornada cerrada', 'ok');
        jornada.abierta = null;
        renderInicioJornada();
    } catch (err) {
        mostrarToast(`No se pudo cerrar: ${err.message}`, 'error');
    } finally {
        jornada.cargando = false;
    }
}
