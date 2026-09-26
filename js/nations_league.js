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

document.addEventListener('DOMContentLoaded', () => {
    fetch('enfrentamientos_directos.txt')
        .then(res => res.text())
        .then(data => {
            const partidos = parsearAmistosos(data);

            if (partidos.length === 0) {
                const cont = document.getElementById('year-selector');
                if (cont) cont.innerHTML = '<p style="color:#8b949e;">Todavía no hay partidos amistosos cargados.</p>';
                return;
            }

            const anios = [...new Set(partidos.map(p => p.anio))].sort((a, b) => b - a);
            const anioActual = new Date().getFullYear();
            const anioInicial = anios.includes(anioActual) ? anioActual : anios[0];

            renderSelectorAnios(anios, anioInicial, (anio) => {
                renderEdicion(partidos.filter(p => p.anio === anio));
            });

            renderEdicion(partidos.filter(p => p.anio === anioInicial));
        })
        .catch(err => console.error('Error cargando Tejo Nations League:', err));
});

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

function renderResultados(partidos) {
    const cont = document.getElementById('resultados-nl');
    if (!cont) return;

    if (partidos.length === 0) {
        cont.innerHTML = '<p style="text-align:center; color:#8b949e;">Sin partidos en esta edición</p>';
        return;
    }

    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const formatFecha = (f) => {
        const p = f.split('/');
        if (p.length === 3) {
            const d = parseInt(p[0], 10);
            const m = parseInt(p[1], 10) - 1;
            if (m >= 0 && m < 12) return `${d} ${meses[m]} ${p[2]}`;
        }
        return f;
    };

    // El .txt está en orden cronológico ascendente: mostramos el más reciente primero.
    const ordenados = [...partidos].reverse();

    cont.innerHTML = `
        <div class="table-responsive">
            <table class="ranking-table large-table-font">
                <thead>
                    <tr>
                        <th style="text-align: right;">Azul</th>
                        <th style="text-align: center;">Resultado</th>
                        <th style="text-align: left;">Rojo</th>
                        <th style="text-align: center; color: #8b949e; font-weight: normal;">Fecha</th>
                    </tr>
                </thead>
                <tbody>
                    ${ordenados.map(m => {
                        const g = m.marcador.split('-').map(Number);
                        const w1 = g[0] > g[1];
                        const w2 = g[1] > g[0];
                        return `
                            <tr>
                                <td style="text-align: right; ${w1 ? 'font-weight: bold; color: #58a6ff;' : ''}">${m.j1}</td>
                                <td style="text-align: center; font-weight: bold; letter-spacing: 2px;">${m.marcador}</td>
                                <td style="text-align: left; ${w2 ? 'font-weight: bold; color: #f85149;' : ''}">${m.j2}</td>
                                <td style="text-align: center; font-size: 0.78em; color: #8b949e;">${formatFecha(m.fecha)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderEdicion(partidosDelAnio) {
    const posiciones = calcularPosicionesNL(partidosDelAnio);
    renderPosiciones(posiciones);
    renderGoleadores(posiciones);
    renderEstadisticas(posiciones);
    renderResultados(partidosDelAnio);

    const elCount = document.getElementById('nl-partidos-count');
    if (elCount) {
        const n = partidosDelAnio.length;
        elCount.textContent = `${n} partido${n === 1 ? '' : 's'} amistoso${n === 1 ? '' : 's'} jugado${n === 1 ? '' : 's'} en esta edición`;
    }
}
