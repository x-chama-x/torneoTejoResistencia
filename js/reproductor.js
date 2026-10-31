// =====================================================
// REPRODUCTOR DE PARTIDOS
// =====================================================
// Las tarjetas del bracket que tienen video (ver js/videos.js) se vuelven
// clickeables y abren el partido en un modal.
//
// Dos detalles que importan más de lo que parece:
//
//   - el <video> se crea sin src y recién se le pone la URL al abrir el
//     modal. Si estuviera en el HTML desde el arranque, el navegador se
//     bajaría metadatos (o el video entero, según el preload) de los tres
//     videos cada vez que alguien entra a la página, y la transferencia
//     de Blob es la que tiene cupo mensual;
//   - al cerrar se vacía el src, si no el navegador sigue descargando en
//     segundo plano aunque el modal ya no se vea.
// =====================================================

let modalVideo = null;

function crearModalVideo() {
    if (modalVideo) return modalVideo;

    const fondo = document.createElement('div');
    fondo.className = 'video-modal';
    fondo.id = 'video-modal';
    fondo.innerHTML = `
        <div class="video-caja" role="dialog" aria-modal="true" aria-labelledby="video-titulo">
            <div class="video-encabezado">
                <span class="video-titulo" id="video-titulo"></span>
                <button class="video-cerrar" type="button" aria-label="Cerrar">&times;</button>
            </div>
            <video class="video-player" controls playsinline preload="none"></video>
        </div>`;

    document.body.appendChild(fondo);

    // Cerrar: la X, el fondo (pero no la caja) y Escape
    fondo.querySelector('.video-cerrar').addEventListener('click', cerrarVideo);
    fondo.addEventListener('click', e => { if (e.target === fondo) cerrarVideo(); });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && fondo.classList.contains('abierto')) cerrarVideo();
    });

    modalVideo = fondo;
    return fondo;
}

function abrirVideo(url, titulo) {
    const modal = crearModalVideo();
    const video = modal.querySelector('.video-player');

    modal.querySelector('.video-titulo').textContent = titulo || '';
    video.src = url;
    modal.classList.add('abierto');
    document.body.classList.add('con-modal');

    // Lo pidió el usuario con un click, así que puede arrancar con sonido.
    // Si el navegador igual lo bloquea, quedan los controles.
    video.play().catch(() => {});
}

function cerrarVideo() {
    if (!modalVideo) return;
    const video = modalVideo.querySelector('.video-player');

    video.pause();
    video.removeAttribute('src');
    video.load();                 // corta la descarga en curso

    modalVideo.classList.remove('abierto');
    document.body.classList.remove('con-modal');
}

// Un solo listener para toda la página: las tarjetas se redibujan cada vez
// que se cambia de torneo, así que engancharse a cada una sería enganchar
// y desenganchar todo el tiempo.
document.addEventListener('click', e => {
    const tarjeta = e.target.closest('.match-card.con-video');
    if (!tarjeta) return;
    abrirVideo(tarjeta.dataset.video, tarjeta.dataset.videoTitulo);
});

// La tarjeta es un botón: con el teclado también se abre.
document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const tarjeta = e.target.closest && e.target.closest('.match-card.con-video');
    if (!tarjeta) return;
    e.preventDefault();
    abrirVideo(tarjeta.dataset.video, tarjeta.dataset.videoTitulo);
});
