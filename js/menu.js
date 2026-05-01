document.addEventListener('DOMContentLoaded', () => {
    const menuHTML = `
    <button id="menu-toggle" class="menu-toggle" title="Abrir Menú">☰</button>
    <nav id="sidebar" class="sidebar">
        <h2>Tejo</h2>
        <a href="index.html" title="Inicio">🏠 Inicio</a>
        <a href="simulador.html" title="Simulador">🏠 Simulador</a>
        <a href="montecarlo.html" title="Cálculo de predicciones">📊 Predicciones</a>
        <a href="partido.html" title="Simulador de Partido 1vs1">⚔️ Partido 1vs1</a>
        <a href="torneo.html" title="Creador de Torneo">🏆 Creador de Torneo</a>
        <a href="playoffs.html" title="Playoffs">🏅 Playoffs</a>
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
