# Documentación del proyecto — Spotify Clone

Clon de Spotify con **login usando la cuenta de Spotify** (Authorization Code Flow), persistencia de usuarios en **Supabase** y dashboard completo con reproductor, búsqueda, perfil dinámico y top artistas/canciones.

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
│   │   ├── dashboard.js               -> Todo el JS del frontend (auth, vistas, reproductor, API)
│   │   ├── login.js                   -> Vacío (código muerto limpiado)
│   │   ├── biblioteca.js              -> Vacío (pendiente)
│   │   ├── buscar.js                  -> Vacío (pendiente)
│   │   └── perfil.js                  -> Vacío (pendiente)
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
| `/api/buscar` | GET | Resultados de búsqueda (`?q=texto`) — tracks, artistas, álbumes, playlists |

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

### 4.6 Login con Spotify (Authorization Code Flow)

#### Scopes (permisos)

```js
scope: 'user-read-private user-read-email user-read-recently-played user-top-read'
```

| Scope | Para qué sirve |
|---|---|
| `user-read-private` | Tipo de cuenta (free/premium), país |
| `user-read-email` | Email del usuario |
| `user-read-recently-played` | Canciones escuchadas recientemente |
| `user-top-read` | Artistas y canciones más escuchados |

#### Paso 1 — `/auth/spotify`: redirigir a Spotify

```js
app.get('/auth/spotify', (req, res) => {
    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: 'user-read-private user-read-email user-read-recently-played user-top-read'
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

### 5.1 dashboard.js — Estructura general

El archivo está dividido en secciones:

1. **Usuario y sesión** (líneas 1-29) — Lee el nombre de la URL, valida que haya sesión, configura logout.
2. **Saludo dinámico** (líneas 32-50) — "Buenos días" / "Buenas tardes" / "Buenas noches".
3. **Sistema de vistas** (líneas 54-86) — Cambia entre Inicio, Explorar, Biblioteca y Perfil.
4. **Reproductor** (líneas 88-252) — Cola de canciones, play/pausa, anterior/siguiente, volumen, barra de progreso.
5. **Playlists populares** (líneas 254-321) — Carga y dibuja las playlists del home.
6. **Búsqueda** (líneas 323-521) — Buscador con Enter y botón, muestra resultados por tipo.
7. **Canciones recientes** (líneas 525-592) — Biblioteca: lo último que escuchaste.
8. **Perfil dinámico** (líneas 594-705) — Trae datos reales de Spotify y los dibuja.
9. **Top artistas** (líneas 707-769) — Los 10 artistas que más escuchás.
10. **Top tracks** (líneas 771-874) — Las 10 canciones que más escuchás.

### 5.2 Funciones principales del frontend

| Función | Qué hace |
|---|---|
| `reproducirPreview()` | Agrega una canción a la cola y la reproduce (preview de 30 seg) |
| `reproducirPorIndice()` | Reproduce una canción específica de la cola |
| `ejecutarBusqueda()` | Pide resultados a `/api/buscar` y los dibuja |
| `cargarCancionesRecientes()` | Pide canciones recientes a `/api/canciones` |
| `cargarPerfilSpotify()` | Pide el perfil a `/api/perfil` y lo dibuja |
| `cargarTopArtistas()` | Pide artistas a `/api/top-artistas` y los dibuja |
| `cargarTopTracks()` | Pide tracks a `/api/top-tracks` y los dibuja |
| `crearTarjetaCancion()` | Crea una tarjeta de canción reutilizable |
| `crearTarjetaArtista()` | Crea una tarjeta de artista (foto circular) |
| `crearTarjetaAlbum()` | Crea una tarjeta de álbum |
| `crearTarjetaPlaylist()` | Crea una tarjeta de playlist |

### 5.3 Estados de carga (Loading states)

Todas las funciones de carga muestran un spinner (`fa-spinner fa-spin`) mientras esperan los datos:
- Playlists del home
- Búsqueda en Explorar
- Canciones recientes en Biblioteca
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

## 8. Cómo levantar el proyecto

```bash
cd server
npm install        # la primera vez
node index.js
```

- Login: http://127.0.0.1:3000/pages/login.html
- Dashboard: http://127.0.0.1:3000/pages/dashboard.html (requiere login)
- Test del servidor: http://127.0.0.1:3000/

> **Nota:** los usuarios necesitan volver a loguearse tras agregar el scope `user-top-read` para autorizar los permisos nuevos.

> Las sesiones viven en la memoria del servidor: si lo reiniciás, el usuario se desloguea y tiene que volver a entrar con Spotify.
