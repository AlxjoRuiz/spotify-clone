// Utilidades — mismo archivo y lógica que utils.js, con tipos.
// escaparHTML() no se porta: React escapa el texto por defecto.
export const PORTADA_DEFECTO =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <rect width="24" height="24" fill="#282828"/>
        <path fill="#b3b3b3" d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </svg>`
    );

// Segundos -> "m:ss" (ej: 245 -> "4:05")
export function formatearTiempo(segundos: number): string {
    if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
    const mins = Math.floor(segundos / 60);
    const secs = Math.floor(segundos % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Milisegundos -> "45 min" o "1 h 23 min"
export function formatearDuracionTotal(milisegundos: number): string {
    const minutos = Math.round((milisegundos || 0) / 60000);
    if (minutos < 60) return `${minutos} min`;

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;
    return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

// ISO -> "ahora mismo", "hace 5 min", "hace 3 h", ...
export function tiempoRelativo(fechaISO: string): string {
    const diferencia = Date.now() - new Date(fechaISO).getTime();
    if (Number.isNaN(diferencia) || diferencia < 0) return '';

    const minutos = Math.floor(diferencia / 60000);
    if (minutos < 1) return 'ahora mismo';
    if (minutos < 60) return `hace ${minutos} min`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;

    const dias = Math.floor(horas / 24);
    if (dias < 30) return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`;

    const meses = Math.floor(dias / 30);
    if (meses < 12) return `hace ${meses} ${meses === 1 ? 'mes' : 'meses'}`;

    const anios = Math.floor(meses / 12);
    return `hace ${anios} ${anios === 1 ? 'año' : 'años'}`;
}

export function saludoSegunHora(fecha = new Date()): string {
    const hora = fecha.getHours();
    if (hora >= 6 && hora < 12) return 'Buenos días';
    if (hora >= 12 && hora < 20) return 'Buenas tardes';
    return 'Buenas noches';
}
