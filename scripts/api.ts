// Cliente HTTP tipado — mismo archivo, mismo rol que api.js:
// todos los fetch del frontend pasan por acá (mismos endpoints /api/*,
// mismo redirect a login con 401).
import type {
    AlbumDetalle,
    Artist,
    ArtistaDetalle,
    FavoritoRow,
    Perfil,
    PlaylistDetalle,
    PlaylistRef,
    RecentItem,
    TimeRange,
    Track,
} from './tipos';

async function pedir<T>(url: string, opciones?: RequestInit): Promise<T> {
    // Punto único de comunicación con el backend: centralizar aquí los fallos
    // impide que cada vista duplique manejo de red y de sesión expirada.
    let response: Response;
    try {
        response = await fetch(url, opciones);
    } catch {
        throw new Error('No se pudo conectar con el servidor. Verificá que el backend esté iniciado.');
    }
    if (response.status === 401) {
        window.location.href = '/pages/login.html';
        throw new Error('Sesión expirada');
    }
    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || `Error ${response.status} en ${url}`);
    }
    return (await response.json()) as T;
}

export interface BuscarResultado {
    tracks?: { items: Track[] };
    artists?: { items: Artist[] };
    albums?: { items: (Artist & { artists?: { name: string }[] })[] };
    playlists?: { items: PlaylistRef[] };
}

export interface TokenRespuesta {
    access_token: string;
}

export interface NuevoFavorito {
    trackId: string;
    nombre: string;
    artista: string;
    imagen?: string | null;
    preview?: string | null;
}

export const API = {
    // Cada método representa una ruta del backend y devuelve datos ya tipados;
    // las vistas no construyen URLs ni manejan fetch directamente.
    playlistsPopulares: () => pedir<{ playlists: PlaylistRef[] }>('/api/playlists-populares'),
    explorar: () => pedir<{ playlists: PlaylistRef[]; nuevos: Artist[]; top: Track[] }>('/api/explorar'),
    misPlaylists: () => pedir<{ playlists: PlaylistRef[] }>('/api/mis-playlists'),
    playlistTracks: (idPlaylist: string) =>
        pedir<PlaylistDetalle>(`/api/playlists/${idPlaylist}/tracks`),
    buscar: (texto: string) => pedir<BuscarResultado>(`/api/buscar?q=${encodeURIComponent(texto)}`),
    albumTracks: (idAlbum: string) => pedir<AlbumDetalle>(`/api/album/${idAlbum}/tracks`),
    artistaDetalle: (idArtista: string) => pedir<ArtistaDetalle>(`/api/artistas/${idArtista}`),
    perfil: () => pedir<Perfil>('/api/perfil'),
    topArtistas: (timeRange: TimeRange = 'medium_term') =>
        pedir<{ items: Artist[] }>(`/api/top-artistas?time_range=${timeRange}`),
    topTracks: (timeRange: TimeRange = 'medium_term') =>
        pedir<{ items: Track[] }>(`/api/top-tracks?time_range=${timeRange}`),
    cancionesRecientes: () => pedir<{ items: RecentItem[] }>('/api/canciones'),
    listarFavoritos: () => pedir<{ favoritos: FavoritoRow[] }>('/api/favoritos'),
    agregarFavorito: (datos: NuevoFavorito) =>
        pedir<{ ok: boolean }>('/api/favoritos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos),
        }),
    quitarFavorito: (idTrack: string) =>
        pedir<{ ok: boolean }>(`/api/favoritos/${encodeURIComponent(idTrack)}`, {
            method: 'DELETE',
        }),
    // Web Playback SDK: token fresco + control de reproducción en un dispositivo
    obtenerToken: () => pedir<TokenRespuesta>('/api/token'),
    reproducirEnDispositivo: (uris: string[], deviceId?: string) =>
        pedir<{ ok: boolean }>('/api/player/play', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uris, device_id: deviceId ?? null }),
        }),
    transferirReproduccion: (deviceId: string, play = false) =>
        pedir<{ ok: boolean }>('/api/player/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_id: deviceId, play }),
        }),
};

export default API;
