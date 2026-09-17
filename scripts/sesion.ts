// Sesión — el nombre es solo decorativo. La sesión real se valida con las
// llamadas /api (si expira, api.ts redirige al login con un 401).
const paramsURL = new URLSearchParams(window.location.search);

let nombreUsuario = paramsURL.get('nombre');
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
    window.location.href = '/auth/logout';
}
