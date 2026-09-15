// Cliente HTTP tipado para el backend Express (server/index.js en JS).
// Mismos endpoints que usa frontend/scripts/api.js, pero con genéricos.
import type { FavoritoRow, Perfil, PlaylistSimple, TimeRange, Track } from './types';

async function pedir<T>(url: string, opciones?: RequestInit): Promise<T> {
    const response = await fetch(url, opciones);
    if (response.status === 401) {
        window.location.href = '/pages/login.html';
        throw new Error('Sesión expirada');
    }
    if (!response.ok) throw new Error(`Error ${response.status} en ${url}`);
    return (await response.json()) as T;
}

export const API = {
    perfil: () => pedir<Perfil>('/api/perfil'),
    topArtistas: (timeRange: TimeRange = 'medium_term') =>
        pedir(`/api/top-artistas?time_range=${timeRange}`),
    topTracks: (timeRange: TimeRange = 'medium_term') =>
        pedir(`/api/top-tracks?time_range=${timeRange}`),
    cancionesRecientes: () => pedir<{ items: Track[] }>('/api/canciones'),
    playlistsPopulares: () => pedir<{ playlists: PlaylistSimple[] }>('/api/playlists-populares'),
    misPlaylists: () => pedir<{ playlists: PlaylistSimple[] }>('/api/mis-playlists'),
    buscar: (q: string) =>
        pedir(`/api/buscar?q=${encodeURIComponent(q)}`),
    listarFavoritos: () => pedir<{ favoritos: FavoritoRow[] }>('/api/favoritos'),
    agregarFavorito: (datos: { trackId: string; nombre: string; artista: string; imagen?: string | null; preview?: string | null }) =>
        pedir<{ ok: boolean }>('/api/favoritos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        }),
    quitarFavorito: (idTrack: string) =>
        pedir<{ ok: boolean }>(`/api/favoritos/${encodeURIComponent(idTrack)}`, { method: 'DELETE' }),
};
