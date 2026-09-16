# Documentación del proyecto — Spotify Clone

Clon de Spotify con **login usando la cuenta de Spotify** (Authorization Code Flow), persistencia de usuarios en **Supabase** y dashboard completo con reproductor, búsqueda, perfil dinámico, top artistas/canciones, vista de álbum, historial de búsquedas y canciones favoritas.

---

## 1. Cómo funciona en una frase

El usuario hace click en "Log in to Spotify" → Spotify le pide autorización → cuando autoriza, Spotify nos manda un `code` → el servidor cambia ese `code` por un `access_token` y un `refresh_token` → guarda al usuario y sus tokens en Supabase → redirige al dashboard con datos reales del perfil.

Los tokens viven en dos lugares:
- **Sesión del navegador** (memoria del servidor): para atender las peticiones del usuario mientras está logueado.
- **Supabase** (`user_profiles`): para renovar el token cuando vence, aunque el servidor se reinicie.

---

## 2. Archivos del proyecto

```
spotify/
├── assets/
│   ├── images/
│   │   └── spotify-logo.png           -> Logo para la pantalla de login
│   └── video/
│       └── video.mp4                  -> Video de fondo del login
├── pages/
│   ├── login.html                     -> Entry login (misma URL, monta scripts/login.tsx)
│   └── dashboard.html                 -> Entry dashboard protegido (monta scripts/main.tsx)
├── scripts/
│   ├── main.tsx                         -> Punto de entrada: layout + Sidebar/Header + providers
│   ├── login.tsx                        -> Página de login (botón /auth/spotify, ?error=)
│   ├── tipos.ts                         -> Tipos Spotify/Supabase (antes implícitos)
│   ├── utils.ts                         -> Helpers (formatearTiempo, duracionTotal, tiempoRelativo, saludo)
│   ├── notificacion.tsx                 -> Toasts no bloqueantes (reemplazan alert)
│   ├── sesion.ts                        -> Nombre de usuario, redirección y logout
│   ├── estado.tsx                       -> Favoritos global (reemplaza corazones + favoritos.js)
│   ├── api.ts                           -> Cliente HTTP para todos los endpoints /api/*
│   ├── reproductor.tsx                  -> Reproductor: cola, play/pausa, shuffle, repeat, volumen
│   ├── componentes.tsx                  -> Tarjetas reutilizables + lista de tracks + spinners
│   ├── navegacion.tsx                   -> Vistas + historial atrás/adelante (reemplaza eventos)
│   └── vistas/
│       ├── inicio.tsx                   -> Home: hero, playlists y "Hecho para ti"
│       ├── busqueda.tsx                 -> Buscador en vivo (debounce) + historial + sugerencias
│       ├── explorar.tsx                 -> Explorar: inicial, resultados, (usa album/playlist)
│       ├── album.tsx                    -> Vista de álbum (canciones + volver a resultados)
│       ├── playlist.tsx                 -> Vista de playlist (canciones + volver a Biblioteca)
│       ├── biblioteca.tsx               -> Canciones recientes + favoritos + tus playlists
│       └── perfil.tsx                   -> Perfil, top artistas y top tracks
├── styles/
│   └── index.css                      -> Entry Tailwind (+ keyframes/slider/scrollbar que Tailwind no cubre)
├── index.js                           -> TODO el backend en JS (Express, auth, API, sirve dist/)
├── lib/supabase.ts                    -> Cliente @supabase/supabase-js en TS (mismas tablas de la migración)
├── .env                               -> Variables secretas (NO se sube a git)
├── supabase/migrations/               -> SQL para recrear la base en otro proyecto (estilo perfumes-web)
│   └── 0001_esquema_inicial.sql       -> Tablas users/user_profiles/favoritos + RLS (idempotente)
└── .docs/DOCUMENTACION.md             -> Este archivo (detalle técnico)
```

---

## 3. Variables de entorno (`.env`)

El archivo `.env` está en la raíz y carga con `dotenv`.

| Variable | Para qué sirve |
|---|---|
| `PORT` | Puerto donde corre el servidor (3000) |
| `SPOTIFY_CLIENT_ID` | Identifica tu app de Spotify (Dashboard de Spotify) |
| `SPOTIFY_CLIENT_SECRET` | Secreto de tu app de Spotify |
| `SPOTIFY_REDIRECT_URI` | A dónde Spotify redirige tras autorizar (`http://127.0.0.1:3000/auth/spotify/callback`) |
| `SUPABASE_URL` | URL de tu proyecto de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Key secreta de Supabase (acceso admin, saltea RLS) |
| `SESSION_SECRET` | Secreto para firmar las sesiones (movido desde el código hardcodeado) |

> **Importante:** el `.env` está en `.gitignore`, así que las claves no suben a git.

---

## 4. El código del backend, documentado

### 4.1 Configuración inicial

```js
require('dotenv').config();
```

Carga las variables del archivo `.env`. Siempre va primero, porque el resto del código usa `process.env`.

```js
const path = require('path');
const express = require('express');
const session = require('express-session');
const axios = require('axios');

const app = express();
```

Importa las librerías:
- `path` → arma rutas de archivos.
- `express` → el framework del servidor.
- `express-session` → mantiene la sesión del usuario (dónde vive el `access_token` entre peticiones).
- `axios` → hace peticiones HTTP (habla con Spotify y con Supabase).

### 4.2 Login y sesión

```js
function verificarLogin(req, res, next) {
    if (req.session.spotify_access_token) {
        next();
    } else {
        res.redirect('/pages/login.html');
    }
}
```

**Middleware de protección.** Se coloca en las rutas que quieren sesión. Si tiene `access_token` en la sesión, deja pasar; si no, manda al login.

```js
app.use(session({
    secret: process.env.SESSION_SECRET || 'un_secreto_cualquiera',
    resave: false,
    saveUninitialized: true
}));
```

Activa las sesiones. El `secret` ahora se lee del `.env` con fallback por si falta.

```js
app.get('/pages/dashboard.html', verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'pages', 'dashboard.html'));
});
```

Ruta protegida: entrega `dashboard.html` solo si `verificarLogin` deja pasar.

```js
app.use(express.static(path.join(__dirname, 'dist')));
```

Sirve el build de Vite (`npm run build`): HTML compilado, JS/CSS con hash y assets. Las URLs (`/pages/*.html`, `/assets/*`) se conservan para no tocar OAuth ni redirects.

### 4.3 Credenciales

```js
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

Guarda las credenciales en constantes, leídas del `.env`.

### 4.4 Helpers de Supabase

Tres funciones tipadas en `lib/supabase.ts` sobre el cliente oficial
`@supabase/supabase-js` con la `SERVICE_ROLE_KEY` (acceso admin, saltea RLS).
Mismas tablas de la migración 0001 y mismos exports que usaba `index.js`.

#### `upsertSupabaseTable` — insertar o actualizar

```js
async function upsertSupabaseTable(table, payload, onConflict) {
    // POST a /rest/v1/{table}?on_conflict={column}
    // Prefer: resolution=merge-duplicates → update si existe
    // Prefer: return=representation → devuelve la fila afectada
}
```

#### `leerSupabase` — leer filas con filtros

```js
async function leerSupabase(table, filtros) {
    // GET a /rest/v1/{table}?column=eq.valor
}
```

#### `renovarAccessTokenSpotify` — token nuevo cuando vence

1. Busca el `refresh_token_spotify` en Supabase.
2. Pide un `access_token` nuevo a Spotify.
3. Guarda ambos tokens actualizados en Supabase.
4. Devuelve el token nuevo (o `null` si falla).

#### `pedirASpotify` — helper genérico con auto-renovación

```js
async function pedirASpotify(url, req) {
    // 1. Intenta la petición con el token actual
    // 2. Si Spotify responde 401 (token vencido):
    //    - Renueva el token con renovarAccessTokenSpotify()
    //    - Actualiza la sesión
    //    - Reintenta la petición una vez
}
```

Este helper lo usan todas las rutas de la API (`/api/canciones`, `/api/perfil`, `/api/top-artistas`, `/api/top-tracks`, `/api/buscar`, `/api/playlists-populares`).

### 4.5 Rutas de la API

| Ruta | Método | Qué devuelve |
|---|---|---|
| `/api/perfil` | GET | Perfil completo del usuario (nombre, email, imagen, tipo cuenta, país, seguidores) |
| `/api/top-artistas` | GET | Los 10 artistas más escuchados (soporta `?time_range=short/medium/long_term`) |
| `/api/top-tracks` | GET | Las 10 canciones más escuchadas (soporta `?time_range=short/medium/long_term`) |
| `/api/canciones` | GET | Canciones escuchadas recientemente |
| `/api/playlists-populares` | GET | Playlists populares de distintos géneros |
| `/api/explorar` | GET | Contenido inicial de Explorar: playlists destacadas (`playlists`) + lanzamientos recientes (`nuevos`) |
| `/api/mis-playlists` | GET | Playlists del usuario logueado (requiere scope `playlist-read-private`) |
| `/api/playlists/:id/tracks` | GET | Datos de la playlist + sus canciones (usado por la vista de playlist) |
| `/api/buscar` | GET | Resultados de búsqueda (`?q=texto`) — tracks, artistas, álbumes, playlists |
| `/api/album/:id/tracks` | GET | Canciones de un álbum específico (usado por la vista de álbum) |
| `/api/favoritos` | GET | Todos los favoritos del usuario logueado |
| `/api/favoritos` | POST | Agrega una canción favorita (body: trackId, nombre, artista, imagen, preview) |
| `/api/favoritos/:trackId` | DELETE | Borra una canción de favoritos del usuario |

#### `/api/perfil`

```js
app.get('/api/perfil', async (req, res) => {
    const perfil = await pedirASpotify('https://api.spotify.com/v1/me', req);
    res.json({
        nombre: perfil.display_name,
        email: perfil.email,
        imagen: perfil.images?.[0]?.url,
        tipo_cuenta: perfil.product,    // "premium" o "free"
        pais: perfil.country,
        seguidores: perfil.followers?.total,
        id_spotify: perfil.id
    });
});
```

#### `/api/top-artistas`

```js
app.get('/api/top-artistas', async (req, res) => {
    const timeRange = req.query.time_range || 'medium_term';
    // short_term = ~4 semanas, medium_term = ~6 meses, long_term = todo
    const data = await pedirASpotify(
        `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=10`, req
    );
    res.json(data);
});
```

#### `/api/top-tracks`

```js
app.get('/api/top-tracks', async (req, res) => {
    const timeRange = req.query.time_range || 'medium_term';
    const data = await pedirASpotify(
        `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=10`, req
    );
    res.json(data);
});
```

#### `/api/album/:id/tracks`

```js
app.get('/api/album/:id/tracks', async (req, res) => {
    // Pide a Spotify las canciones del álbum y los datos del álbum en paralelo
    const [tracksData, albumData] = await Promise.all([
        pedirASpotify(`https://api.spotify.com/v1/albums/${req.params.id}/tracks?limit=50&market=CO`, req),
        pedirASpotify(`https://api.spotify.com/v1/albums/${req.params.id}`, req)
    ]);
    // Devuelve datos del álbum (nombre, artista, portada, fecha, total) + canciones
    res.json({ album: {...}, tracks: tracksData.items });
});
```

#### `/api/favoritos` — agregar

```js
app.post('/api/favoritos', async (req, res) => {
    // Solo si hay usuario logueado (req.session.spotify_user?.id)
    // upsert con on_conflict=user_profile_id,track_id (no duplica)
    await upsertSupabaseTable('favoritos', {
        user_profile_id: userId,
        track_id, track_nombre, track_artista, track_imagen, track_preview
    }, 'user_profile_id,track_id');
    res.json({ ok: true });
});
```

#### `/api/favoritos` — ver

```js
app.get('/api/favoritos', async (req, res) => {
    // Lee de Supabase filtrando por user_profile_id
    const filas = await leerSupabase('favoritos', { user_profile_id: userId });
    res.json({ favoritos: filas || [] });
});
```

#### `/api/favoritos/:trackId` — borrar

```js
app.delete('/api/favoritos/:trackId', async (req, res) => {
    // Filtra por user_profile_id Y track_id para borrar solo el del usuario
    const url = `${...}/rest/v1/favoritos?user_profile_id=eq.${userId}&track_id=eq.${req.params.trackId}`;
    await axios.delete(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, ... } });
    res.json({ ok: true });
});
```

### 4.6 Login con Spotify (Authorization Code Flow)

#### Scopes (permisos)

```js
scope: 'user-read-private user-read-email user-read-recently-played user-top-read playlist-read-private'
```

| Scope | Para qué sirve |
|---|---|
| `user-read-private` | Tipo de cuenta (free/premium), país |
| `user-read-email` | Email del usuario |
| `user-read-recently-played` | Canciones escuchadas recientemente |
| `user-top-read` | Artistas y canciones más escuchados |
| `playlist-read-private` | Playlists del usuario (sección "Tus playlists" de la Biblioteca) |

#### Paso 1 — `/auth/spotify`: redirigir a Spotify

```js
app.get('/auth/spotify', (req, res) => {
    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: 'user-read-private user-read-email user-read-recently-played user-top-read playlist-read-private'
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});
```

#### Paso 2 — `/auth/spotify/callback`: el usuario volvió

1. Cambia el `code` por `access_token` + `refresh_token`.
2. Guarda el `access_token` en la sesión.
3. Pide el perfil del usuario a Spotify (`/v1/me`).
4. Upsert del usuario en Supabase tabla `users` (por `spotify_id`).
5. Upsert de los tokens en Supabase tabla `user_profiles`.
6. Redirige a `dashboard.html?nombre=DisplayName`.

### 4.7 Cerrar sesión

```js
app.get('/auth/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/pages/login.html');
    });
});
```

Destruye la sesión y manda al login.

### 4.8 Arranque

```js
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
```

---

## 5. El código del frontend, documentado

### 5.1 Estructura de módulos del frontend

El frontend es **React + TypeScript + Tailwind** (build con Vite, entries
`pages/login.html` y `pages/dashboard.html`). Cada responsabilidad vive en su
propio archivo bajo `scripts/` (misma carpeta y nombres que el JS original,
solo cambia la extensión):

- **`main.tsx`** — Punto de entrada: providers + layout (Sidebar/Header/Reproductor) + vista activa. Monta el saludo, el avatar del header (reemplaza `fa-user` por la foto si hay) y arranca en Inicio.
- **`login.tsx`** — Página de login (botón `/auth/spotify`, error con `?error=`).
- **`tipos.ts`** — Tipos Spotify/Supabase (`Track`, `Artist`, `Perfil`, `FavoritoRow`…); antes eran contratos implícitos.
- **`utils.ts`** — Helpers puros: `formatearTiempo()`, `formatearDuracionTotal()`, `tiempoRelativo()`, `saludoSegunHora()`. (`escaparHTML()` no existe más: React escapa por defecto.)
- **`sesion.ts`** — Nombre desde `?nombre=`/localStorage, redirect a `login.html` sin sesión y `cerrarSesion()`.
- **`estado.tsx`** — `FavoritosProvider` + `useFavoritos()`: ids, lista y `toggle()`/`recargar()` contra Supabase. Absorbe a `favoritos.js`; el re-render reemplaza a `actualizarCorazones()`.
- **`api.ts`** — Mismo objeto `API` con todos los fetch al backend (mismos endpoints).
- **`notificacion.tsx`** — `ToastProvider` + `useToast(mensaje, tipo)` (ok/error/info, 3s, arriba a la derecha).
- **`reproductor.tsx`** — `PlayerProvider` + `usePlayer()` + componente `Reproductor`: cola, play/pausa, anterior/siguiente, **shuffle**, **repeat (lista/una)**, volumen, mute, progreso, seek, atajo `Espacio` y **corazón "me gusta"**. `reproducirPreview()` / `reproducirTrack()`.
- **`componentes.tsx`** — `TrackCard` (play + corazón + línea extra + variante top), `ArtistCard` (circular), `AlbumCard`, `PlaylistCard` (detalle o Spotify externo), `TrackList` (filas de álbum/playlist), `Seccion`/`GridTarjetas`/`SinResultados`/`Spinner`/`ErrorCarga`.
- **`navegacion.tsx`** — `NavProvider` + `useNav()`: vista activa, **historial atrás/adelante**, estado `Explorar` multifunción (inicial/búsqueda/álbum/playlist) y `volverAResultados()`. Reemplaza al router por eventos de `window`.
- **`vistas/`** — Un componente por archivo: `inicio.tsx` (hero + "Hecho para ti", cache de módulo), `busqueda.tsx` (`useBuscador`: debounce 400ms + historial + sugerencias), `explorar.tsx`, `album.tsx`, `playlist.tsx`, `biblioteca.tsx` (recientes + favs + playlists, recarga por visita) y `perfil.tsx` (perfil + tabs de rango con cache por rango).

> **Comunicación sin ciclos:** donde había eventos en `window` (`mostrar-vista`, `volver-a-resultados`, `volver-a-explorar`) ahora hay funciones del contexto de navegación (`navegar()`, `buscar()`, `abrirAlbum()`, `abrirPlaylist()`, `volverAResultados()`). Las vistas no se importan entre sí.

### 5.2 Funciones principales del frontend

| Función / hook | Módulo | Qué hace |
|---|---|---|
| `reproducirPreview()` / `reproducirTrack()` | `reproductor.tsx` | Agrega una canción a la cola y la reproduce (preview de 30 seg) |
| `useBuscador()` | `vistas/busqueda.tsx` | Historial, debounce, sugerencias y `buscar()` (ignora respuestas viejas) |
| `Inicio` (+ cache de módulo) | `vistas/inicio.tsx` | Hero, playlists y secciones "Hecho para ti" (carga una vez) |
| `Explorar` (+ `nonce`) | `vistas/explorar.tsx` | Inicial (destacadas + lanzamientos), resultados o detalle álbum/playlist |
| `Recientes` / `Favoritos` / `MisPlaylists` | `vistas/biblioteca.tsx` | Recientes con "hace X", favs del estado global, playlists (recarga por visita) |
| `DetallePlaylist` | `vistas/playlist.tsx` | Playlist con canciones + volver a Biblioteca |
| `Perfil` (+ cache por rango) | `vistas/perfil.tsx` | Perfil, tabs de rango y tops (respeta el rango elegido) |
| `TrackCard` / `ArtistCard` | `componentes.tsx` | Tarjeta canción (play + corazón) / artista (foto circular) |
| `AlbumCard` / `PlaylistCard` | `componentes.tsx` | Abren el detalle vía navegación (o Spotify externo en el home) |
| `TrackList` | `componentes.tsx` | Filas con play (compartida por álbumes y playlists) |
| `DetalleAlbum` | `vistas/album.tsx` | Álbum con canciones + volver a resultados |
| `toggle()` / `recargar()` | `estado.tsx` | Toggle corazón en Supabase y recarga de favoritos |
| `mostrarToast()` | `notificacion.tsx` | Toast ok/error/info de 3s |
| `navegar()` / `buscar()` / `volverAResultados()` | `navegacion.tsx` | Cambio de vista, búsqueda y retorno con historial |

### 5.3 Estados de carga (Loading states)

Todas las funciones de carga muestran un spinner (`fa-spinner fa-spin`) mientras esperan los datos:
- Playlists del home
- Contenido inicial de Explorar
- Búsqueda en Explorar
- Canciones recientes en Biblioteca
- Playlists del usuario en Biblioteca
- Perfil y top artistas/tracks en Perfil

Si falla, muestran un mensaje de error con `sin-resultados`.

### 5.4 Responsive design

El CSS tiene 3 breakpoints:

| Breakpoint | Qué cambia |
|---|---|
| `≤1024px` | Sidebar más angosta (200px) |
| `≤768px` | Sidebar horizontal, reproductor apilado, tarjetas más pequeñas |
| `≤480px` | Tarjetas extra compactas, nombre oculto en header |

---

## 6. Estructura de la base de datos (Supabase)

### Tabla `users`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | Clave primaria, se genera sola |
| `created_at` | timestamptz | Fecha de creación |
| `spotify_id` | text | **ÚNICO** — identifica al usuario en Spotify |
| `display_name` | text | Nombre que muestra en Spotify |
| `email` | text | Email de Spotify |

### Tabla `user_profiles`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | Clave primaria, se genera sola |
| `created_at` | timestamptz | Fecha de creación |
| `user_id` | uuid | **FK → users.id**, UNIQUE, ON UPDATE/DELETE CASCADE |
| `token_spotify` | text | Access token vigente |
| `refresh_token_spotify` | text | Token para renovar cuando vence |

### Tabla `favoritos`

| Columna | Tipo | Notas |
|---|---|---|
| `id` | uuid | Clave primaria, se genera sola |
| `user_profile_id` | uuid | **FK → user_profiles.id**, ON DELETE CASCADE |
| `track_id` | text | ID de la canción en Spotify |
| `track_nombre` | text | Nombre de la canción |
| `track_artista` | text | Nombre del artista |
| `track_imagen` | text | URL de la portada |
| `track_preview` | text | URL del preview de 30 segundos |
| `created_at` | timestamptz | Fecha en que se guardó |

**Clave única `(user_profile_id, track_id)`:** un usuario no puede guardar dos veces la misma canción. RLS activado con políticas permisivas (la seguridad real la da el backend con la `SERVICE_ROLE_KEY`).

### Recrear la base en otro proyecto (migración)

Para que cualquiera que reciba el repo tenga la misma base de datos, existe una **migración SQL idempotente** en `supabase/migrations/0001_esquema_inicial.sql`. Pasos para un proyecto nuevo:

1. Crear un proyecto en [Supabase](https://supabase.com) y copiar la `Service Role Key` y la `URL`.
2. Aplicar la migración de cualquiera de estas formas:
   - **Sin CLI:** Dashboard → SQL Editor → pegar el contenido del archivo → *Run*.
   - **Con CLI:** `supabase link --project-ref tu-proyecto` y luego `supabase db push`.
3. Crear `.env` en la raíz copiando `.env.example` y completar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (además de las keys de Spotify).
4. Listo: al primer login, el backend crea/actualiza solas las filas de `users`, `user_profiles` y `favoritos`.

> La migración usa `CREATE TABLE IF NOT EXISTS` y agrega las claves únicas solo si faltan (por eso puede correrse varias veces sin romper nada). RLS queda habilitado sin políticas: el acceso real pasa por la `SERVICE_ROLE_KEY` del backend.

---

## 7. Flujo de renovación del token

```
Cualquier petición a la API (perfil, top, canciones, etc.)
      │
      ▼
pedirASpotify() usa el access_token de la sesión
      │
      ├── Spotify responde OK ──────────────► devuelve los datos
      │
      └── Spotify responde 401 (venció)
              │
              ▼
      renovarAccessTokenSpotify(userId)
              │  1. Lee refresh_token_spotify de Supabase
              │  2. Pide token nuevo a Spotify (grant_type=refresh_token)
              │  3. Guarda token nuevo en Supabase y en sesión
              ▼
      Reintenta la petición una vez
```

---

## 7.1 Canciones favoritas — flujo

```
Click en corazón (tarjeta de canción)
       │
       ├── vacío ──► POST /api/favoritos ──► upsert en tabla favoritos (Supabase)
       │                  ▲                        │
       │                  └── { ok:true } ◄────────┘
       │                            │
       │                            └──► corazón se llena (clase activo)
       │
       └── lleno ──► DELETE /api/favoritos/:trackId
                           └── borra fila en Supabase → corazón se vacía

Entrar a Biblioteca → `recargar()` → GET /api/favoritos → la lista se re-renderiza
```

El botón es un **toggle**: según si el id está en el estado global decide si agrega o borra; al quitar desde Biblioteca la tarjeta desaparece sola (se filtra de la lista).

## 7.2 Historial de búsquedas

- Se guarda en `localStorage` del navegador (clave `historial_busquedas`).
- Guarda las últimas **5** búsquedas, sin repetir.
- Se muestran como "chips" clicables bajo el buscador; al hacer click re-ejecutan esa búsqueda.
- Es solo del navegador (no del servidor), así que no requiere backend ni Supabase.

---

## 8. Cómo levantar el proyecto

```bash
npm install        # la primera vez (raíz: backend + frontend)
npm run build      # frontend React -> dist/
npm start          # backend en http://localhost:3000
```

- Login: http://127.0.0.1:3000/pages/login.html
- Dashboard: http://127.0.0.1:3000/pages/dashboard.html (requiere login)
- Test del servidor: http://127.0.0.1:3000/

> **Nota:** los usuarios necesitan volver a loguearse tras agregar un scope nuevo (`user-top-read`, `playlist-read-private`) para autorizar los permisos nuevos.

> Las sesiones viven en la memoria del servidor: si lo reiniciás, el usuario se desloguea y tiene que volver a entrar con Spotify.
