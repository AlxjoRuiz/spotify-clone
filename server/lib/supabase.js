// ------------------------------------------------------------------
// Supabase — cliente oficial (@supabase/supabase-js), server en JS.
// Usa las MISMAS tablas de la migración 0001_esquema_inicial.sql:
//   public.users, public.user_profiles, public.favoritos
// No se toca el SQL. Solo se reemplaza el axios REST crudo por el SDK.
// ------------------------------------------------------------------

// @ts-check
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** @type {import('@supabase/supabase-js').SupabaseClient | null} */
let supabase = null;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
    });
} else {
    console.warn(
        '[supabase] SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY faltan. Las rutas de favoritos/de tokens devolverán error controlado.'
    );
}

/**
 * Inserta o actualiza (upsert) usando la constraint única.
 * @param {string} table - 'users' | 'user_profiles' | 'favoritos'
 * @param {Record<string, unknown>} payload
 * @param {string} [onConflict] - ej: 'spotify_id', 'user_id', 'user_profile_id,track_id'
 */
async function upsertSupabaseTable(table, payload, onConflict) {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from(table)
        .upsert(payload, onConflict ? { onConflict } : undefined)
        .select();
    if (error) throw error;
    return data;
}

/**
 * Lee filas con filtros de igualdad.
 * @param {string} table
 * @param {Record<string, string | number>} filtros - ej: { user_id: '...' }
 */
async function leerSupabase(table, filtros) {
    if (!supabase) return null;
    let query = supabase.from(table).select('*');
    for (const [columna, valor] of Object.entries(filtros || {})) {
        query = query.eq(columna, valor);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

/**
 * Borra filas que cumplen los filtros.
 * @param {string} table
 * @param {Record<string, string | number>} filtros
 */
async function borrarSupabase(table, filtros) {
    if (!supabase) return false;
    let query = supabase.from(table).delete();
    for (const [columna, valor] of Object.entries(filtros || {})) {
        query = query.eq(columna, valor);
    }
    const { error } = await query;
    if (error) throw error;
    return true;
}

module.exports = { supabase, upsertSupabaseTable, leerSupabase, borrarSupabase };
