// ============================================================
// NOTIFICACIÓN — Toasts no bloqueantes estilo Spotify.
// Reemplazan a los alert() del navegador: no frenan la app.
// Uso: mostrarToast('Mensaje', 'ok' | 'error' | 'info')
// ============================================================

const DURACION_MS = 3000;

// Muestra un toast flotante arriba a la derecha que se cierra solo
export function mostrarToast(mensaje, tipo = 'info') {
    let contenedor = document.querySelector('#toasts');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'toasts';
        document.body.appendChild(contenedor);
    }

    const toast = document.createElement('div');
    toast.classList.add('toast', `toast-${tipo}`);

    const icono = tipo === 'error' ? 'fa-circle-exclamation' : 'fa-circle-check';
    toast.innerHTML = `<i class="fa-solid ${icono}"></i>`;

    const texto = document.createElement('span');
    texto.textContent = mensaje;
    toast.appendChild(texto);

    contenedor.appendChild(toast);

    // Animación de entrada (el CSS hace la transición)
    requestAnimationFrame(() => toast.classList.add('visible'));

    // Se oculta solo y luego se elimina del DOM
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
    }, DURACION_MS);
}
