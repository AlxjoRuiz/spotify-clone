-- ============================================================
-- Migración 0001 — Esquema inicial del clon de Spotify
-- ------------------------------------------------------------
-- Crea las tablas `users`, `user_profiles` y `favoritos` que usa
-- el backend (server/index.js) vía la REST API de Supabase.
--
-- Cómo aplicarla:
--   A) Dashboard de Supabase → SQL Editor → pegar todo y darle Run.
--   B) CLI: supabase link + supabase db push (con migraciones enlazadas).
--
-- Es IDEMPOTENTE: podés correrla varias veces sin errores.
-- El backend accede con la SERVICE_ROLE_KEY (que salta RLS),
-- por eso RLS está habilitado sin políticas para anon/authenticated.
-- ============================================================

-- ---------- USUARIOS (identificados por su id de Spotify) ----------
create table if not exists public.users (
    id           uuid        primary key default gen_random_uuid(),
    spotify_id   text        not null,
    display_name text,
    email        text,
    created_at   timestamptz not null default now()
);

-- ---------- TOKENS DE SPOTIFY POR USUARIO (1 fila por usuario) ----------
create table if not exists public.user_profiles (
    id                   uuid        primary key default gen_random_uuid(),
    user_id              uuid        not null references public.users (id) on delete cascade,
    token_spotify        text,
    refresh_token_spotify text,
    created_at           timestamptz not null default now()
);

-- ---------- CANCIONES FAVORITAS (1 fila por usuario + canción) ----------
create table if not exists public.favoritos (
    id               uuid        primary key default gen_random_uuid(),
    user_profile_id  uuid        not null references public.user_profiles (id) on delete cascade,
    track_id         text        not null,
    track_nombre     text        not null,
    track_artista    text        not null,
    track_imagen     text,
    track_preview    text,
    created_at       timestamptz not null default now()
);

-- ============================================================
-- CONSTRAINTS ÚNICOS (indispensables para el UPSERT del backend)
-- on_conflict=spotify_id / user_id / user_profile_id,track_id
-- Los agregamos solo si no existen (idempotencia al 100%).
-- ============================================================
do $$
begin
    -- users.spotify_id (upsert con on_conflict=spotify_id)
    if not exists (
        select 1
        from information_schema.table_constraints tc
        join information_schema.constraint_column_usage ccu
          on ccu.constraint_name = tc.constraint_name
         and ccu.table_schema    = tc.table_schema
        where tc.table_schema = 'public'
          and tc.table_name   = 'users'
          and tc.constraint_type = 'UNIQUE'
          and ccu.column_name = 'spotify_id'
    ) then
        alter table public.users add constraint users_spotify_id_key unique (spotify_id);
    end if;

    -- user_profiles.user_id (upsert con on_conflict=user_id)
    if not exists (
        select 1
        from information_schema.table_constraints tc
        join information_schema.constraint_column_usage ccu
          on ccu.constraint_name = tc.constraint_name
         and ccu.table_schema    = tc.table_schema
        where tc.table_schema = 'public'
          and tc.table_name   = 'user_profiles'
          and tc.constraint_type = 'UNIQUE'
          and ccu.column_name = 'user_id'
    ) then
        alter table public.user_profiles add constraint user_profiles_user_id_key unique (user_id);
    end if;

    -- favoritos (user_profile_id, track_id) — upsert con on_conflict múltiple
    if not exists (
        select 1
        from information_schema.table_constraints tc
        where tc.table_schema = 'public'
          and tc.table_name   = 'favoritos'
          and tc.constraint_type = 'UNIQUE'
          and (
              select count(*) from information_schema.constraint_column_usage ccu
              where ccu.constraint_name = tc.constraint_name
                and ccu.table_schema    = tc.table_schema
                and ccu.column_name in ('user_profile_id', 'track_id')
          ) = 2
    ) then
        alter table public.favoritos
            add constraint favoritos_user_profile_id_track_id_key unique (user_profile_id, track_id);
    end if;
end $$;

-- ============================================================
-- ÍNDICES para las consultas más comunes
-- ============================================================
create index if not exists idx_users_spotify_id on public.users (spotify_id);
create index if not exists idx_favoritos_user   on public.favoritos (user_profile_id);

-- ============================================================
-- RLS (Row Level Security)
-- El backend usa la SERVICE_ROLE_KEY, que BYPASSa RLS, así que el
-- funcionamiento no cambia. Sin políticas para anon/authenticated:
-- nadie con una API key de cliente puede leer o modificar estos datos.
-- ============================================================
alter table public.users         enable row level security;
alter table public.user_profiles enable row level security;
alter table public.favoritos     enable row level security;