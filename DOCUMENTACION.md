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
├── frontend/
│   ├── assets/
│   │   ├── images/
│   │   │   └── spotify-logo.png       -> Logo para la pantalla de login
│   │   └── video/
│   │       └── video.mp4              -> Video de fondo del login
│   ├── pages/
│   │   ├── login.html                 -> Página de login (botón "Log in to Spotify")
│   │   └── dashboard.html             -> Dashboard protegido (4 vistas)
│   ├── scripts/
│   │   ├── main.js                      -> Punto de entrada (ES modules): saludo + carga inicial
│   │   ├── utils.js                     -> Helpers (formatearTiempo, escaparHTML, saludoSegunHora)
│   │   ├── sesion.js                    -> Nombre de usuario, redirección y logout
│   │   ├── estado.js                    -> Estado global de favoritos (corazones sincronizados)
│   │   ├── api.js                       -> Cliente HTTP para todos los endpoints /api/*
│   │   ├── favoritos.js                 -> CRUD de favoritos (sincroniza estado.js con Supabase)
│   │   ├── reproductor.js               -> Reproductor: cola, play/pausa, shuffle, repeat, volumen
│   │   ├── componentes.js               -> Tarjetas DOM reutilizables (canción, artista, álbum, playlist)
│   │   ├── navegacion.js                -> Cambio de vistas + carga perezosa de Biblioteca/Perfil + router por eventos
│   │   └── vistas/
│   │       ├── inicio.js                -> Home: hero, playlists y "Hecho para ti"
│   │       ├── busqueda.js              -> Buscador + historial + sugerencias
│   │       ├── explorar.js              -> Contenido inicial de Explorar (destacadas + lanzamientos)
│   │       ├── album.js                 -> Vista de álbum (canciones + volver a resultados)
│   │       ├── playlist.js              -> Vista de playlist del usuario (canciones + volver a Biblioteca)
│   │       ├── biblioteca.js            -> Canciones recientes + favoritos + tus playlists
│   │       └── perfil.js                -> Perfil, top artistas y top tracks
│   └── styles/
│       ├── login.css                  -> Estilos del login (glassmorphism, video de fondo)
│       └── dashboard.css              -> Estilos del dashboard (tema Spotify oscuro, responsive)
└── server/
    ├── index.js                       -> TODO el backend (Express, auth, API, Supabase)
    ├── package.json                   -> Dependencias
    └── .env                           -> Variables secretas (NO se sube a git)
```

---

## 3. Variables de entorno (`.env`)

El archivo `.env` está en `server/.env` y carga con `dotenv`.

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
    res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'dashboard.html'));
});
```

Ruta protegida: entrega `dashboard.html` solo si `verificarLogin` deja pasar.

```js
app.use(express.static(path.join(__dirname, '..', 'frontend')));
```

Sirve todos los archivos del frontend (HTML, CSS, JS, imágenes) automáticamente.

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

Tres funciones que pegan directo a la **REST API de Supabase** usando la `SERVICE_ROLE_KEY` (acceso admin, saltea RLS).

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

El frontend usa **ES Modules** (`<script type="module" src="../scripts/main.js">`). Cada responsabilidad vive en su propio archivo y se importa/exporta explícitamente, eliminando el monolito de `dashboard.js`:

- **`main.js`** — Punto de entrada: pinta el saludo dinámico, carga playlists del home, el estado de favoritos y la **foto de perfil en el header** (reemplaza el icono genérico `fa-user` por la imagen del usuario si tiene).
- **`utils.js`** — Helpers puros: `formatearTiempo()`, `escaparHTML()` (anti-XSS), `saludoSegunHora()`.
- **`sesion.js`** — Lee el nombre de la URL/localStorage, redirige a `login.html` si no hay sesión y configura el logout.
- **`estado.js`** — Estado global de favoritos (`favoritosIds`), consultable con `esFavorito()` y modificable solo vía `setFavoritosIds()` / `actualizarFavoritoLocal()`. `actualizarCorazones()` refresca los corazones de las tarjetas **y el corazón "me gusta" del reproductor**.
- **`api.js`** — Un solo objeto `API` con todos los fetch del backend (playlists, búsqueda, album, perfil, top, favoritos).
- **`favoritos.js`** — `obtenerFavoritos()` y `guardarFavorito()` (toggle) que sincronizan `estado.js` con Supabase.
- **`reproductor.js`** — Cola de canciones, play/pausa, anterior/siguiente, **shuffle (aleatorio)**, **repeat (repetir lista/canción)**, volumen, barra de progreso y **corazón "me gusta"** (marca como favorita la canción que suena). Exporta `reproducirPreview()`.
- **`componentes.js`** — Creadores de tarjetas (`crearTarjetaCancion`, artista, álbum, playlist, top track), `agregarSeccion()` y `crearListaTracks()` (lista de canciones compartida por álbumes y playlists). Las tarjetas de álbum y playlist reciben un callback para abrir el detalle sin crear dependencias circulares.
- **`navegacion.js`** — `mostrarVista()`, los clics del sidebar, **historial de vistas** (flechas atrás/adelante del header) y un **router por eventos** (`mostrar-vista`) que cualquier módulo puede disparar para navegar sin importar navegación. Biblioteca/Perfil usan **carga perezosa**.
- **`vistas/`** — Una vista por archivo: `inicio.js` (home con hero, playlists y "Hecho para ti"), `busqueda.js`, `explorar.js`, `album.js`, `playlist.js`, `biblioteca.js` y `perfil.js`.

> **Comunicación entre módulos sin ciclos:** las vistas que necesitan navegar (explorar, playlist) disparan el evento `mostrar-vista` en `window`, que `navegacion.js` interpreta. La vista de álbum emite `volver-a-resultados` para volver a la búsqueda; si el álbum se abrió desde Explorar (sin búsqueda previa), `busqueda.js` emite `volver-a-explorar` para que Explorar recargue su contenido inicial. Así ningún módulo de vista importa a otro de forma circular.

### 5.2 Funciones principales del frontend

| Función | Módulo | Qué hace |
|---|---|---|
| `reproducirPreview()` | `reproductor.js` | Agrega una canción a la cola y la reproduce (preview de 30 seg) |
| `reproducirPorIndice()` | `reproductor.js` | Reproduce una canción específica de la cola |
| `ejecutarBusqueda()` | `vistas/busqueda.js` | Guarda en historial, pide resultados a `/api/buscar` y los dibuja |
| `cargarPlaylists()` | `vistas/inicio.js` | Carga las playlists del home, el hero y las secciones personalizadas "Hecho para ti" |
| `cargarExplorar()` | `vistas/explorar.js` | Carga el contenido inicial de Explorar (destacadas + lanzamientos), solo si la vista está vacía |
| `cargarCancionesRecientes()` | `vistas/biblioteca.js` | Pide canciones recientes a `/api/canciones` |
| `cargarMisPlaylists()` | `vistas/biblioteca.js` | Pide las playlists del usuario a `/api/mis-playlists` y las dibuja |
| `cargarPlaylistDetalle()` | `vistas/playlist.js` | Muestra una playlist del usuario con sus canciones |
| `cargarPerfilSpotify()` | `vistas/perfil.js` | Pide el perfil a `/api/perfil` y lo dibuja |
| `cargarTopArtistas()` | `vistas/perfil.js` | Pide artistas a `/api/top-artistas` y los dibuja (respeta el rango elegido en los tabs) |
| `cargarTopTracks()` | `vistas/perfil.js` | Pide tracks a `/api/top-tracks` y los dibuja (respeta el rango de los tabs) |
| `crearTarjetaCancion()` | `componentes.js` | Crea una tarjeta de canción reutilizable (play + corazón) |
| `crearTarjetaArtista()` | `componentes.js` | Crea una tarjeta de artista (foto circular) |
| `crearTarjetaAlbum()` | `componentes.js` | Crea una tarjeta de álbum (abre la vista de álbum vía callback) |
| `crearTarjetaPlaylist()` | `componentes.js` | Crea una tarjeta de playlist (callback opcional para abrir el detalle) |
| `crearListaTracks()` | `componentes.js` | Lista de canciones con play (compartida por álbumes y playlists) |
| `crearBotonFavorito()` | `componentes.js` | Crea el botón corazón de una tarjeta |
| `cargarAlbum()` | `vistas/album.js` | Muestra la vista de un álbum con sus canciones |
| `guardarFavorito()` | `favoritos.js` | Agrega o quita una canción de favoritos (toggle corazón en Supabase) |
| `cargarFavoritos()` | `vistas/biblioteca.js` | Trae y dibuja los favoritos en la Biblioteca |
| `obtenerFavoritos()` | `favoritos.js` | Sincroniza el estado global de corazones con Supabase |

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

Entrar a Biblioteca → cargarFavoritos() → GET /api/favoritos → dibuja lista
```

El botón es un **toggle**: según su estado (clase `activo`) decide si agrega o borra.

## 7.2 Historial de búsquedas

- Se guarda en `localStorage` del navegador (clave `historial_busquedas`).
- Guarda las últimas **5** búsquedas, sin repetir.
- Se muestran como "chips" clicables bajo el buscador; al hacer click re-ejecutan esa búsqueda.
- Es solo del navegador (no del servidor), así que no requiere backend ni Supabase.

---

## 8. Cómo levantar el proyecto

```bash
cd server
npm install        # la primera vez
node index.js
```

- Login: http://127.0.0.1:3000/pages/login.html
- Dashboard: http://127.0.0.1:3000/pages/dashboard.html (requiere login)
- Test del servidor: http://127.0.0.1:3000/

> **Nota:** los usuarios necesitan volver a loguearse tras agregar un scope nuevo (`user-top-read`, `playlist-read-private`) para autorizar los permisos nuevos.

> Las sesiones viven en la memoria del servidor: si lo reiniciás, el usuario se desloguea y tiene que volver a entrar con Spotify.
