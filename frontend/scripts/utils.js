// ============================================================
// UTILIDADES — Helpers compartidos por todos los módulos
// ============================================================

// Formatea segundos a mm:ss (ej: 245 -> "4:05")
export function formatearTiempo(segundos) {
    const mins = Math.floor(segundos / 60);
    const secs = Math.floor(segundos % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Escapa caracteres HTML para usar texto dinámico dentro de innerHTML (evita inyección)
export function escaparHTML(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Saludo según la hora del día
export function saludoSegunHora() {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return 'Buenos días';
    if (hora >= 12 && hora < 20) return 'Buenas tardes';
    return 'Buenas noches';
}