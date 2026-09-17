// Supabase en TypeScript: cliente oficial (@supabase/supabase-js) que usa las
// tablas de la migración 0001 (users, user_profiles, favoritos) sin tocar el
// SQL. Expone los mismos helpers que consume index.js.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Tablas del esquema 0001 (las únicas que toca el backend)
export type SupabaseTable = 'users' | 'user_profiles' | 'favoritos';
export type Filtros = Record<string, string | number>;

let supabase: SupabaseClient | null = null;

function esUrlSupabaseValida(value: string | undefined) {
    if (!value) return false;
    try {
        const url = new URL(value);
        return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname !== 'tu-proyecto.supabase.co';
    } catch {
        return false;
    }
}

if (SUPABASE_URL && esUrlSupabaseValida(SUPABASE_URL) && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_SERVICE_ROLE_KEY !== 'tu_service_role_key') {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });
} else {
    console.warn(
        '[supabase] Configurá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY válidos. Las rutas de favoritos y renovación de tokens estarán deshabilitadas.'
    );
}

// Inserta o actualiza (upsert) usando la constraint única.
// onConflict: 'spotify_id' | 'user_id' | 'user_profile_id,track_id'
export async function upsertSupabaseTable(
    table: SupabaseTable,
    payload: Record<string, unknown>,
    onConflict?: string
) {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from(table)
        .upsert(payload, onConflict ? { onConflict } : undefined)
        .select();
    if (error) throw error;
    return data;
}

// Lee filas con filtros de igualdad. Ej: leerSupabase('user_profiles', { user_id })
export async function leerSupabase(table: SupabaseTable, filtros: Filtros = {}) {
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
export async function borrarSupabase(table: SupabaseTable, filtros: Filtros = {}) {
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
