// ============================================================
// UTILIDADES — Helpers compartidos por todos los módulos
// ============================================================

// Portada por defecto (nota de música sobre fondo gris oscuro)
// Se usa cuando una canción/álbum/playlist no tiene imagen.
export const PORTADA_DEFECTO = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <rect width="24" height="24" fill="#282828"/>
        <path fill="#b3b3b3" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </svg>`
);

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