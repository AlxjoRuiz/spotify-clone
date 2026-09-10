// ============================================================
// SESIÓN — Nombre de usuario, redirección y logout
// Lee el nombre desde la URL (lo manda Spotify tras el login)
// o desde localStorage (login de desarrollo). Si no hay sesión
// activa, redirige a login.html. Configura el botón de logout.
// ============================================================

const paramsURL = new URLSearchParams(window.location.search);

// Nombre desde la URL o desde localStorage
let nombreUsuario = paramsURL.get('nombre');
if (!nombreUsuario) {
    nombreUsuario = localStorage.getItem('usuario_nombre');
}

// Sin nombre => no hay sesión activa
if (!nombreUsuario) {
    window.location.href = 'login.html';
}

// Limpia la URL para que no se vea ?nombre=... en la barra de direcciones
if (paramsURL.get('nombre')) {
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Muestra el nombre en el perfil del header
document.querySelector('#nombre-perfil').textContent = nombreUsuario;

// Cerrar sesión
document.querySelector('#btn-logout').addEventListener('click', () => {
    window.location.href = '/auth/logout';
});

export { nombreUsuario };