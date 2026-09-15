// Tipos compartidos — espejo de lo que devuelve server/index.js (/api/*)
// y de las tablas Supabase de la migración 0001 (users, user_profiles, favoritos).

export type TimeRange = 'short_term' | 'medium_term' | 'long_term';

export interface SpotifyImage {
    url: string;
}

export interface Track {
    id: string;
    name: string;
    preview_url: string | null;
    artists: { name: string }[];
    album?: { images: SpotifyImage[] };
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

export interface PlaylistSimple {
    id: string;
    name: string;
    images?: SpotifyImage[];
}
