// =====================================================
// PARTIDOS PENDIENTES CON PROBABILIDADES
// =====================================================
// Muestra, dentro de la página de un torneo, los partidos que todavía no
// se jugaron, con la probabilidad de victoria de cada uno (misma fórmula
// que el Creador de Torneo, ver js/probabilidades.js).
//
// De dónde sale el fixture:
//   - Si el torneo tiene su JSON de sorteo (torneos/<slug>.json), el
//     fixture completo se arma con lib/torneo-formatos.js. Eso permite
//     ver un torneo recién sorteado, antes de que se juegue nada.
//   - Si no lo tiene (los torneos viejos, de antes de la app), igual se
//     detecta el caso del partido por el tercer puesto que quedó sin
//     jugar: si hay dos semis y final pero no Tercer Puesto, el cruce son
//     los dos perdedores de las semis.
//
// A medida que se cargan resultados, cada pendiente desaparece de acá y
// pasa a verse como resultado real en la tabla y el bracket de siempre.
// =====================================================

const RUTA_INDICE_TORNEOS = 'torneos/index.json';

// Trae el índice de torneos sorteados (lo mantiene api/torneo-estado.js).
// Si no existe todavía, no es un error: simplemente no hay ninguno.
async function cargarIndiceTorneos() {
    try {
        const res = await fetch(RUTA_INDICE_TORNEOS, { cache: 'no-store' });
        if (!res.ok) return [];
        const lista = await res.json();
        return Array.isArray(lista) ? lista : [];
    } catch {
        return [];
    }
}

async function cargarSorteo(ruta) {
    try {
        const res = await fetch(ruta, { cache: 'no-store' });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// Arma la lista de partidos que faltan jugar en un torneo.
function calcularPendientes(sorteo, partidosDelTorneo) {
    const jugado = (cruce) => partidosDelTorneo.find(m =>
        m.fase === cruce.fase &&
        ((m.j1 === cruce.j1 && m.j2 === cruce.j2) || (m.j1 === cruce.j2 && m.j2 === cruce.j1))
    );

    // Sin sorteo guardado solo podemos deducir el tercer puesto faltante
    if (!sorteo || !sorteo.grupos) {
        return pendientesTercerPuesto(partidosDelTorneo);
    }

    const { grupos } = sorteo;
    const tablaDe = fase => processStandings(partidosDelTorneo.filter(m => m.fase === fase));

    const tablas = {};
    Object.keys(grupos).forEach(l => { tablas[l] = tablaDe(faseDelGrupo(l)); });

    const etapas = [];
    const regular = generarFixtureRegular(grupos);
    etapas.push({ titulo: 'Fase regular', partidos: regular });

    const faltaRegular = regular.some(p => !jugado(p));
    let ganadorEliminatorio = null;
    const usaRepechajes = Object.keys(grupos).length === 3;

    if (usaRepechajes && !faltaRegular) {
        const repechajes = calcularRepechajes(grupos, tablas);
        if (repechajes.length) {
            etapas.push({ titulo: 'Repechajes', partidos: repechajes });
            if (repechajes.every(jugado)) {
                const elim = calcularEliminatorio(tablaDe(FASE_REPECHAJE_2), tablaDe(FASE_REPECHAJE_3));
                if (elim) {
                    etapas.push({ titulo: 'Partido Eliminatorio', partidos: [elim] });
                    const e = jugado(elim);
                    if (e) {
                        const [g1, g2] = e.marcador.split('-').map(Number);
                        ganadorEliminatorio = g1 > g2 ? e.j1 : e.j2;
                    }
                }
            }
        }
    }

    const listoParaSemis = !faltaRegular && (!usaRepechajes || !!ganadorEliminatorio);
    let semis = [];
    if (listoParaSemis) {
        semis = calcularSemifinales(grupos, tablas, ganadorEliminatorio) || [];
        if (semis.length) etapas.push({ titulo: 'Semifinales', partidos: semis });
    }

    const semisJugadas = semis.map(jugado).filter(Boolean);
    if (semis.length === 2 && semisJugadas.length === 2) {
        const defs = calcularDefiniciones(semisJugadas);
        if (defs.length) etapas.push({ titulo: 'Definiciones', partidos: defs });
    }

    return etapas
        .map(e => ({ titulo: e.titulo, partidos: e.partidos.filter(p => !jugado(p)) }))
        .filter(e => e.partidos.length > 0);
}

// Caso de los torneos viejos: les falta el partido por el tercer puesto.
function pendientesTercerPuesto(partidosDelTorneo) {
    const semis = partidosDelTorneo.filter(m => m.fase === 'Semifinal');
    const tieneTercero = partidosDelTorneo.some(m => m.fase === 'Tercer Puesto');
    if (semis.length !== 2 || tieneTercero) return [];

    const perdedores = semis.map(s => {
        const [g1, g2] = s.marcador.split('-').map(Number);
        return g1 > g2 ? s.j2 : s.j1;
    });

    return [{
        titulo: 'Definiciones',
        partidos: [{ j1: perdedores[0], j2: perdedores[1], fase: 'Tercer Puesto' }]
    }];
}

function renderPendientes(etapas) {
    const cont = document.getElementById('pendientes-container');
    if (!cont) return;

    if (!etapas || etapas.length === 0) {
        cont.innerHTML = '';
        cont.style.display = 'none';
        return;
    }
    cont.style.display = '';

    const total = etapas.reduce((n, e) => n + e.partidos.length, 0);

    cont.innerHTML = `
        <h2>📅 Partidos por jugar <span style="color:#8b949e; font-weight:400; font-size:0.7em;">(${total})</span></h2>
        <p style="color:#8b949e; font-size:0.88rem; margin: 0 0 1.2rem 0;">
            La probabilidad sale del Ranking FIFA, el winrate de cada uno y el historial
            entre ellos. A medida que se juegan, cada partido pasa a la tabla con su resultado real.
        </p>
        ${etapas.map(etapa => `
            <div style="margin-bottom: 1.8rem;">
                <h3 style="margin-bottom: 0.9rem; color: #58a6ff;">${escaparTexto(etapa.titulo)}</h3>
                ${etapa.partidos.map(renderFilaPendiente).join('')}
            </div>
        `).join('')}
    `;
}

function renderFilaPendiente(p) {
    const prob = probabilidadGana1(p.j1, p.j2);
    const hist = historialEntre(p.j1, p.j2);

    // Sin datos de alguno de los dos (jugador nuevo que nunca jugó)
    if (prob === null) {
        return `
            <div class="pendiente-fila">
                <div class="pendiente-cruce">
                    <span class="pj pj1">${escaparTexto(p.j1)}</span>
                    <span class="pvs">vs</span>
                    <span class="pj pj2">${escaparTexto(p.j2)}</span>
                </div>
                <div class="pendiente-sin-datos">Sin datos suficientes para estimar</div>
            </div>`;
    }

    const p1 = Math.round(prob * 100);
    const p2 = 100 - p1;
    const favorito = p1 >= p2 ? p.j1 : p.j2;

    const detalleHist = hist
        ? `${hist.victorias1}-${hist.victorias2} en ${hist.total} partido${hist.total === 1 ? '' : 's'} entre ellos`
        : 'nunca se enfrentaron';

    return `
        <div class="pendiente-fila">
            <div class="pendiente-cruce">
                <span class="pj pj1">${escaparTexto(p.j1)}</span>
                <span class="pvs">vs</span>
                <span class="pj pj2">${escaparTexto(p.j2)}</span>
            </div>
            <div class="pendiente-barra">
                <div class="barra-1" style="width:${p1}%;">${p1 >= 18 ? p1 + '%' : ''}</div>
                <div class="barra-2" style="width:${p2}%;">${p2 >= 18 ? p2 + '%' : ''}</div>
            </div>
            <div class="pendiente-detalle">
                Favorito: <strong>${escaparTexto(favorito)}</strong> · ${detalleHist}
            </div>
        </div>`;
}

function escaparTexto(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
