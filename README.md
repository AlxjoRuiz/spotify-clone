# Spotify Clone

Clon de Spotify con **login usando tu cuenta de Spotify** (Authorization Code Flow), dashboard completo con reproductor, búsqueda en vivo, perfil dinámico, top de artistas/canciones, álbumes, playlists del usuario, favoritos y escuchado recientemente. Backend en Express, persistencia en Supabase.

> Documentación técnica completa en [`.docs/DOCUMENTACION.md`](./.docs/DOCUMENTACION.md).

## Funcionalidades

- Login con Spotify + sesión persistente (renovación automática del token).
- Reproductor con cola, shuffle, repeat, volumen y atajo `Espacio`.
- Búsqueda en vivo con historial y sugerencias.
- Vistas: Inicio ("Hecho para ti"), Explorar, Biblioteca, Perfil con tabs de rango.
- Favoritos sincronizados con Supabase + corazón "me gusta" en el reproductor.

## Requisitos

- Node.js 18+
- Una app en [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- Un proyecto en [Supabase](https://supabase.com)

## Instalación

```bash
cd server
npm install
cp ../.env.example .env   # o server/.env.example, y completalo (ver abajo)
node index.js             # backend en http://localhost:3000
```

```bash
cd frontend
npm install
npm run build             # genera frontend/dist (lo sirve Express)
```

Abrí `http://localhost:3000/pages/login.html`.

Desarrollo del frontend (hot reload): `cd frontend && npm run dev` → `http://localhost:5173` (proxy `/api` y `/auth` a `:3000`).

## Variables de entorno (`server/.env`)

| Variable | Dónde se consigue |
|---|---|
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify Dashboard → tu app → Settings |
| `SPOTIFY_REDIRECT_URI` | Debe ser **idéntica** a la registrada en Spotify Dashboard → Settings → Redirect URIs (ej: `http://localhost:3000/auth/spotify/callback`) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `SESSION_SECRET` | Cualquier string largo aleatorio (firma la cookie de sesión) |

> Si Spotify responde `redirect_uri: Not matching configuration`, la URI del `.env` y la del Dashboard no coinciden carácter por carácter (ojo con `localhost` vs `127.0.0.1`).

## Base de datos

La migración idempotente `supabase/migrations/0001_esquema_inicial.sql` crea las tablas `users`, `user_profiles` y `favoritos` (+ RLS). Aplicarla en Supabase → SQL Editor → pegar y **Run**. Se puede correr varias veces sin romper nada.

## Estructura

```
frontend/        → app React+TS+Tailwind (pages/*.html entries, scripts/*.tsx por vista, styles/index.css, assets) — build a frontend/dist
server/          → index.js en JS (Express + auth + API, sirve frontend/dist) y lib/supabase.js (SDK)
supabase/        → migrations (0001 esquema inicial: users, user_profiles, favoritos)
.docs/           → DOCUMENTACION.md (detalle técnico de cada módulo y endpoint)
```

> Organización adaptada de [perfumes-web](https://github.com/AlxjoRuiz/perfumes-web)
> (raíz con `supabase/`, `.docs/`, `.env.example`, `.nvmrc`, `npm run lint` por
> paquete). Las carpetas `app/`, `components/` y `pages/api` de esa referencia
> son propias de Next.js y no aplican: este proyecto usa Express + Vite.
>
> | perfumes-web | spotify-clone |
> |---|---|
> | `app/` (rutas) | `frontend/pages/` + `frontend/scripts/vistas/` |
> | `components/{…}` | `frontend/scripts/componentes.tsx` + vistas |
> | `lib/` | `frontend/scripts/{api,utils,sesion}.ts` |
> | `types/` | `frontend/scripts/tipos.ts` |
> | `public/` | `frontend/assets/` |
> | `supabase/` | `supabase/` (igual) |
> | `pages/api` | `server/index.js` (Express) |

## Deploy

Para una URL pública (Railway/Render/VPS): configurar las mismas variables de entorno en el hosting, registrar la Redirect URI de producción en el Spotify Dashboard (ej: `https://tu-app.up.railway.app/auth/spotify/callback`) y aplicar la migración en Supabase.
