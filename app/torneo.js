// =====================================================
// MODO TORNEO (app de carga)
// =====================================================
// Lleva un torneo entero desde el celular: sorteo, fixture, carga de
// resultados, tabla en vivo y playoffs.
//
// Cómo se reconstruye el estado (esto es lo importante):
// el JSON del repo guarda SOLO el sorteo (formato, nombre, fecha y quién
// quedó en qué grupo). Todo lo demás se deduce cruzando ese sorteo con
// enfrentamientos_directos.txt, que sigue siendo la única fuente de verdad:
//
//   fixture            = sorteo + formato        (lib/torneo-formatos.js)
//   partidos jugados   = los que están en el .txt con ese nombre de torneo
//   pendientes         = fixture - jugados
//   tabla              = processStandings(...)   (js/historial_torneos.js,
//                        la misma función que usa el sitio, así la tabla
//                        de la app y la de la web nunca difieren)
//
// Por eso no hay nada que "sincronizar": si cambiás de celular, la app
// baja el sorteo y el .txt y aparece exactamente donde estabas.
// =====================================================

const API_TORNEO_ESTADO = '/api/torneo-estado';

const torneo = {
    estado: null,        // { nombre, formato, fecha, grupos }
    ruta: null,          // torneos/<slug>.json
    jugados: [],         // partidos de este torneo que ya están en el .txt
    paso: 'inicio',      // 'inicio' | 'crear' | 'curso'
    seleccionCrear: [],  // jugadores tildados en la pantalla de creación
    formatoElegido: 7,
    cargando: false,
    pendienteActual: null // partido del fixture que se está cargando
};

// =====================================================
// Entrada al modo
// =====================================================

async function entrarModoTorneo() {
    const cont = document.getElementById('seccion-torneo');
    if (!cont) return;

    if (torneo.estado) {
        renderTorneoEnCurso();
        return;
    }

    cont.innerHTML = '<div class="vacio-msg">Cargando...</div>';

    try {
        // ¿Hay algún torneo guardado? Se abre el último.
        const res = await fetch(API_TORNEO_ESTADO, { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        const guardados = data.torneos || [];
        if (guardados.length > 0) {
            const ultima = guardados[guardados.length - 1].ruta;
            const r2 = await fetch(`${API_TORNEO_ESTADO}?ruta=${encodeURIComponent(ultima)}`, { cache: 'no-store' });
            const d2 = await r2.json().catch(() => ({}));
            if (r2.ok && d2.estado) {
                torneo.estado = d2.estado;
                torneo.ruta = ultima;
                await refrescarJugados();
                renderTorneoEnCurso();
                return;
            }
        }
        renderInicioTorneo();
    } catch (err) {
        cont.innerHTML = `<div class="vacio-msg">No se pudo cargar: ${escaparHtml(err.message)}</div>`;
    }
}

// Trae del .txt los partidos ya jugados de este torneo.
async function refrescarJugados() {
    const res = await fetch(`${API_PARTIDOS}?limit=200`, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

    torneo.jugados = (data.partidos || []).filter(p => p.torneo === torneo.estado.nombre);
}

// =====================================================
// Pantalla inicial: crear torneo o ver lo que falta
// =====================================================

function renderInicioTorneo() {
    torneo.paso = 'inicio';
    const cont = document.getElementById('seccion-torneo');

    cont.innerHTML = `
        <div class="card">
            <label>Nuevo torneo</label>
            <p class="hint" style="margin: 0 0 14px 0;">
                Sorteá los grupos, cargá los resultados a medida que se juegan y la app
                arma sola la tabla y los playoffs.
            </p>
            <button class="btn btn-primary" id="btn-nuevo-torneo">🏆 Crear torneo</button>
        </div>
        <div id="pendientes-viejos"></div>
    `;

    document.getElementById('btn-nuevo-torneo').addEventListener('click', renderCrearTorneo);
    renderPartidosFaltantes();
}

// =====================================================
// Crear torneo
// =====================================================

function renderCrearTorneo() {
    torneo.paso = 'crear';
    torneo.seleccionCrear = [];
    const cont = document.getElementById('seccion-torneo');

    cont.innerHTML = `
        <div class="card">
            <label>Formato</label>
            <div class="chips" id="chips-formato"></div>
            <p class="hint" id="hint-formato"></p>
        </div>

        <div class="card">
            <label>Jugadores <span id="contador-jugadores" style="color: var(--accent);"></span></label>
            <div class="chips" id="chips-torneo-jugadores"></div>
        </div>

        <div class="card">
            <label>Nombre</label>
            <input type="text" id="nombre-torneo" placeholder="Nombre del torneo">
            <label style="margin-top: 14px;">Fecha</label>
            <input type="date" id="fecha-torneo">
        </div>

        <div class="btn-row">
            <button class="btn btn-secondary" id="btn-cancelar-crear">Cancelar</button>
            <button class="btn btn-primary" id="btn-sortear" disabled>🎲 Sortear</button>
        </div>
    `;

    document.getElementById('fecha-torneo').value = hoyISO();
    document.getElementById('nombre-torneo').value = nombreSugerido(cantidadTorneosPrevios());

    renderChipsFormato();
    renderChipsTorneoJugadores();

    document.getElementById('btn-cancelar-crear').addEventListener('click', renderInicioTorneo);
    document.getElementById('btn-sortear').addEventListener('click', sortearYGuardar);
}

// Cuántos torneos hay ya en el .txt, para sugerir el nombre del siguiente.
function cantidadTorneosPrevios() {
    const nombres = new Set(
        estado.historial
            .filter(p => p.torneo && p.torneo.toLowerCase() !== 'amistoso')
            .map(p => p.torneo)
    );
    return nombres.size;
}

function renderChipsFormato() {
    const cont = document.getElementById('chips-formato');
    cont.innerHTML = [6, 7, 8, 9, 10].map(n =>
        `<button class="chip${n === torneo.formatoElegido ? ' sel-1' : ''}" data-formato="${n}">${n}</button>`
    ).join('');

    cont.querySelectorAll('[data-formato]').forEach(btn => {
        btn.addEventListener('click', () => {
            torneo.formatoElegido = parseInt(btn.dataset.formato, 10);
            // Si se achicó el formato, se recorta la selección
            torneo.seleccionCrear = torneo.seleccionCrear.slice(0, torneo.formatoElegido);
            renderChipsFormato();
            renderChipsTorneoJugadores();
        });
    });

    const f = getFormato(torneo.formatoElegido);
    document.getElementById('hint-formato').textContent = f ? f.etiqueta : '';
    actualizarUITorneo();
}

function renderChipsTorneoJugadores() {
    const cont = document.getElementById('chips-torneo-jugadores');
    if (!cont) return;

    cont.innerHTML = estado.jugadores.map(nombre => {
        const sel = torneo.seleccionCrear.includes(nombre);
        return `<button class="chip${sel ? ' sel-1' : ''}" data-jt="${escaparHtml(nombre)}">${escaparHtml(nombre)}</button>`;
    }).join('') + '<button class="chip nuevo" id="chip-nuevo-torneo">+ Otro</button>';

    cont.querySelectorAll('[data-jt]').forEach(btn => {
        btn.addEventListener('click', () => {
            const n = btn.dataset.jt;
            const i = torneo.seleccionCrear.indexOf(n);
            if (i >= 0) torneo.seleccionCrear.splice(i, 1);
            else if (torneo.seleccionCrear.length < torneo.formatoElegido) torneo.seleccionCrear.push(n);
            else mostrarToast(`El formato es de ${torneo.formatoElegido} jugadores`, 'error');
            renderChipsTorneoJugadores();
        });
    });

    document.getElementById('chip-nuevo-torneo').addEventListener('click', async () => {
        await agregarJugadorNuevo();
        renderChipsTorneoJugadores();
    });

    actualizarUITorneo();
}

function actualizarUITorneo() {
    const contador = document.getElementById('contador-jugadores');
    const btn = document.getElementById('btn-sortear');
    if (!contador || !btn) return;

    const faltan = torneo.formatoElegido - torneo.seleccionCrear.length;
    contador.textContent = `(${torneo.seleccionCrear.length}/${torneo.formatoElegido})`;
    btn.disabled = faltan !== 0 || torneo.cargando;
    btn.textContent = faltan > 0 ? `Faltan ${faltan}` : '🎲 Sortear';
}

async function sortearYGuardar() {
    if (torneo.cargando) return;

    const nombre = document.getElementById('nombre-torneo').value.trim();
    if (!nombre) {
        mostrarToast('Ponele un nombre al torneo', 'error');
        return;
    }
    if (nombre.includes(',')) {
        mostrarToast('El nombre no puede tener comas', 'error');
        return;
    }
    if (estado.historial.some(p => p.torneo === nombre)) {
        mostrarToast('Ya existe un torneo con ese nombre', 'error');
        return;
    }

    torneo.cargando = true;
    actualizarUITorneo();

    const grupos = repartirEnGrupos(mezclar(torneo.seleccionCrear), torneo.formatoElegido);
    const nuevo = {
        nombre,
        formato: torneo.formatoElegido,
        fecha: fechaDesdeInput('fecha-torneo'),
        grupos,
        creado: new Date().toISOString()
    };
    const ruta = rutaEstado(nombre);

    try {
        const res = await fetch(API_TORNEO_ESTADO, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ruta, estado: nuevo })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

        torneo.estado = nuevo;
        torneo.ruta = ruta;
        torneo.jugados = [];
        mostrarToast('🎲 Torneo sorteado', 'ok');
        renderTorneoEnCurso();
    } catch (err) {
        mostrarToast(`No se pudo crear: ${err.message}`, 'error');
    } finally {
        torneo.cargando = false;
        actualizarUITorneo();
    }
}

// =====================================================
// Torneo en curso
// =====================================================

// Arma la foto completa del torneo cruzando el sorteo con lo jugado.
function calcularSituacion() {
    const { grupos } = torneo.estado;
    const jugados = torneo.jugados;

    const tablaDe = fase => processStandings(
        jugados.filter(p => p.fase === fase)
               .map(p => ({ j1: p.jugador1, j2: p.jugador2, res: p.resultado, marcador: p.marcador }))
    );

    // Tablas de la fase regular, por grupo
    const tablas = {};
    Object.keys(grupos).forEach(letra => { tablas[letra] = tablaDe(faseDelGrupo(letra)); });

    const fixtureRegular = generarFixtureRegular(grupos);
    const faltaRegular = fixtureRegular.filter(p => !estaJugado(p));

    const etapas = [{ titulo: 'Fase regular', partidos: fixtureRegular }];
    let ganadorEliminatorio = null;

    // Formato de 9: repechajes y eliminatorio entre la fase regular y las semis
    const usaRepechajes = Object.keys(grupos).length === 3;
    if (usaRepechajes && faltaRegular.length === 0) {
        const repechajes = calcularRepechajes(grupos, tablas);
        if (repechajes.length) {
            etapas.push({ titulo: 'Repechajes', partidos: repechajes });

            if (repechajes.every(estaJugado)) {
                const elim = calcularEliminatorio(tablaDe(FASE_REPECHAJE_2), tablaDe(FASE_REPECHAJE_3));
                if (elim) {
                    etapas.push({ titulo: 'Partido Eliminatorio', partidos: [elim] });
                    const jugadoElim = buscarJugado(elim);
                    if (jugadoElim) ganadorEliminatorio = ganadorDePartidoTxt(jugadoElim);
                }
            }
        }
    }

    // Semifinales: solo cuando ya está todo lo previo
    const listoParaSemis = faltaRegular.length === 0 &&
        (!usaRepechajes || !!ganadorEliminatorio);

    let semis = [];
    if (listoParaSemis) {
        semis = calcularSemifinales(grupos, tablas, ganadorEliminatorio) || [];
        if (semis.length) etapas.push({ titulo: 'Semifinales', partidos: semis });
    }

    // Final y tercer puesto: cuando las dos semis están jugadas
    const semisJugadas = semis.map(buscarJugado).filter(Boolean);
    if (semis.length === 2 && semisJugadas.length === 2) {
        const defs = calcularDefiniciones(semisJugadas.map(p => ({
            j1: p.jugador1, j2: p.jugador2, marcador: p.marcador
        })));
        if (defs.length) etapas.push({ titulo: 'Definiciones', partidos: defs });
    }

    const todos = etapas.flatMap(e => e.partidos);
    return {
        etapas,
        tablas,
        totalFixture: todos.length,
        jugadosFixture: todos.filter(estaJugado).length,
        terminado: todos.length > 0 && todos.every(estaJugado) &&
                   todos.some(p => p.fase === FASE_FINAL)
    };
}

// ¿Este cruce del fixture ya está en el .txt? Se compara por fase y por la
// pareja de jugadores sin importar el orden: dentro de una fase, dos
// jugadores se cruzan una sola vez, así que no hay ambigüedad.
function buscarJugado(cruce) {
    return torneo.jugados.find(p =>
        p.fase === cruce.fase &&
        ((p.jugador1 === cruce.j1 && p.jugador2 === cruce.j2) ||
         (p.jugador1 === cruce.j2 && p.jugador2 === cruce.j1))
    ) || null;
}

function estaJugado(cruce) {
    return !!buscarJugado(cruce);
}

function ganadorDePartidoTxt(p) {
    const [g1, g2] = p.marcador.split('-').map(Number);
    return g1 > g2 ? p.jugador1 : p.jugador2;
}

function renderTorneoEnCurso() {
    torneo.paso = 'curso';
    const cont = document.getElementById('seccion-torneo');
    const s = calcularSituacion();
    const { nombre, formato } = torneo.estado;

    const progreso = s.totalFixture > 0
        ? Math.round((s.jugadosFixture / s.totalFixture) * 100)
        : 0;

    cont.innerHTML = `
        <div class="card">
            <label>${escaparHtml(nombre)}</label>
            <p class="hint" style="margin: 0 0 10px 0;">
                ${formato} jugadores · ${getFormato(formato)?.etiqueta || ''}<br>
                ${s.jugadosFixture} de ${s.totalFixture} partidos jugados (${progreso}%)
                ${s.terminado ? '<br><strong style="color: var(--green);">🏆 Torneo terminado</strong>' : ''}
            </p>
            <div class="btn-row">
                <button class="btn btn-secondary" id="btn-ver-tablas">📊 Tablas</button>
                <button class="btn btn-secondary" id="btn-salir-torneo">Cerrar</button>
            </div>
            <button class="btn btn-secondary" id="btn-borrar-torneo"
                    style="margin-top: 10px; border-color: #5c2220; color: var(--red);">
                🗑️ Borrar torneo
            </button>
        </div>
        <div id="tablas-torneo" style="display:none;"></div>
        <div id="etapas-torneo"></div>
    `;

    renderEtapas(s);

    document.getElementById('btn-ver-tablas').addEventListener('click', () => {
        const el = document.getElementById('tablas-torneo');
        const mostrando = el.style.display !== 'none';
        el.style.display = mostrando ? 'none' : '';
        if (!mostrando) renderTablas(s);
    });
    document.getElementById('btn-salir-torneo').addEventListener('click', () => {
        torneo.estado = null;
        torneo.ruta = null;
        torneo.jugados = [];
        renderInicioTorneo();
    });
    document.getElementById('btn-borrar-torneo').addEventListener('click', borrarTorneoCompleto);
}

// Borra el torneo entero: el sorteo y todos sus partidos del .txt.
// Pensado para deshacer un torneo de prueba o uno que salió mal.
// El ranking FIFA se recalcula de cero en cada carga de página, así que
// al borrar los partidos vuelve exactamente a como estaba.
async function borrarTorneoCompleto() {
    if (!torneo.estado || torneo.cargando) return;

    const nombre = torneo.estado.nombre;
    const cantidad = torneo.jugados.length;

    const aviso = cantidad > 0
        ? `Se van a borrar el sorteo y los ${cantidad} partido${cantidad === 1 ? '' : 's'} ya cargados.`
        : 'Se va a borrar el sorteo (todavía no hay partidos cargados).';

    if (!confirm(`¿Borrar "${nombre}"?\n\n${aviso}\n\nEsto no se puede deshacer.`)) return;

    torneo.cargando = true;

    try {
        // Primero los partidos (un solo commit), después el sorteo
        if (cantidad > 0) {
            const res = await fetch(API_PARTIDOS, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ torneo: nombre })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
        }

        const res2 = await fetch(API_TORNEO_ESTADO, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ruta: torneo.ruta })
        });
        const d2 = await res2.json().catch(() => ({}));
        if (!res2.ok) throw new Error(d2.error || `Error ${res2.status}`);

        mostrarToast(`🗑️ "${nombre}" borrado`, 'ok');
        torneo.estado = null;
        torneo.ruta = null;
        torneo.jugados = [];
        estado.jugadores = await cargarJugadores();
        renderInicioTorneo();
    } catch (err) {
        mostrarToast(`No se pudo borrar: ${err.message}`, 'error');
    } finally {
        torneo.cargando = false;
    }
}

function renderEtapas(s) {
    const cont = document.getElementById('etapas-torneo');

    cont.innerHTML = s.etapas.map((etapa, ei) => {
        const pendientes = etapa.partidos.filter(p => !estaJugado(p)).length;
        const filas = etapa.partidos.map((p, pi) => {
            const jugado = buscarJugado(p);
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
                            <span class="hist-meta">${escaparHtml(p.fase)}</span>
                        </span>
                    </div>`;
            }
            return `
                <div class="hist-item">
                    <span class="estado">•</span>
                    <span class="hist-texto">
                        ${escaparHtml(p.j1)} <span class="mk">vs</span> ${escaparHtml(p.j2)}
                        <span class="hist-meta">${escaparHtml(p.fase)}</span>
                    </span>
                    <span class="hist-acciones">
                        <button class="icon-btn" data-jugar="${ei}:${pi}" title="Cargar resultado">▶</button>
                    </span>
                </div>`;
        }).join('');

        return `
            <div class="card">
                <label>${escaparHtml(etapa.titulo)} ${pendientes === 0 ? '<span style="color:var(--green);">✓</span>' : `<span style="color:var(--text-dim);">(faltan ${pendientes})</span>`}</label>
                ${filas}
            </div>`;
    }).join('');

    cont.querySelectorAll('[data-jugar]').forEach(btn => {
        btn.addEventListener('click', () => {
            const [ei, pi] = btn.dataset.jugar.split(':').map(Number);
            abrirCargaDeFixture(s.etapas[ei].partidos[pi]);
        });
    });
}

function renderTablas(s) {
    const cont = document.getElementById('tablas-torneo');
    const letras = Object.keys(torneo.estado.grupos);

    cont.innerHTML = letras.map(letra => {
        const tabla = s.tablas[letra] || [];
        const titulo = letra === 'all' ? 'Posiciones' : `Grupo ${letra}`;
        const clasifican = letra === 'all' ? 4 : 2;

        if (tabla.length === 0) {
            return `<div class="card"><label>${titulo}</label><div class="vacio-msg">Sin partidos jugados</div></div>`;
        }

        const filas = tabla.map((t, i) => `
            <tr style="${i < clasifican ? 'background: rgba(63,185,80,0.12);' : ''}">
                <td>${i + 1}</td>
                <td><strong>${escaparHtml(t.nombre)}</strong></td>
                <td>${t.p}</td>
                <td>${t.w}</td>
                <td>${t.l}</td>
                <td>${t.gf}</td>
                <td>${t.gc}</td>
                <td>${t.dif > 0 ? '+' : ''}${t.dif}</td>
                <td><strong>${t.pts}</strong></td>
            </tr>`).join('');

        const aviso = (tabla.empatesSinResolver || []).length
            ? `<p class="hint" style="color: var(--amber);">⚠️ ${tabla.empatesSinResolver.map(g => g.join(', ')).join(' / ')} quedaron empatados en todo. Ese tramo hay que definirlo a mano.</p>`
            : '';

        return `
            <div class="card">
                <label>${titulo}</label>
                <div class="table-responsive">
                    <table class="tabla-mini">
                        <thead><tr><th>#</th><th>Jugador</th><th>PJ</th><th>G</th><th>P</th><th>GF</th><th>GC</th><th>DIF</th><th>PTS</th></tr></thead>
                        <tbody>${filas}</tbody>
                    </table>
                </div>
                ${aviso}
            </div>`;
    }).join('');
}

// =====================================================
// Cargar el resultado de un partido del fixture
// =====================================================
// Reusa el formulario de siempre: los jugadores vienen fijos por el cruce,
// así que solo hay que elegir quién ganó y cuántos goles hizo el perdedor.

function abrirCargaDeFixture(cruce) {
    torneo.pendienteActual = cruce;

    estado.ganador = cruce.j1;
    estado.perdedor = cruce.j2;
    estado.golesPerdedor = null;
    document.getElementById('fecha').value = hoyISO();

    document.getElementById('formulario').style.display = '';
    document.getElementById('accion-directo').style.display = 'none';
    document.getElementById('accion-tanda').style.display = 'none';
    document.getElementById('accion-edicion').style.display = 'none';
    document.getElementById('accion-fixture').style.display = '';
    document.getElementById('fixture-banner').style.display = '';
    document.getElementById('fixture-info').textContent =
        `${cruce.fase}: ${cruce.j1} vs ${cruce.j2}`;

    // En un cruce del fixture los jugadores están fijos: se tocan los chips
    // solo para dar vuelta quién fue el ganador.
    renderChipsFixture(cruce);
    actualizarUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderChipsFixture(cruce) {
    const cont = document.getElementById('chips-jugadores');
    cont.innerHTML = [cruce.j1, cruce.j2].map(n => {
        const clase = n === estado.ganador ? 'chip sel-1' : 'chip sel-2';
        return `<button class="${clase}" data-fix="${escaparHtml(n)}">${escaparHtml(n)}</button>`;
    }).join('');

    cont.querySelectorAll('[data-fix]').forEach(btn => {
        btn.addEventListener('click', () => {
            // Da vuelta ganador y perdedor
            const n = btn.dataset.fix;
            if (n !== estado.ganador) {
                estado.perdedor = estado.ganador;
                estado.ganador = n;
                renderChipsFixture(cruce);
                actualizarUI();
            }
        });
    });

    document.getElementById('hint-jugadores').textContent =
        'Tocá al ganador (los jugadores los fija el fixture).';
}

async function guardarResultadoFixture() {
    if (!torneo.pendienteActual || estado.subiendo) return;
    estado.subiendo = true;
    actualizarUI();

    const cruce = torneo.pendienteActual;
    // Un partido suelto (ej. el tercer puesto que faltaba de un torneo viejo)
    // trae su propio nombre de torneo; si no, es del torneo en curso.
    const nombreTorneo = cruce.torneoSuelto || torneo.estado?.nombre;

    if (!nombreTorneo) {
        mostrarToast('No se sabe a qué torneo pertenece este partido', 'error');
        estado.subiendo = false;
        actualizarUI();
        return;
    }

    try {
        await enviarPartido({
            ganador: estado.ganador,
            perdedor: estado.perdedor,
            golesPerdedor: estado.golesPerdedor,
            fecha: fechaFormateada()
        }, nombreTorneo, cruce.fase);

        mostrarToast(`✅ ${estado.ganador} 7-${estado.golesPerdedor} ${estado.perdedor}`, 'ok');
        cerrarCargaDeFixture();

        // Refresca el historial completo (lo usan los partidos pendientes viejos)
        estado.jugadores = await cargarJugadores();

        if (cruce.torneoSuelto) {
            renderInicioTorneo();
        } else {
            await refrescarJugados();
            renderTorneoEnCurso();
        }
    } catch (err) {
        mostrarToast(`No se pudo cargar: ${err.message}`, 'error');
    } finally {
        estado.subiendo = false;
        actualizarUI();
    }
}

function cerrarCargaDeFixture() {
    torneo.pendienteActual = null;
    document.getElementById('accion-fixture').style.display = 'none';
    document.getElementById('fixture-banner').style.display = 'none';
    document.getElementById('formulario').style.display = 'none';
    limpiarFormulario();
    renderChips();
}

// =====================================================
// Partidos que faltan de torneos viejos
// =====================================================
// Detecta torneos a los que les falta el partido por el tercer puesto:
// si tienen dos semifinales jugadas pero ninguna fase "Tercer Puesto",
// el cruce son los dos perdedores de semis. Pasó con el Tercer torneo,
// donde se lo saltearon por olvido.

function detectarTercerPuestoFaltante() {
    const porTorneo = {};
    estado.historial
        .filter(p => p.torneo && p.torneo.toLowerCase() !== 'amistoso')
        .forEach(p => {
            if (!porTorneo[p.torneo]) porTorneo[p.torneo] = [];
            porTorneo[p.torneo].push(p);
        });

    const faltantes = [];
    Object.entries(porTorneo).forEach(([nombre, partidos]) => {
        const semis = partidos.filter(p => p.fase === FASE_SEMIFINAL);
        const tieneTercero = partidos.some(p => p.fase === FASE_TERCER_PUESTO);
        if (semis.length === 2 && !tieneTercero) {
            const perdedores = semis.map(s => {
                const [g1, g2] = s.marcador.split('-').map(Number);
                return g1 > g2 ? s.jugador2 : s.jugador1;
            });
            faltantes.push({ torneo: nombre, j1: perdedores[0], j2: perdedores[1], fase: FASE_TERCER_PUESTO });
        }
    });
    return faltantes;
}

function renderPartidosFaltantes() {
    const cont = document.getElementById('pendientes-viejos');
    if (!cont) return;

    const faltantes = detectarTercerPuestoFaltante();
    if (faltantes.length === 0) {
        cont.innerHTML = '';
        return;
    }

    cont.innerHTML = `
        <div class="card">
            <label>Partidos que quedaron pendientes</label>
            <p class="hint" style="margin: 0 0 12px 0;">
                Estos torneos tienen las semis y la final, pero les falta el partido
                por el tercer puesto.
            </p>
            ${faltantes.map((f, i) => `
                <div class="hist-item">
                    <span class="estado">🥉</span>
                    <span class="hist-texto">
                        ${escaparHtml(f.j1)} <span class="mk">vs</span> ${escaparHtml(f.j2)}
                        <span class="hist-meta">${escaparHtml(f.torneo)} · Tercer Puesto</span>
                    </span>
                    <span class="hist-acciones">
                        <button class="icon-btn" data-faltante="${i}" title="Cargar resultado">▶</button>
                    </span>
                </div>`).join('')}
        </div>`;

    cont.querySelectorAll('[data-faltante]').forEach(btn => {
        btn.addEventListener('click', () => {
            const f = faltantes[parseInt(btn.dataset.faltante, 10)];
            abrirCargaSuelta(f);
        });
    });
}

// Carga un partido de un torneo viejo (no del torneo en curso).
function abrirCargaSuelta(partido) {
    // Ojo con el orden: abrirCargaDeFixture reemplaza pendienteActual, así que
    // el torneo al que pertenece se marca después, no antes.
    abrirCargaDeFixture({ j1: partido.j1, j2: partido.j2, fase: partido.fase });
    torneo.pendienteActual.torneoSuelto = partido.torneo;
    document.getElementById('fixture-info').textContent =
        `${partido.torneo} · ${partido.fase}: ${partido.j1} vs ${partido.j2}`;
}
