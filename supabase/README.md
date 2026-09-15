# Supabase — Spotify Clone

Migraciones SQL idempotentes (se pueden correr varias veces sin romper nada).

## Tablas (migración `0001_esquema_inicial.sql`)

| Tabla | Clave única (upsert) | Uso |
|---|---|---|
| `users` | `spotify_id` | Un registro por cuenta de Spotify |
| `user_profiles` | `user_id` | Tokens (`token_spotify`, `refresh_token_spotify`) |
| `favoritos` | `(user_profile_id, track_id)` | Canciones favoritas por usuario |

RLS habilitado sin políticas: el acceso real pasa por la `SERVICE_ROLE_KEY`
del backend (`server/lib/supabase.js`), que hace bypass de RLS.

## Aplicar la migración

**Sin CLI:** Supabase Dashboard → SQL Editor → pegar el contenido de
`migrations/0001_esquema_inicial.sql` → Run.

**Con CLI:** `supabase link --project-ref tu-proyecto` y luego `supabase db push`.
