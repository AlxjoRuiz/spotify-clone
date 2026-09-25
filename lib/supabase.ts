// Supabase en TypeScript: cliente oficial tipado con el esquema exacto de la
// migración 0001 (users, user_profiles, favoritos). No se toca el SQL ni la
// lógica: mismos exports y comportamiento que consume index.js, pero cada
// query valida tablas y columnas en compilación en vez de fallar en runtime.
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

export type SupabaseTable = keyof Database['public']['Tables'];
export type Filtros = Record<string, string | number>;
type Fila<T extends SupabaseTable> = Database['public']['Tables'][T]['Row'];
type NuevaFila<T extends SupabaseTable> = Database['public']['Tables'][T]['Insert'];

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

// Inserta o actualiza (upsert) usando la constraint única.
// onConflict: 'spotify_id' | 'user_id' | 'user_profile_id,track_id'
export async function upsertSupabaseTable<T extends SupabaseTable>(
    table: T,
    payload: NuevaFila<T>,
    onConflict?: string
): Promise<Fila<T>[] | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from(table)
        .upsert(payload, onConflict ? { onConflict } : undefined)
        .select();
    if (error) throw error;
    return data;
}

// Lee filas con filtros de igualdad. Ej: leerSupabase('user_profiles', { user_id })
export async function leerSupabase<T extends SupabaseTable>(
    table: T,
    filtros: Filtros = {}
): Promise<Fila<T>[] | null> {
    if (!supabase) return null;
    let query = supabase.from(table).select('*');
    for (const [columna, valor] of Object.entries(filtros)) {
        query = query.eq(columna, valor);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

// Borra filas que cumplen los filtros. Devuelve true si no hubo error.
export async function borrarSupabase<T extends SupabaseTable>(
    table: T,
    filtros: Filtros = {}
): Promise<boolean> {
    if (!supabase) return false;
    let query = supabase.from(table).delete();
    for (const [columna, valor] of Object.entries(filtros)) {
        query = query.eq(columna, valor);
    }
    const { error } = await query;
    if (error) throw error;
    return true;
}

export { supabase };
