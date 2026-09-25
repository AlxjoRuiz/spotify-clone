-- Migración 0002 — Endurecimiento del acceso directo a las tablas.
--
-- El backend accede SIEMPRE con service_role (bypass RLS), así que este
-- archivo no cambia el funcionamiento. Es defensa en profundidad: si algún
-- día se usa la anon key desde un cliente, estas tablas siguen cerradas.
--
-- IDEMPOTENTE: puede correrse varias veces sin errores.
-- NO modifica 0001: solo agrega restricciones, sin tocar tablas ni datos.

-- 1) RLS activado en las 3 tablas (por si se desactivó por error).
alter table public.users         enable row level security;
alter table public.user_profiles enable row level security;
alter table public.favoritos     enable row level security;

-- 2) Sin políticas permisivas: anon/authenticated no leen ni escriben nada
-- (deny por defecto en RLS). No agregar políticas sin vincular auth.uid(),
-- y este esquema no tiene usuarios de Supabase Auth (son usuarios de Spotify).

-- 3) Revoca privilegios directos por si RLS se desactiva accidentalmente.
revoke all on public.users         from anon, authenticated, public;
revoke all on public.user_profiles from anon, authenticated, public;
revoke all on public.favoritos     from anon, authenticated, public;

-- 4) El rol de servicio conserva acceso total explícito (el único que usa el backend).
grant all on public.users         to service_role;
grant all on public.user_profiles to service_role;
grant all on public.favoritos     to service_role;

-- 5) Documenta la postura en el propio catálogo.
comment on table public.users is 'Spotify-clone: acceso solo vía service_role del backend (migración 0002).';
comment on table public.user_profiles is 'Spotify-clone: acceso solo vía service_role del backend (migración 0002).';
comment on table public.favoritos is 'Spotify-clone: acceso solo vía service_role del backend (migración 0002).';
