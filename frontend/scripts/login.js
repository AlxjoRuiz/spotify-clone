// ========================================
// LOGIN RÁPIDO PARA DESARROLLO
// ========================================

// Toma el formulario del HTML
const formLogin = document.querySelector('#form-login-dev');

// Cuando el usuario envía el formulario
formLogin.addEventListener('submit', (e) => {
    // Evita que la página se recargue
    e.preventDefault();

    // Toma el nombre que escribió
    const nombre = document.querySelector('#input-nombre').value.trim();

    // Si no escribió nada, no hace nada
    if (!nombre) return;

    // Guarda el nombre en localStorage (persiste aunque cierres el navegador)
    localStorage.setItem('usuario_nombre', nombre);

    // Redirige al dashboard
    window.location.href = 'dashboard.html';
});
