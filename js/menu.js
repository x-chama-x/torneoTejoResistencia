document.addEventListener('DOMContentLoaded', () => {
    const menuHTML = `
    <button id="menu-toggle" class="menu-toggle" title="Abrir Menú">☰</button>
    <nav id="sidebar" class="sidebar">
        <h2>Tejo</h2>
        <a href="index.html" title="Inicio">Inicio</a>
        <a href="simulador.html" title="Simulador">Simulador</a>
        <a href="montecarlo.html" title="Cálculo de predicciones">Predicciones</a>
        <a href="partido.html" title="Simulador de Partido 1vs1">Partido 1vs1</a>
        <a href="torneo.html" title="Creador de Torneo">Creador de Torneo</a>
        <a href="playoffs.html" title="Playoffs">Playoffs</a>
        <a href="torneo1.html" title="Primer Torneo">Primer Torneo</a>
        <a href="torneo2.html" title="Segundo Torneo">Segundo Torneo</a>
        <div class="sidebar-footer" style="margin-top: auto; text-align: center; padding-top: 30px;">
            <img src="img/favicon2.png" alt="Logo" style="width: 50px; margin-bottom: 10px;">
            <br>
            <a href="https://github.com/x-chama-x" target="_blank" rel="noopener noreferrer" style="font-size: 0.9em; padding: 0; display: inline-block;">x-chama-x</a>
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
