# Spotify Clone

Aplicación web que conecta una cuenta de Spotify mediante OAuth, muestra contenido y estadísticas del usuario, y guarda sus favoritos en Supabase. El navegador nunca recibe ni la clave privada de Spotify ni la clave de servicio de Supabase.

> Documentación técnica breve en [`.docs/DOCUMENTACION.md`](./.docs/DOCUMENTACION.md).

## Funcionalidades

- Login con Spotify + sesión persistente (renovación automática del token).
- Reproductor con cola, shuffle, repeat, volumen y atajo `Espacio`. Canción completa con Spotify Premium (Web Playback SDK); sin Premium usa previews de 30s.
- Búsqueda en vivo con historial y sugerencias.
- Vistas: Inicio ("Hecho para ti"), Explorar, Biblioteca, Perfil con tabs de rango.
- Favoritos sincronizados con Supabase + corazón "me gusta" en el reproductor.

## Requisitos

- Node.js 18+
- Una app en [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- Un proyecto en [Supabase](https://supabase.com)

## Instalación

```bash
npm install
cp .env.example .env   # completalo (ver abajo)
npm run build          # frontend React -> dist/
npm start              # backend en http://127.0.0.1:3000
```

Abrí `http://127.0.0.1:3000/pages/login.html` (debe usar el mismo host que `SPOTIFY_REDIRECT_URI`; no alternes entre `localhost` y `127.0.0.1`).

> Si ya habías iniciado sesión antes, volvé a entrar: los permisos nuevos de reproducción (`streaming`) requieren autorizarlos de nuevo.

Desarrollo del frontend (hot reload): `npm run dev` → `http://127.0.0.1:5173`. El botón de login inicia OAuth directamente en `127.0.0.1:3000` para conservar la cookie de sesión del callback.

> `npm start` corre el backend con `tsx` solo para resolver `lib/` en TS;
> `index.js` sigue siendo JavaScript puro con `require()`.

`npm run dev` es solo para el frontend: mantené `npm start` ejecutándose en otra terminal para que funcionen el login y las rutas `/api`.

## Variables de entorno (`.env` en la raíz)

| Variable | Dónde se consigue |
|---|---|
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | Spotify Dashboard → tu app → Settings |
| `SPOTIFY_REDIRECT_URI` | Debe ser **idéntica** a la registrada en Spotify Dashboard → Settings → Redirect URIs (ej: `http://127.0.0.1:3000/auth/spotify/callback`) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `SESSION_SECRET` | Cualquier string largo aleatorio (firma la cookie de sesión) |
| `NODE_ENV` | `development` localmente; `production` en el hosting para cookies seguras |

> Si Spotify responde `redirect_uri: Not matching configuration`, la URI del `.env` y la del Dashboard no coinciden carácter por carácter (ojo con `localhost` vs `127.0.0.1`).

Si el servidor registra `fetch failed` durante el callback, revisá también `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: ese mensaje corresponde a la escritura en Supabase posterior al login, no al callback de Spotify. La URL debe tener el formato `https://<project-ref>.supabase.co` y el proyecto debe estar activo y accesible desde el servidor.

## Base de datos

La migración idempotente `supabase/migrations/0001_esquema_inicial.sql` crea las tablas `users`, `user_profiles` y `favoritos` (+ RLS). Aplicarla en Supabase → SQL Editor → pegar y **Run**. Se puede correr varias veces sin romper nada.

## Estructura

```
pages/      → entries login.html + dashboard.html (mismas URLs)
scripts/    → app React+TS+Tailwind (*.tsx por vista, api/utils/sesion/tipos)
styles/     → index.css (Tailwind)
assets/     → logo + video
index.js    → backend Express en JS puro (sirve dist/) + lib/supabase.ts (SDK en TS)
supabase/   → migrations (0001 esquema inicial: users, user_profiles, favoritos)
.docs/      → DOCUMENTACION.md (detalle técnico de cada módulo y endpoint)
```

> Organización adaptada de [perfumes-web](https://github.com/AlxjoRuiz/perfumes-web)
> (raíz con `supabase/`, `.docs/`, `.env.example`, `.nvmrc`, `npm run lint` por
> paquete). Las carpetas `app/`, `components/` y `pages/api` de esa referencia
> son propias de Next.js y no aplican: este proyecto usa Express + Vite.
>
> | perfumes-web | spotify-clone |
> |---|---|
> | `app/` (rutas) | `pages/` + `scripts/vistas/` |
> | `components/{…}` | `scripts/componentes.tsx` + vistas |
> | `lib/` | `scripts/{api,utils,sesion}.ts` y `lib/supabase.js` |
> | `types/` | `scripts/tipos.ts` |
> | `public/` | `assets/` |
> | `supabase/` | `supabase/` (igual) |
> | `pages/api` | `index.js` (Express) |

## Deploy

Para una URL pública (Railway/Render/VPS): configurar las mismas variables de entorno en el hosting, registrar la Redirect URI de producción en el Spotify Dashboard (ej: `https://tu-app.up.railway.app/auth/spotify/callback`) y aplicar la migración en Supabase.

Antes de publicar, reemplazá el almacenamiento de sesión en memoria de `express-session` por un store persistente (Redis o la base de datos). El store en memoria se pierde al reiniciar el proceso y no se debe usar con varias instancias del servidor.
