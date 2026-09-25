// Supabase en TypeScript: cliente oficial tipado con el esquema exacto de la
// migración 0001 (users, user_profiles, favoritos). No se toca el SQL ni la
// lógica. Expone una función concreta por tabla (el SDK tipa por tabla
// concreta; los helpers genéricos con uniones no compilan con sus tipos).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Esquema 0001 espejado en tipos (id uuid, timestamps timestamptz).
export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string;
                    created_at: string;
                    spotify_id: string;
                    display_name: string | null;
                    email: string | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    spotify_id: string;
                    display_name?: string | null;
                    email?: string | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    spotify_id?: string;
                    display_name?: string | null;
                    email?: string | null;
                };
                Relationships: [];
            };
            user_profiles: {
                Row: {
                    id: string;
                    created_at: string;
                    user_id: string;
                    token_spotify: string | null;
                    refresh_token_spotify: string | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    user_id: string;
                    token_spotify?: string | null;
                    refresh_token_spotify?: string | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    user_id?: string;
                    token_spotify?: string | null;
                    refresh_token_spotify?: string | null;
                };
                Relationships: [];
            };
            favoritos: {
                Row: {
                    id: string;
                    created_at: string;
                    user_profile_id: string;
                    track_id: string;
                    track_nombre: string;
                    track_artista: string;
                    track_imagen: string | null;
                    track_preview: string | null;
                };
                Insert: {
                    id?: string;
                    created_at?: string;
                    user_profile_id: string;
                    track_id: string;
                    track_nombre: string;
                    track_artista: string;
                    track_imagen?: string | null;
                    track_preview?: string | null;
                };
                Update: {
                    id?: string;
                    created_at?: string;
                    user_profile_id?: string;
                    track_id?: string;
                    track_nombre?: string;
                    track_artista?: string;
                    track_imagen?: string | null;
                    track_preview?: string | null;
                };
                Relationships: [];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            [_ in never]: never;
        };
    };
}

export type UserRow = Database['public']['Tables']['users']['Row'];
export type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
export type FavoritoRow = Database['public']['Tables']['favoritos']['Row'];
export type NuevoFavorito = Database['public']['Tables']['favoritos']['Insert'];

let supabase: SupabaseClient<Database> | null = null;

function esUrlSupabaseValida(value: string | undefined) {
    // El SDK agrega por sí mismo rutas como /rest/v1; por eso esta variable
    // debe ser únicamente la URL base del proyecto.
    if (!value) return false;
    try {
        const url = new URL(value);
        return (
            (url.protocol === 'https:' || url.protocol === 'http:') &&
            url.hostname !== 'tu-proyecto.supabase.co'
        );
    } catch {
        return false;
    }
}

if (
    SUPABASE_URL &&
    esUrlSupabaseValida(SUPABASE_URL) &&
    SUPABASE_SERVICE_ROLE_KEY &&
    SUPABASE_SERVICE_ROLE_KEY !== 'tu_service_role_key'
) {
    supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });
} else {
    console.warn(
        '[supabase] Configurá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY válidos. Las rutas de favoritos y renovación de tokens estarán deshabilitadas.'
    );
}

// Crea o actualiza al usuario identificado por su id de Spotify.
export async function upsertUsuario(input: {
    spotify_id: string;
    display_name?: string | null;
    email?: string | null;
}): Promise<UserRow[] | null> {
    if (!supabase) return null;
    const res = await supabase.from('users').upsert(input, { onConflict: 'spotify_id' }).select();
    if (res.error) throw res.error;
    return res.data;
}

// Guarda los tokens de un usuario (ya cifrados por quien llama).
export async function guardarTokens(
    userId: string,
    input: { token_spotify?: string | null; refresh_token_spotify?: string | null }
): Promise<UserProfileRow[] | null> {
    if (!supabase) return null;
    const res = await supabase
        .from('user_profiles')
        .upsert({ user_id: userId, ...input }, { onConflict: 'user_id' })
        .select();
    if (res.error) throw res.error;
    return res.data;
}

// Lee el perfil (tokens) de un usuario para renovarlos.
export async function leerPerfilPorUsuario(userId: string): Promise<UserProfileRow[] | null> {
    if (!supabase) return null;
    const res = await supabase.from('user_profiles').select('*').eq('user_id', userId);
    if (res.error) throw res.error;
    return res.data;
}

// Lista los favoritos de un perfil.
export async function listarFavoritos(userProfileId: string): Promise<FavoritoRow[] | null> {
    if (!supabase) return null;
    const res = await supabase.from('favoritos').select('*').eq('user_profile_id', userProfileId);
    if (res.error) throw res.error;
    return res.data;
}

// Agrega o actualiza un favorito (no duplica por user_profile_id + track_id).
export async function agregarFavorito(input: NuevoFavorito): Promise<FavoritoRow[] | null> {
    if (!supabase) return null;
    const res = await supabase
        .from('favoritos')
        .upsert(input, { onConflict: 'user_profile_id,track_id' })
        .select();
    if (res.error) throw res.error;
    return res.data;
}

// Borra un favorito del usuario. Devuelve false si Supabase no está configurado.
export async function quitarFavorito(userProfileId: string, trackId: string): Promise<boolean> {
    if (!supabase) return false;
    const res = await supabase
        .from('favoritos')
        .delete()
        .eq('user_profile_id', userProfileId)
        .eq('track_id', trackId);
    if (res.error) throw res.error;
    return true;
}

export { supabase };
