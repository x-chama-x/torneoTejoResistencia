// Menú lateral, igual en todas las páginas. Los links arrastran el
// ?deporte= de la página actual (urlDeporte, de js/deportes.js), así que
// navegando dentro del metegol no se vuelve al tejo sin querer. Abajo de
// todo hay un link para pasar al otro deporte, a la misma página.
document.addEventListener('DOMContentLoaded', () => {
    // [archivo, texto, title, deportes donde aparece (null = todos)]
    const paginas = [
        ['index.html', 'Inicio', 'Inicio', null],
        ['simulador.html', 'Simulador', 'Simulador', null],
        ['partido.html', 'Partido 1vs1', 'Simulador de Partido 1vs1', null],
        ['torneos.html', 'Torneos', 'Torneos', null],
        ['copadecampeones.html', 'Copa de Campeones', 'Copa de Campeones', null],
        ['nationsleague.html', DEPORTE.nombreLiga, DEPORTE.nombreLiga, null],
        ['airhockeygame.html', 'Air Hockey', 'Air Hockey', ['tejo']],
        ['sabermas.html', 'Saber Más', 'Saber Más', ['tejo']]
    ];
    const links = paginas
        .filter(([, , , solo]) => !solo || solo.includes(DEPORTE.id))
        .map(([href, texto, title]) => `<a href="${urlDeporte(href)}" data-pagina="${href}" title="${title}">${texto}</a>`)
        .join('\n        ');

    // Si la página actual no existe en el otro deporte (ej. Air Hockey),
    // el cambio de deporte lleva al inicio.
    const actual = window.location.pathname.split('/').pop() || 'index.html';
    const cambios = Object.values(DEPORTES)
        .filter(d => d.id !== DEPORTE.id)
        .map(d => {
            const existe = paginas.some(([href, , , solo]) => href === actual && (!solo || solo.includes(d.id)));
            const destino = urlDeporte(existe ? actual + window.location.hash : 'index.html', d.id);
            return `<a href="${destino}" class="cambiar-deporte" title="Ir a ${d.nombre}">⇄ Ir a ${d.nombre}</a>`;
        })
        .join('\n        ');

    const menuHTML = `
    <button id="menu-toggle" class="menu-toggle" title="Abrir Menú">☰</button>
    <nav id="sidebar" class="sidebar">
        <h2>${DEPORTE.nombre}</h2>
        ${links}
        ${cambios}
        <div class="sidebar-footer">
            <img src="img/favicon2.png" alt="Logo">
            <br>
            <a href="https://github.com/x-chama-x" target="_blank" rel="noopener noreferrer" class="github-link">𝑷𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚 𝒙_𝒄𝒉𝒂𝒎𝒂_𝒙</a>
        </div>
    </nav>
    `;

    document.body.insertAdjacentHTML('afterbegin', menuHTML);

    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        // Add active class to current page link
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        sidebar.querySelectorAll('a[data-pagina]').forEach(link => {
            if (link.dataset.pagina === currentPath) {
                link.classList.add('active');
            }
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 900) {
                if (!sidebar.contains(e.target) && e.target !== menuToggle) {
                    sidebar.classList.remove('open');
                }
            }
        });
    }
});
