// Sesión — el nombre es solo decorativo. La sesión real se valida con las
// llamadas /api (si expira, api.ts redirige al login con un 401).
const paramsURL = new URLSearchParams(window.location.search);

let nombreUsuario = paramsURL.get('nombre');
// Persistimos solo el nombre para la interfaz; no se usa como prueba de
// autenticación. Esa validación siempre la realiza el backend mediante cookie.
if (nombreUsuario) localStorage.setItem('usuario_nombre', nombreUsuario);
if (!nombreUsuario) {
    nombreUsuario = localStorage.getItem('usuario_nombre');
}
nombreUsuario = nombreUsuario || 'Usuario';

if (paramsURL.get('nombre')) {
    window.history.replaceState({}, document.title, window.location.pathname);
}

export { nombreUsuario };

export function cerrarSesion(): void {
    // El servidor destruye la sesión y después redirige al login.
    window.location.href = '/auth/logout';
}
