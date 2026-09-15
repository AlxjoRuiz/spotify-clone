// Sesión — mismo archivo y lógica que sesion.js: nombre desde ?nombre=
// o localStorage, redirect a login sin sesión, limpieza de la URL.
const paramsURL = new URLSearchParams(window.location.search);

let nombreUsuario = paramsURL.get('nombre');
if (!nombreUsuario) {
    nombreUsuario = localStorage.getItem('usuario_nombre');
}

if (!nombreUsuario) {
    window.location.href = 'login.html';
}

if (paramsURL.get('nombre')) {
    window.history.replaceState({}, document.title, window.location.pathname);
}

export { nombreUsuario };

export function cerrarSesion(): void {
    window.location.href = '/auth/logout';
}
