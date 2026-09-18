// Contratos compartidos entre vistas y API. No contienen lógica: evitan que
// cada componente suponga nombres o formas distintas para los mismos datos.
export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export interface SpotifyImage {
    url: string;
}

export interface Track {
    id: string;
    name: string;
    preview_url: string | null;
    uri?: string;
    duration_ms?: number;
    artists?: { name: string }[];
    album?: { images?: SpotifyImage[] };
    external_urls?: { spotify?: string };
}

export interface Artist {
    id: string;
    name: string;
    images?: SpotifyImage[];
    genres?: string[];
    external_urls?: { spotify?: string };
}

export interface AlbumRef {
    id: string;
    name: string;
    images?: SpotifyImage[];
    artists?: { name: string }[];
}

export interface PlaylistRef {
    id: string;
    name: string;
    images?: SpotifyImage[];
    owner?: { display_name?: string };
    external_urls?: { spotify?: string };
}

export interface Perfil {
    nombre: string;
    email: string;
    imagen: string | null;
    tipo_cuenta: string;
    pais: string;
    seguidores: number;
    id_spotify: string;
}

export interface FavoritoRow {
    id: string;
    user_profile_id: string;
    track_id: string;
    track_nombre: string;
    track_artista: string;
    track_imagen: string | null;
    track_preview: string | null;
}

export interface RecentItem {
    track: Track;
    played_at?: string;
}

export interface AlbumDetalle {
    album: {
        nombre: string;
        artista: string;
        portada: string | null;
        fecha?: string;
        total_canciones?: number;
    };
    tracks: Track[];
}

export interface PlaylistDetalle {
    playlist: {
        id: string;
        nombre: string;
        dueno: string;
        portada: string | null;
        total_canciones: number;
    };
    tracks: Track[];
}

export interface ArtistaDetalle {
    artista: {
        id: string;
        nombre: string;
        imagen: string | null;
        generos: string[];
        seguidores: number;
        popularidad: number;
        spotify_url: string | null;
    };
    top: Track[];
    albums: AlbumRef[];
}
