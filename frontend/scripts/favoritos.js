// ============================================================
// FAVORITOS — Sincroniza el estado global (estado.js) con
// Supabase a través del backend (api.js)
// ============================================================

import API from './api.js';
import { setFavoritosIds, actualizarFavoritoLocal, esFavorito } from './estado.js';

// Trae los favoritos de Supabase y actualiza el estado global
export async function obtenerFavoritos() {
    try {
        const data = await API.listarFavoritos();
        const favoritos = data.favoritos || [];
        setFavoritosIds(favoritos.map(f => f.track_id));
        return favoritos;
    } catch (error) {
        console.error('Error al cargar favoritos:', error);
        return [];
    }
}

// Agrega o quita un favorito según si ya está marcado (toggle)
export async function guardarFavorito(track, boton) {
    const yaEsFavorito = esFavorito(track.id);

    try {
        if (yaEsFavorito) {
            const data = await API.quitarFavorito(track.id);
            if (data.ok) actualizarFavoritoLocal(track.id, false);
        } else {
            const datos = {
                trackId: track.id,
                nombre: track.name,
                artista: track.artists?.[0]?.name ?? 'Desconocido',
                imagen: track.album?.images?.[0]?.url ?? null,
                preview: track.preview_url || null
            };
            const data = await API.agregarFavorito(datos);
            if (data.ok) actualizarFavoritoLocal(track.id, true);
        }
    } catch (error) {
        console.error('Error al cambiar favorito:', error);
    }
}