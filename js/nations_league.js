// =====================================================
// TEJO NATIONS LEAGUE - PÁGINA
// =====================================================
// Liga anual armada con los partidos "Amistoso" cargados en
// enfrentamientos_directos.txt. Cada año calendario es una edición
// distinta de la liga (se elige con el selector de año).
//
// El parseo y el cálculo de posiciones (parsearAmistosos, calcularPosicionesNL)
// viven en js/nationsLeagueCalculator.js, compartido con el Historial de
// ganadores de index.html. Acá solo queda el armado visual de esta página:
// selector de año, tablas y resultados.
//
// Las medallas (🥇🥈🥉) van para los primeros 3 puestos de la tabla
// (ya ordenada por PG*, ver nationsLeagueCalculator.js).
// =====================================================

// Las jornadas abiertas (las que todavía tienen partidos por jugar) las
// mantiene la app en jornadas/index.json, vía api/jornada.js. Si el archivo
// no existe todavía no es un error: simplemente no hay ninguna abierta.
const RUTA_JORNADAS = 'jornadas/index.json';

async function cargarJornadasAbiertas() {
    try {
        const res = await fetch(RUTA_JORNADAS, { cache: 'no-store' });
        if (!res.ok) return [];
        const lista = await res.json();
        return Array.isArray(lista) ? lista : [];
    } catch {
        return [];
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('enfrentamientos_directos.txt');
        const data = await res.text();
        const partidos = parsearAmistosos(data);
        const abiertas = await cargarJornadasAbiertas();

        // Para estimar los partidos que faltan de una jornada abierta
        if (typeof prepararProbabilidades === 'function') {
            try { prepararProbabilidades(data); } catch (e) { console.warn('Sin probabilidades:', e); }
        }

        if (partidos.length === 0 && abiertas.length === 0) {
            const cont = document.getElementById('year-selector');
            if (cont) cont.innerHTML = '<p style="color:#8b949e;">Todavía no hay partidos amistosos cargados.</p>';
            return;
        }

        // Una jornada recién abierta puede estrenar una edición: si se juntan
        // en enero y todavía no cargaron nada, ese año tiene que aparecer.
        const anios = [...new Set([
            ...partidos.map(p => p.anio),
            ...abiertas.map(j => anioDeFecha(j.fecha)).filter(Boolean)
        ])].sort((a, b) => b - a);

        const anioActual = new Date().getFullYear();
        const anioInicial = anios.includes(anioActual) ? anioActual : anios[0];

        const pintar = (anio) => renderEdicion(
            partidos.filter(p => p.anio === anio),
            abiertas.filter(j => anioDeFecha(j.fecha) === anio)
        );

        renderSelectorAnios(anios, anioInicial, pintar);
        pintar(anioInicial);
    } catch (err) {
        console.error('Error cargando Tejo Nations League:', err);
    }
});

function anioDeFecha(fecha) {
    const anio = parseInt(String(fecha).split('/')[2], 10);
    return isNaN(anio) ? null : anio;
}

function claveDeFechaNL(fecha) {
    const [d, m, a] = String(fecha).split('/').map(n => parseInt(n, 10));
    if ([d, m, a].some(isNaN)) return null;
    return a * 10000 + m * 100 + d;
}

function renderSelectorAnios(anios, seleccionado, onChange) {
    const cont = document.getElementById('year-selector');
    if (!cont) return;

    cont.innerHTML = anios.map(a =>
        `<button class="year-btn${a === seleccionado ? ' active' : ''}" data-anio="${a}">${a}</button>`
    ).join('');

    cont.querySelectorAll('.year-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            cont.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            onChange(parseInt(btn.dataset.anio, 10));
        });
    });
}

function renderPosiciones(posiciones) {
    const tbody = document.querySelector('#tabla-posiciones-nl tbody');
    if (!tbody) return;

    if (posiciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#8b949e;">Sin partidos amistosos en esta edición</td></tr>';
        return;
    }

    // Medallas de podio para los primeros 3 puestos de la tabla (PG* > DIF/PJ > WR > PTS).
    const medallas = ['🥇', '🥈', '🥉'];
    const filas = posiciones.map((s, i) => ({ ...s, medalla: medallas[i] || '' }));

    tbody.innerHTML = filas.map((s, i) => `
        <tr>
            <td>${s.medalla || (i + 1)}</td>
            <td><strong>${s.nombre}</strong></td>
            <td>${s.pj}</td>
            <td>${s.g}</td>
            <td>${s.p}</td>
            <td>${s.gf}</td>
            <td>${s.gc}</td>
            <td>${s.dif > 0 ? '+' : ''}${s.dif}</td>
            <td><strong>${s.pgAjustado.toFixed(2)}</strong></td>
        </tr>
    `).join('');
}

function renderGoleadores(posiciones) {
    const tbody = document.querySelector('#tabla-goleadores-nl tbody');
    if (!tbody) return;

    const goleadores = [...posiciones].filter(s => s.gf > 0).sort((a, b) => b.gf - a.gf);

    if (goleadores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#8b949e;">Sin goles registrados</td></tr>';
        return;
    }

    tbody.innerHTML = goleadores.map((s, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${s.nombre}</strong></td>
            <td>${s.gf}</td>
        </tr>
    `).join('');
}

function renderEstadisticas(posiciones) {
    const tbody = document.querySelector('#tabla-stats-nl tbody');
    if (!tbody) return;

    if (posiciones.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:#8b949e;">Sin datos</td></tr>';
        return;
    }

    tbody.innerHTML = posiciones.map((s, i) => {
        const wr = s.pj > 0 ? ((s.g / s.pj) * 100).toFixed(1) + '%' : '0.0%';
        const pg = s.pj > 0 ? (s.gf / s.pj).toFixed(2) : '0.00';
        return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${s.nombre}</strong></td>
                <td>${s.pj}</td>
                <td>${s.g}</td>
                <td>${s.p}</td>
                <td><strong>${wr}</strong></td>
                <td>${s.gf}</td>
                <td>${s.gc}</td>
                <td>${s.dif > 0 ? '+' : ''}${s.dif}</td>
                <td><strong>${pg}</strong></td>
            </tr>
        `;
    }).join('');
}

const MESES_NL = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function formatFechaNL(f) {
    const p = f.split('/');
    if (p.length === 3) {
        const d = parseInt(p[0], 10);
        const m = parseInt(p[1], 10) - 1;
        if (m >= 0 && m < 12) return `${d} ${MESES_NL[m]} ${p[2]}`;
    }
    return f;
}

// Cada día que se juntaron a jugar es una jornada. No hay un calendario
// armado de antemano: la liga son amistosos sueltos, así que la jornada se
// deduce de la fecha. Se numeran en orden cronológico dentro de la edición,
// o sea que la Jornada 1 es la primera vez que se juntaron ese año.
//
// Se agrupa por la clave numérica AAAAMMDD y no por el texto de la fecha
// porque en el .txt conviven "15/05/2026" y "2/4/2026".
function agruparEnJornadas(partidos, abiertas = []) {
    const porClave = new Map();

    partidos.forEach(m => {
        const clave = m.clave != null ? m.clave : m.fecha;
        if (!porClave.has(clave)) porClave.set(clave, { clave, fecha: m.fecha, partidos: [] });
        porClave.get(clave).partidos.push(m);
    });

    // Una jornada abierta puede estar ya empezada (se le suman los que
    // faltan a los que ya jugaron) o recién armada, sin un solo partido
    // cargado: ahí estrena su propio grupo.
    abiertas.forEach(j => {
        const clave = claveDeFechaNL(j.fecha);
        if (clave == null) return;
        if (!porClave.has(clave)) porClave.set(clave, { clave, fecha: j.fecha, partidos: [] });

        const grupo = porClave.get(clave);
        grupo.abierta = true;
        grupo.pendientes = pendientesDeLaJornada(j, grupo.partidos);
    });

    return [...porClave.values()]
        .sort((a, b) => a.clave - b.clave)
        .map((j, i) => ({ ...j, numero: i + 1 }));
}

// Los cruces que faltan: todos contra todos entre los que vinieron, menos
// los que ya están cargados. Se ordenan con la misma función que usa la
// app (lib/torneo-formatos.js) y recién después se filtran los jugados,
// así el orden que ve acá es el mismo que ve ella en el celular.
function pendientesDeLaJornada(jornada, yaJugados) {
    const jugadores = (jornada.jugadores || []).filter(Boolean);
    if (jugadores.length < 2) return [];
    if (typeof roundRobin !== 'function') return [];

    const todos = typeof ordenarParaQueDescansen === 'function'
        ? ordenarParaQueDescansen(roundRobin(jugadores, 'Amistoso'))
        : roundRobin(jugadores, 'Amistoso');

    const yaEsta = (c) => (yaJugados || []).some(m =>
        (m.j1 === c.j1 && m.j2 === c.j2) || (m.j1 === c.j2 && m.j2 === c.j1)
    );

    return todos.filter(c => !yaEsta(c));
}

// Se muestra una jornada por vez, con flechas para moverse, igual que los
// resultados por fecha del index. Apiladas se amontonaban: una sola jornada
// puede tener 7 partidos y la columna se hacía larguísima.
function renderResultados(partidos, abiertas = []) {
    const cont = document.getElementById('resultados-nl');
    if (!cont) return;

    if (partidos.length === 0 && abiertas.length === 0) {
        cont.innerHTML = '<p style="text-align:center; color:#8b949e;">Sin partidos en esta edición</p>';
        return;
    }

    // Numeradas en orden cronológico pero recorridas de la más reciente a la
    // más vieja, así se entra viendo lo último que se jugó. Adentro de cada
    // jornada los partidos sí van en el orden en que se jugaron.
    const jornadas = agruparEnJornadas(partidos, abiertas).reverse();
    let actual = 0;

    function tablaDeJornada(j) {
        const jugados = j.partidos.map(m => {
            const g = m.marcador.split('-').map(Number);
            const w1 = g[0] > g[1];
            const w2 = g[1] > g[0];
            return `
                <tr>
                    <td style="text-align: right; ${w1 ? 'font-weight: bold; color: #58a6ff;' : ''}">${m.j1}</td>
                    <td style="text-align: center; font-weight: bold; letter-spacing: 2px;">${m.marcador}</td>
                    <td style="text-align: left; ${w2 ? 'font-weight: bold; color: #f85149;' : ''}">${m.j2}</td>
                </tr>`;
        }).join('');

        // Los que faltan van abajo, en su lugar, con la barra de
        // probabilidad donde iría el resultado (igual que en los torneos).
        const porJugar = (j.pendientes || []).map(c => `
            <tr class="fila-pendiente">
                <td style="text-align: right;">${escaparNL(c.j1)}</td>
                <td style="text-align: center; padding: 8px 10px;">
                    ${typeof barraProbabilidad === 'function'
                        ? barraProbabilidad(c.j1, c.j2, true)
                        : '<span style="color:#8b949e;">por jugar</span>'}
                </td>
                <td style="text-align: left;">${escaparNL(c.j2)}</td>
            </tr>`).join('');

        return `
            <div class="table-responsive">
                <table class="ranking-table large-table-font">
                    <thead>
                        <tr>
                            <th style="text-align: right;">Azul</th>
                            <th style="text-align: center;">Resultado</th>
                            <th style="text-align: left;">Rojo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${jugados}
                        ${porJugar}
                    </tbody>
                </table>
            </div>`;
    }

    function pintar() {
        const j = jornadas[actual];
        const n = j.partidos.length;
        const faltan = (j.pendientes || []).length;
        // actual = 0 es la más reciente: la flecha izquierda va para atrás en
        // el tiempo, o sea hacia adelante en el array.
        const hayVieja = actual < jornadas.length - 1;
        const hayNueva = actual > 0;

        const pie = faltan > 0
            ? `${jornadas.length - actual} de ${jornadas.length} · ${n} jugado${n === 1 ? '' : 's'} · faltan ${faltan}`
            : `${jornadas.length - actual} de ${jornadas.length} · ${n} partido${n === 1 ? '' : 's'}`;

        cont.innerHTML = `
            <div class="jornada-nav">
                <button class="jornada-flecha" id="jornada-prev" ${hayVieja ? '' : 'disabled'}
                        aria-label="Jornada anterior">&#8592;</button>
                <div class="jornada-titulo">
                    <span class="jornada-nombre">Jornada ${j.numero}${j.abierta ? ' <span class="jornada-en-curso">en curso</span>' : ''}</span>
                    <span class="jornada-dato">${formatFechaNL(j.fecha)}</span>
                </div>
                <button class="jornada-flecha" id="jornada-next" ${hayNueva ? '' : 'disabled'}
                        aria-label="Jornada siguiente">&#8594;</button>
            </div>
            <div class="jornada-pie">${pie}</div>
            ${tablaDeJornada(j)}
        `;

        const prev = document.getElementById('jornada-prev');
        const next = document.getElementById('jornada-next');
        if (prev) prev.addEventListener('click', () => { if (actual < jornadas.length - 1) { actual++; pintar(); } });
        if (next) next.addEventListener('click', () => { if (actual > 0) { actual--; pintar(); } });
    }

    pintar();
}

function escaparNL(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

function renderEdicion(partidosDelAnio, abiertasDelAnio = []) {
    // Las tablas se calculan solo con lo jugado: una jornada abierta no
    // suma nada a las posiciones hasta que se carguen los resultados.
    const posiciones = calcularPosicionesNL(partidosDelAnio);
    renderPosiciones(posiciones);
    renderGoleadores(posiciones);
    renderEstadisticas(posiciones);
    renderResultados(partidosDelAnio, abiertasDelAnio);

    const elCount = document.getElementById('nl-partidos-count');
    if (elCount) {
        const n = partidosDelAnio.length;
        const base = `${n} partido${n === 1 ? '' : 's'} amistoso${n === 1 ? '' : 's'} jugado${n === 1 ? '' : 's'} en esta edición`;
        elCount.textContent = abiertasDelAnio.length > 0 ? `${base} · hay una jornada en curso` : base;
    }
}
