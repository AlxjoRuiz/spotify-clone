// Helpers puros — port de frontend/scripts/utils.js a TS.
// (estilo perfumes-web lib/utils.ts)
export function formatearTiempo(segundos: number): string {
    if (!Number.isFinite(segundos) || segundos < 0) return '0:00';
    const mins = Math.floor(segundos / 60);
    const secs = Math.floor(segundos % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function saludoSegunHora(fecha = new Date()): string {
    const hora = fecha.getHours();
    if (hora >= 6 && hora < 12) return 'Buenos días';
    if (hora >= 12 && hora < 20) return 'Buenas tardes';
    return 'Buenas noches';
}
