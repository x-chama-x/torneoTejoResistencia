// =====================================================
// PÁGINA DE TORNEOS (selector + render)
// =====================================================
// Reemplaza a torneo1.html, torneo2.html y torneo3.html, que eran la misma
// página con el nombre cambiado a mano.
//
// La lista de torneos sale de enfrentamientos_directos.txt (ver listarTorneos
// en historial_torneos.js), así que un torneo nuevo aparece solo acá apenas
// se carga su primer partido: no hay que crear ninguna página ni tocar el menú.
//
// El formato (liga o grupos) también se deduce del archivo, mirando si las
// fases dicen "Fase de Liga" o "Fase de Grupos (X)".
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    fetch('enfrentamientos_directos.txt')
        .then(res => res.text())
        .then(texto => {
            const torneos = listarTorneos(texto);

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
        })
        .catch(err => console.error('Error cargando los torneos:', err));
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
    cargarTorneo(nombreTorneo);
}

// Mira las fases de ese torneo para saber si fue liga o grupos, igual que
// hace historial_torneos.js al renderizar.
function detectarEsLiga(texto, nombreTorneo) {
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
    ['resultados-fase', 'tabla-body', 'grupos-container', 'stats-container', 'playoff-bracket', 'tercer-puesto-container']
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
