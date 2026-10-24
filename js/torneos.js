// =====================================================
// PÁGINA DE TORNEOS (selector + render)
// =====================================================
// Reemplaza a torneo1.html, torneo2.html y torneo3.html, que eran la misma
// página con el nombre cambiado a mano.
//
// La lista de torneos sale de dos lados:
//   - enfrentamientos_directos.txt, para los que ya tienen partidos jugados.
//   - torneos/index.json, para los que se sortearon desde la app y todavía
//     no jugaron nada (sin esto, un torneo recién sorteado sería invisible).
//
// En los dos casos aparecen solos: no hay que crear ninguna página ni tocar
// el menú. El formato (liga o grupos) también se deduce, mirando si las fases
// dicen "Fase de Liga" o "Fase de Grupos (X)", o leyendo el sorteo guardado.
// =====================================================

// Sorteos guardados, por nombre de torneo. Se usan para armar el fixture
// completo y mostrar los partidos que faltan jugar.
const sorteosPorTorneo = {};

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const texto = await fetch('enfrentamientos_directos.txt', { cache: 'no-store' }).then(r => r.text());

        // Deja listo el cálculo de probabilidades para los partidos pendientes
        prepararProbabilidades(texto);

        const jugados = listarTorneos(texto);

        // Torneos sorteados desde la app (pueden no tener ningún partido aún)
        const indice = await cargarIndiceTorneos();
        await Promise.all(indice.map(async item => {
            const sorteo = await cargarSorteo(item.ruta);
            if (sorteo && sorteo.nombre) sorteosPorTorneo[sorteo.nombre] = sorteo;
        }));

        // Se juntan las dos listas sin repetir, dejando al final los sorteados
        // que todavía no jugaron nada (son los más nuevos).
        const torneos = jugados.slice();
        Object.keys(sorteosPorTorneo).forEach(nombre => {
            if (!torneos.some(t => t.nombre === nombre)) {
                torneos.push({ nombre, desde: Infinity });
            }
        });

        if (torneos.length === 0) {
            document.getElementById('titulo-torneo').textContent = 'Torneos';
            document.getElementById('torneo-selector').innerHTML =
                '<p style="color:#8b949e;">Todavía no hay torneos cargados.</p>';
            return;
        }

        // Si viene ?t=<nombre> (desde los links viejos torneoN.html) se abre ese;
        // si no, el más reciente.
        const pedido = new URLSearchParams(window.location.search).get('t');
        const inicial = torneos.find(t => t.nombre === pedido) || torneos[torneos.length - 1];

        renderSelector(texto, torneos, inicial.nombre);
        mostrarTorneo(texto, inicial.nombre);
    } catch (err) {
        console.error('Error cargando los torneos:', err);
    }
});

function renderSelector(texto, torneos, seleccionado) {
    const cont = document.getElementById('torneo-selector');
    if (!cont) return;

    cont.innerHTML = torneos.map(t =>
        `<button class="torneo-btn${t.nombre === seleccionado ? ' active' : ''}" data-torneo="${escaparAtributo(t.nombre)}">${etiquetaCorta(t.nombre)}</button>`
    ).join('');

    cont.querySelectorAll('.torneo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            cont.querySelectorAll('.torneo-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            mostrarTorneo(texto, btn.dataset.torneo);
            // Deja el torneo elegido en la URL, para poder compartir el link
            const url = new URL(window.location);
            url.searchParams.set('t', btn.dataset.torneo);
            history.replaceState(null, '', url);
        });
    });
}

// "Primer torneo de hockey de mesa" -> "Primer". Si el nombre no sigue ese
// patrón, se muestra entero (recortado si es muy largo).
function etiquetaCorta(nombre) {
    const corto = nombre.replace(/\s*torneo de hockey de mesa\s*/i, '').trim();
    if (corto && corto.length < nombre.length) return corto;
    return nombre.length > 18 ? nombre.slice(0, 17) + '…' : nombre;
}

function mostrarTorneo(texto, nombreTorneo) {
    document.getElementById('titulo-torneo').textContent = nombreTorneo;

    const esLiga = detectarEsLiga(texto, nombreTorneo);
    const bloqueLiga = document.getElementById('bloque-liga');
    const bloqueGrupos = document.getElementById('bloque-grupos');
    const stats = document.getElementById('stats-container');

    bloqueLiga.style.display = esLiga ? '' : 'none';
    bloqueGrupos.style.display = esLiga ? 'none' : '';

    // El contenedor de estadísticas es uno solo y se reubica según el formato:
    // en liga va dentro de la grilla (debajo de Posiciones en PC) y en grupos
    // va al final del bloque de grupos.
    if (stats) {
        const destino = esLiga ? document.getElementById('col-stats') : bloqueGrupos;
        if (destino && stats.parentElement !== destino) destino.appendChild(stats);
    }

    limpiarRestos();

    // El plantel del sorteo permite dibujar las tablas de posiciones en cero
    // antes de que se juegue el primer partido (lo lee historial_torneos.js).
    const sorteo = sorteosPorTorneo[nombreTorneo];
    window.torneoPlantel = sorteo ? sorteo.grupos : null;

    const delTorneo = partidosDeTorneo(texto, nombreTorneo);

    // Los pendientes se inyectan recien cuando cargarTorneo termino de
    // dibujar el bracket y las tablas, porque van adentro de esos mismos.
    Promise.resolve(cargarTorneo(nombreTorneo)).then(() => {
        inyectarPendientes(calcularPendientes(sorteo, delTorneo));
        ocultarSeccionesVacias(delTorneo, esLiga, sorteo);
    });
}

// Un torneo recien sorteado, o uno que todavia no llego a playoffs, no tiene
// nada que mostrar en esas secciones: sin esto quedarian un bracket y una
// tabla vacios, que parecen un error.
function ocultarSeccionesVacias(partidos, esLiga, sorteo) {
    // El bracket se muestra si ya hay partidos de playoffs o si quedo alguna
    // tarjeta con la probabilidad de un cruce pendiente.
    const hayPlayoffs = partidos.some(m =>
        ['Semifinal', 'Final', 'Tercer Puesto'].includes(m.fase)) ||
        !!document.querySelector('#playoff-bracket .match-card, #tercer-puesto-container .match-card');

    const panelPlayoffs = document.querySelector('.playoffs-section');
    if (panelPlayoffs) panelPlayoffs.style.display = hayPlayoffs ? '' : 'none';

    // La fase regular se muestra siempre que haya sorteo (aunque sea en cero)
    const hayFaseRegular = partidos.some(m => m.fase.startsWith('Fase')) || !!sorteo;
    if (!hayFaseRegular) {
        const bloque = document.getElementById(esLiga ? 'bloque-liga' : 'bloque-grupos');
        if (bloque) bloque.style.display = 'none';
    }
}

// Partidos de un torneo, en el formato que esperan processStandings y
// las funciones de lib/torneo-formatos.js.
function partidosDeTorneo(texto, nombreTorneo) {
    return texto.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(l => l.split(','))
        .filter(p => p.length >= 7 && p[4].trim() === nombreTorneo)
        .map(p => ({
            j1: p[0].trim(),
            j2: p[1].trim(),
            res: p[2].trim(),
            marcador: p[3].trim(),
            fase: p[6].trim()
        }));
}

// Mira las fases de ese torneo para saber si fue liga o grupos, igual que
// hace historial_torneos.js al renderizar.
function detectarEsLiga(texto, nombreTorneo) {
    // Si todavía no jugó nada, el formato sale del sorteo guardado
    const sorteo = sorteosPorTorneo[nombreTorneo];
    if (sorteo && sorteo.grupos && !!sorteo.grupos.all) return true;

    return texto.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'))
        .map(l => l.split(','))
        .filter(p => p.length >= 7 && p[4].trim() === nombreTorneo)
        .some(p => p[6].trim() === 'Fase de Liga');
}

// Al cambiar de torneo hay que limpiar lo que quedó del anterior: los
// contenedores que historial_torneos.js no toca cuando el formato es distinto
// (por ejemplo, viniendo de un torneo de liga a uno de grupos) se quedarían
// con la tabla vieja colgada.
function limpiarRestos() {
    ['resultados-fase', 'tabla-body', 'grupos-container', 'stats-container', 'playoff-bracket', 'tercer-puesto-container', 'repechajes-container']
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });

    document.querySelectorAll('.leyenda-clasificacion, .aviso-empate-multiple')
        .forEach(el => el.remove());
}

function escaparAtributo(str) {
    return String(str).replace(/"/g, '&quot;');
}
