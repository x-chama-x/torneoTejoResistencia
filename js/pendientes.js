// =====================================================
// PARTIDOS PENDIENTES, EN SU LUGAR
// =====================================================
// Los partidos que todavía no se jugaron no van en una sección aparte:
// se dibujan donde va a ir su resultado cuando se juegue.
//
//   - Fase de liga y de grupos -> una fila más en la tabla de Resultados,
//     con la barra de probabilidad en la columna del marcador.
//   - Semifinales, final y tercer puesto -> la tarjeta del bracket, con
//     la barra en lugar del resultado (mismo estilo que la página de
//     Playoffs).
//   - Repechajes y eliminatorio (formato de 9) -> igual que la liga.
//
// Cuando el partido se juega, la fila o la tarjeta pasan a mostrar el
// resultado real y el pendiente desaparece solo, porque todo se vuelve a
// calcular contra enfrentamientos_directos.txt.
//
// La probabilidad sale de js/probabilidades.js.
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

// =====================================================
// Qué falta jugar
// =====================================================

function calcularPendientes(sorteo, partidosDelTorneo) {
    const jugado = (cruce) => partidosDelTorneo.find(m =>
        m.fase === cruce.fase &&
        ((m.j1 === cruce.j1 && m.j2 === cruce.j2) || (m.j1 === cruce.j2 && m.j2 === cruce.j1))
    );

    // Sin sorteo guardado (torneos viejos) solo se puede deducir el tercer puesto
    if (!sorteo || !sorteo.grupos) {
        return pendientesTercerPuesto(partidosDelTorneo);
    }

    const { grupos } = sorteo;
    const tablaDe = fase => processStandings(partidosDelTorneo.filter(m => m.fase === fase));

    const tablas = {};
    Object.keys(grupos).forEach(l => { tablas[l] = tablaDe(faseDelGrupo(l)); });

    const cruces = [];
    const regular = generarFixtureRegular(grupos);
    cruces.push(...regular);

    const faltaRegular = regular.some(p => !jugado(p));
    let ganadorEliminatorio = null;
    const usaRepechajes = Object.keys(grupos).length === 3;

    if (usaRepechajes && !faltaRegular) {
        const repechajes = calcularRepechajes(grupos, tablas);
        cruces.push(...repechajes);

        if (repechajes.length && repechajes.every(jugado)) {
            const elim = calcularEliminatorio(tablaDe(FASE_REPECHAJE_2), tablaDe(FASE_REPECHAJE_3));
            if (elim) {
                cruces.push(elim);
                const e = jugado(elim);
                if (e) {
                    const [g1, g2] = e.marcador.split('-').map(Number);
                    ganadorEliminatorio = g1 > g2 ? e.j1 : e.j2;
                }
            }
        }
    }

    // Las semis salen del sorteo guardado en el JSON (no se siembran solas).
    // Mientras no esten sorteadas, no hay cruces que mostrar.
    const listoParaSemis = !faltaRegular && (!usaRepechajes || !!ganadorEliminatorio);
    let semis = [];
    if (listoParaSemis) {
        semis = calcularSemifinales(grupos, tablas, ganadorEliminatorio, sorteo.semifinales) || [];
        cruces.push(...semis);

        if (!semis.length) {
            const clasificados = calcularClasificados(grupos, tablas, ganadorEliminatorio);
            if (clasificados) avisarSemisSinSortear(clasificados);
        }
    }

    const semisJugadas = semis.map(jugado).filter(Boolean);
    if (semis.length === 2 && semisJugadas.length === 2) {
        cruces.push(...calcularDefiniciones(semisJugadas));
    }

    return cruces.filter(c => !jugado(c));
}

// Torneos viejos a los que les quedó pendiente el partido por el tercer puesto.
function pendientesTercerPuesto(partidosDelTorneo) {
    const semis = partidosDelTorneo.filter(m => m.fase === 'Semifinal');
    const tieneTercero = partidosDelTorneo.some(m => m.fase === 'Tercer Puesto');
    if (semis.length !== 2 || tieneTercero) return [];

    const perdedores = semis.map(s => {
        const [g1, g2] = s.marcador.split('-').map(Number);
        return g1 > g2 ? s.j2 : s.j1;
    });

    return [{ j1: perdedores[0], j2: perdedores[1], fase: 'Tercer Puesto' }];
}

// =====================================================
// Dibujo
// =====================================================

// claseProb(), porcentaje() y barraProbabilidad() viven en
// js/probabilidades.js: tambien las usa la Tejo Nations League para los
// partidos que faltan de una jornada.

// Tarjeta del bracket para un cruce que todavía no se jugó.
// Mantiene la clase match-card para que las líneas del bracket (que miden
// esas tarjetas) sigan dibujándose bien.
function tarjetaProbabilidad(cruce, titulo) {
    return `
        <div class="match-card match-card-pendiente">
            <div class="match-number">${escaparTexto(titulo)}</div>
            <div class="match-players">
                <div class="player blue">${escaparTexto(cruce.j1)}</div>
                <div class="vs">VS</div>
                <div class="player red">${escaparTexto(cruce.j2)}</div>
            </div>
            ${barraProbabilidad(cruce.j1, cruce.j2)}
            <div class="sf-insight">Probabilidad de ganar</div>
        </div>`;
}

// Fila de tabla de Resultados para un cruce pendiente.
function filaProbabilidad(cruce) {
    return `
        <tr class="fila-pendiente">
            <td style="text-align: right;">${escaparTexto(cruce.j1)}</td>
            <td style="text-align: center; padding: 8px 10px;">${barraProbabilidad(cruce.j1, cruce.j2, true)}</td>
            <td style="text-align: left;">${escaparTexto(cruce.j2)}</td>
        </tr>`;
}

// Mira cada semifinal sorteada y, si ya se jugó, saca ganador y perdedor.
// Es lo que permite que la final deje de decir "Ganador SF1" en cuanto esa
// semi se carga, y que el que perdió salga de la pelea por el título.
function estadoDeLasSemis(semisSorteadas, partidosDelTorneo) {
    const comoPar = s => Array.isArray(s) ? s : [s.j1, s.j2];

    return semisSorteadas.map(par => {
        const [a, b] = comoPar(par);
        const jugado = (partidosDelTorneo || []).find(m =>
            m.fase === 'Semifinal' &&
            ((m.j1 === a && m.j2 === b) || (m.j1 === b && m.j2 === a))
        );

        if (!jugado) return { a, b, ganador: null, perdedor: null };

        const [g1, g2] = jugado.marcador.split('-').map(Number);
        return {
            a, b,
            ganador: g1 > g2 ? jugado.j1 : jugado.j2,
            perdedor: g1 > g2 ? jugado.j2 : jugado.j1
        };
    });
}

// Tarjeta de la final cuando todavía no se sabe quiénes la juegan.
// En vez de dejar el hueco vacío, muestra quiénes pueden llegar y con qué
// chance cada uno de salir campeón (ver probabilidadesDeCampeon). Si una de
// las semis ya se jugó, su ganador aparece con nombre y propio y las
// probabilidades se recalculan con eso.
function tarjetaFinalPorDefinirse(semis, estados) {
    const candidatos = probabilidadesDeCampeon(semis, estados.map(e => e.ganador));

    const lista = candidatos ? `
        <div class="candidatos">
            <div class="candidatos-titulo">Candidatos al título</div>
            ${candidatos.map(c => {
                const pct = (c.campeon * 100);
                if (c.eliminado) {
                    return `
                        <div class="candidato eliminado">
                            <span class="candidato-nombre">${escaparTexto(c.nombre)}</span>
                            <span class="candidato-barra"></span>
                            <span class="candidato-pct">eliminado</span>
                        </div>`;
                }
                return `
                    <div class="candidato">
                        <span class="candidato-nombre">${escaparTexto(c.nombre)}</span>
                        <span class="candidato-barra">
                            <span class="candidato-relleno ${claseProb(c.campeon)}" style="width:${Math.max(pct, 2)}%"></span>
                        </span>
                        <span class="candidato-pct">${pct.toFixed(1)}%</span>
                    </div>`;
            }).join('')}
        </div>` : '';

    return `
        <div class="match-card match-card-pendiente">
            <div class="match-number">Gran Final</div>
            <div class="match-players">
                ${nombreOEtiqueta(estados[0].ganador, 'Ganador SF1', 'blue')}
                <div class="vs">VS</div>
                ${nombreOEtiqueta(estados[1].ganador, 'Ganador SF2', 'red')}
            </div>
            ${lista}
            <div class="sf-insight">Se define con las semifinales</div>
        </div>`;
}

// Si ya se sabe quién es, va el nombre; si no, la etiqueta en gris.
function nombreOEtiqueta(nombre, etiqueta, color) {
    return nombre
        ? `<div class="player ${color}">${escaparTexto(nombre)}</div>`
        : `<div class="player por-definir">${etiqueta}</div>`;
}

// Lo mismo para el tercer puesto: lo juegan los dos que pierdan las semis.
function tarjetaTercerPuestoPorDefinirse(estados) {
    return `
        <h3 style="margin-bottom: 1rem; color:#f39c12; text-align: center;">🥉 Tercer Puesto</h3>
        <div style="display: flex; justify-content: center;">
            <div class="match-card match-card-pendiente">
                <div class="match-number">Tercer y Cuarto Puesto</div>
                <div class="match-players">
                    ${nombreOEtiqueta(estados[0].perdedor, 'Perdedor SF1', 'blue')}
                    <div class="vs">VS</div>
                    ${nombreOEtiqueta(estados[1].perdedor, 'Perdedor SF2', 'red')}
                </div>
                <div class="sf-insight">Se define con las semifinales</div>
            </div>
        </div>`;
}

// Mete cada pendiente donde corresponde. Se llama después de que
// cargarTorneo() terminó de dibujar el torneo.
function inyectarPendientes(pendientes, semisDelTorneo, partidosDelTorneo) {
    const porFase = {};
    (pendientes || []).forEach(p => {
        if (!porFase[p.fase]) porFase[p.fase] = [];
        porFase[p.fase].push(p);
    });

    // --- Bracket: semis, final y tercer puesto ---
    const semis = porFase['Semifinal'] || [];
    if (semis.length) {
        // Se llenan los huecos que dejó el bracket, en orden
        ['sf1-wrap', 'sf2-wrap'].forEach(id => {
            const wrap = document.getElementById(id);
            if (wrap && !wrap.querySelector('.match-card') && semis.length) {
                const cruce = semis.shift();
                const titulo = id === 'sf1-wrap' ? 'Semifinal 1' : 'Semifinal 2';
                wrap.innerHTML = tarjetaProbabilidad(cruce, titulo);
            }
        });
    }

    const estados = (semisDelTorneo && semisDelTorneo.length === 2)
        ? estadoDeLasSemis(semisDelTorneo, partidosDelTorneo)
        : null;

    const final = (porFase['Final'] || [])[0];
    const finalWrap = document.getElementById('final-wrap');
    if (finalWrap && !finalWrap.querySelector('.match-card')) {
        if (final) {
            // Ya se jugaron las dos semis: se sabe quiénes la juegan
            finalWrap.innerHTML = tarjetaProbabilidad(final, 'Gran Final');
        } else if (estados) {
            // Las semis están sorteadas pero falta alguna: candidatos al título
            finalWrap.innerHTML = tarjetaFinalPorDefinirse(semisDelTorneo, estados);
        }
    }

    const tercero = (porFase['Tercer Puesto'] || [])[0];
    const tpc = document.getElementById('tercer-puesto-container');
    if (tpc && !tpc.querySelector('.match-card')) {
        if (tercero) {
            tpc.innerHTML = `
                <h3 style="margin-bottom: 1rem; color:#f39c12; text-align: center;">🥉 Tercer Puesto</h3>
                <div style="display: flex; justify-content: center;">
                    ${tarjetaProbabilidad(tercero, 'Tercer y Cuarto Puesto')}
                </div>`;
        } else if (estados) {
            tpc.innerHTML = tarjetaTercerPuestoPorDefinirse(estados);
        }
    }

    // Las líneas del bracket se miden sobre las tarjetas: hay que redibujarlas
    if (typeof drawBracketLines === 'function') {
        requestAnimationFrame(() => drawBracketLines());
    }

    // --- Tablas de resultados: liga, grupos y repechajes ---
    Object.keys(porFase).forEach(fase => {
        if (['Semifinal', 'Final', 'Tercer Puesto'].includes(fase)) return;
        agregarFilasPendientes(fase, porFase[fase]);
    });
}

// Busca la tabla de Resultados de esa fase y le agrega las filas pendientes.
function agregarFilasPendientes(fase, cruces) {
    const tabla = buscarTablaDeResultados(fase);
    if (!tabla) return;

    const tbody = tabla.querySelector('tbody');
    if (!tbody) return;
    tbody.insertAdjacentHTML('beforeend', cruces.map(filaProbabilidad).join(''));
}

// La tabla de la fase de liga vive en #resultados-fase. Las de grupos y
// repechajes están dentro del bloque que arranca con el título de esa fase.
function buscarTablaDeResultados(fase) {
    if (fase === 'Fase de Liga') {
        return document.querySelector('#resultados-fase table');
    }

    const contenedores = ['grupos-container', 'repechajes-container'];
    for (const id of contenedores) {
        const cont = document.getElementById(id);
        if (!cont) continue;

        for (const bloque of cont.children) {
            const titulo = bloque.querySelector('h3');
            if (titulo && titulo.textContent.trim() === fase) {
                // En esos bloques hay dos tablas: posiciones y resultados
                const tablas = bloque.querySelectorAll('table');
                if (tablas.length >= 2) return tablas[1];
            }
        }
    }
    return null;
}

// Cuando la fase regular terminó pero las semis todavía no se sortearon,
// se muestran los clasificados en el lugar del bracket.
function avisarSemisSinSortear(clasificados) {
    const bracket = document.getElementById('playoff-bracket');
    if (!bracket) return;

    bracket.innerHTML = `
        <div style="text-align:center; padding: 1.5rem 1rem;">
            <p style="color:#d29922; font-weight:700; margin-bottom: 0.8rem;">
                🎲 Semifinales sin sortear
            </p>
            <p style="color:#8b949e; font-size:0.9rem; margin-bottom: 1rem;">
                Terminó la fase regular. Estos son los cuatro clasificados:
            </p>
            <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap;">
                ${clasificados.map(n => `
                    <span style="padding:8px 16px; border-radius:999px; background:#21262d;
                                 border:1px solid #30363d; font-weight:700; color:#58a6ff;">
                        ${escaparTexto(n)}
                    </span>`).join('')}
            </div>
        </div>`;
}

function escaparTexto(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}
