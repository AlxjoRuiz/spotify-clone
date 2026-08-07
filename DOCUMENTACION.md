# Documentación del proyecto — Spotify Clone

Clon de Spotify con **login usando la cuenta de Spotify** (Authorization Code Flow) y persistencia de usuarios en **Supabase**.

---

## 1. Cómo funciona en una frase

El usuario hace click en "Log in to Spotify" → Spotify le pide autorización → cuando autoriza, Spotify nos manda un `code` → el servidor cambia ese `code` por un `access_token` y un `refresh_token` → guarda al usuario y sus tokens en Supabase → redirige al dashboard.

Los tokens viven en dos lugares:
- **Sesión del navegador** (memoria del servidor): para atender las peticiones del usuario mientras está logueado.
- **Supabase** (`user_profiles`): para renovar el token cuando vence, aunque el servidor se reinicie.

---

## 2. Archivos del proyecto

```
spotify/
├── frontend/
│   ├── pages/
│   │   ├── index.html        -> Página de login (botón "Log in to Spotify")
│   │   └── dashboard.html    -> Dashboard protegido
│   ├── scripts/
│   │   └── dashboard.js      -> Trae /api/canciones y dibuja las tarjetas
│   └── styles/               -> CSS del login y del dashboard
└── server/
    ├── index.js              -> TODO el backend (el archivo que documentamos)
    ├── package.json          -> Dependencias (express, axios, express-session, dotenv)
    └── .env                  -> Variables secretas (NO se sube a git)
```

---

## 3. Variables de entorno (`.env`)

El archivo `.env` está en `server/.env` y carga con `dotenv`. Contiene:

| Variable | Para qué sirve |
|---|---|
| `PORT` | Puerto donde corre el servidor (3000) |
| `SPOTIFY_CLIENT_ID` | Identifica tu app de Spotify (Dashboard de Spotify) |
| `SPOTIFY_CLIENT_SECRET` | Secreto de tu app de Spotify |
| `SPOTIFY_REDIRECT_URI` | A dónde Spotify redirige tras autorizar (`http://127.0.0.1:3000/auth/spotify/callback`) |
| `SUPABASE_URL` | URL de tu proyecto de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Key secreta de Supabase (acceso admin, saltea RLS) |

> **Importante:** el `.env` está en `.gitignore`, así que las claves no suben a git.

---

## 4. El código completo, documentado

### 4.1 Configuración inicial

```js
require('dotenv').config(); // Carga las variables del .env (credenciales, puerto)
```

Carga las variables del archivo `.env`. Siempre va primero, porque el resto del código usa `process.env`.

```js
const path = require('path');
const express = require('express');
const session = require('express-session'); // Guarda el token de Spotify en la sesión del usuario
const axios = require('axios'); // Hace las peticiones HTTP a Spotify y Supabase

const app = express();
```

Importa las librerías:
- `path` → arma rutas de archivos.
- `express` → el framework del servidor.
- `express-session` → mantiene la sesión del usuario (dónde vive el `access_token` entre peticiones).
- `axios` → hace peticiones HTTP (habla con Spotify y con Supabase).

`app` es la aplicación del servidor.

### 4.2 Login y sesión

```js
function verificarLogin(req, res, next) {
    if (req.session.spotify_access_token) {
        next();
    } else {
        res.redirect('/pages/index.html');
    }
};
```

**Middleware de protección.** Se coloca en las rutas que quieren sesión. ¿Cómo sabemos que el usuario está logueado? Porque tiene un `access_token` guardado en la sesión. Si lo tiene, pasa a la ruta (`next()`); si no, lo manda al login.

```js
app.use(session({
    secret: 'un_secreto_cualquiera', // En producción, mover al .env
    resave: false,
    saveUninitialized: true
}));
```

Activa las sesiones. La cookie firma un identificador que "recuerda" al usuario entre peticiones. En producción el `secret` va en el `.env`.

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

```js
const PORT = process.env.PORT;

app.get('/', (req, res) => {
    res.send('¡Servidor funcionando!');
});
```

Ruta de prueba para confirmar que el servidor está vivo.

### 4.3 Credenciales

```js
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

Guarda las credenciales de Spotify (para autenticar) y de Supabase (para persistir datos) en constantes, leídas del `.env`.

### 4.4 Helpers de Supabase

Estas tres funciones hacen lo mismo de distinta forma: pegarle a la **REST API de Supabase** usando la `SERVICE_ROLE_KEY`. Al usar la key de admin, se saltea el RLS y puede leer/escribir todo.

#### `upsertSupabaseTable` — insertar o actualizar

```js
async function upsertSupabaseTable(table, payload, onConflict) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}${onConflict ? `?on_conflict=${onConflict}` : ''}`;
    const response = await axios.post(url, payload, {
        headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation'
        }
    });
    return response.data;
}
```

- **`upsert`** = "INSERT si no existe, UPDATE si ya existe".
- `on_conflict` → columna única que decide si crea o actualiza. Se manda **en la URL** (`?on_conflict=spotify_id`).
- `Prefer: resolution=merge-duplicates` → si la fila ya existe, la actualiza (merges).
- `Prefer: return=representation` → devuelve la fila creada/actualizada (con su `id`).
- Devuelve un array con la(s) fila(s) o `null` si faltan las credenciales.

#### `leerSupabase` — leer filas

```js
async function leerSupabase(table, filtros) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;

    const query = new URLSearchParams();
    for (const [columna, valor] of Object.entries(filtros)) {
        query.append(columna, `eq.${valor}`);
    }

    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?${query.toString()}`;
    const response = await axios.get(url, {
        headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
    });
    return response.data;
}
```

Lee filas con filtros tipo `columna=valor`. Ejemplo: `leerSupabase('user_profiles', { user_id: 5 })` genera `?user_id=eq.5` (el `eq.` significa "equal to"). Devuelve un array de filas.

#### `renovarAccessTokenSpotify` — token nuevo cuando vence

```js
async function renovarAccessTokenSpotify(userId) {
    try {
        const filas = await leerSupabase('user_profiles', { user_id: userId });
        const refreshToken = filas?.[0]?.refresh_token_spotify;
        if (!refreshToken) return null;

        const response = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: SPOTIFY_CLIENT_ID,
                client_secret: SPOTIFY_CLIENT_SECRET
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const nuevoToken = response.data.access_token;

        await upsertSupabaseTable('user_profiles', {
            user_id: userId,
            token_spotify: nuevoToken,
            refresh_token_spotify: response.data.refresh_token ?? refreshToken
        }, 'user_id');

        return nuevoToken;
    } catch (error) {
        console.error('Error al renovar token:', error.response?.data || error.message);
        return null;
    }
}
```

1. Busca en Supabase el `refresh_token_spotify` del usuario.
2. Se lo manda a Spotify con `grant_type: refresh_token` para pedir un `access_token` nuevo.
3. Guarda el token nuevo en Supabase (y el `refresh_token` nuevo por si Spotify lo rotó — si no manda uno, conserva el viejo con `?? refreshToken`).
4. Devuelve el token nuevo. Si algo falla, `null`.

> El `refresh_token` dura largo tiempo y permite pedir `access_token`s nuevos sin que el usuario vuelva a autorizar.

### 4.5 Login con Spotify (Authorization Code Flow)

#### Paso 1 — `/auth/spotify`: mandar al usuario a Spotify

```js
app.get('/auth/spotify', (req, res) => {
    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: 'user-read-private user-read-email user-read-recently-played'
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});
```

Arma la URL de autorización de Spotify con:
- `client_id` → qué app pide permiso.
- `response_type: code` → pedimos un `code` temporal (Authorization Code Flow).
- `redirect_uri` → a dónde volver cuando el usuario decida.
- `scope` → qué permisos pedimos: perfil, email y canciones escuchadas recientemente.

#### Paso 2 — `/auth/spotify/callback`: el usuario volvió

```js
app.get('/auth/spotify/callback', async (req, res) => {
    const code = req.query.code;
```

Spotify manda el `code` temporal como parámetro de la URL. Ese código solo sirve una vez.

```js
    try {
        // 1) Cambia el code por un access_token + refresh_token
        const response = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: SPOTIFY_REDIRECT_URI,
                client_id: SPOTIFY_CLIENT_ID,
                client_secret: SPOTIFY_CLIENT_SECRET
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = response.data.access_token;
        const refreshToken = response.data.refresh_token;
        req.session.spotify_access_token = accessToken;
```

Cambia el `code` por los tokens. Guarda el `access_token` en la sesión (ahí el usuario queda "logueado") y se queda con el `refresh_token` para guardarlo en Supabase.

```js
        // 2) Pregunta a Spotify quién es el usuario dueño de ese token
        const perfilResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const perfilSpotify = perfilResponse.data;
```

Con el token, le pregunta a Spotify `/me` quién es el usuario. Devuelve `{ id, display_name, email, ... }`.

```js
        // 3) Guarda/actualiza al usuario en la tabla `users`, identificado por spotify_id
        const userRows = await upsertSupabaseTable('users', {
            spotify_id: perfilSpotify.id,
            display_name: perfilSpotify.display_name ?? null,
            email: perfilSpotify.email ?? null
        }, 'spotify_id');

        const user = userRows?.[0] ?? null;
```

Guarda o actualiza el usuario en Supabase buscándolo por `spotify_id` (si no existe, lo crea). `userRows[0]` es la fila de la tabla `users`, que incluye su `id` (uuid interno).

```js
        if (user) {
            // 4) Guarda/actualiza sus tokens en `user_profiles`, vinculados por user_id
            await upsertSupabaseTable('user_profiles', {
                user_id: user.id,
                token_spotify: accessToken,
                refresh_token_spotify: refreshToken ?? null
            }, 'user_id');

            req.session.spotify_user = user;
        } else {
            console.warn('No se pudo guardar el usuario en Supabase. Revisá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
        }
```

Guarda los tokens en `user_profiles`, vinculados al `id` (uuid) del usuario en `users`. También guarda el usuario en la sesión (`spotify_user`), porque se usa después para renovar el token si vence.

```js
        res.redirect(`/pages/dashboard.html?nombre=${encodeURIComponent(perfilSpotify.display_name ?? '')}`);

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.send('Error al conectar con Spotify');
    }
});
```

Redirige al dashboard pasándole el nombre real por la URL (`?nombre=`), para que el frontend salude al usuario. Si cualquier paso falla, cae al `catch`, imprime el error real en la terminal y muestra "Error al conectar con Spotify".

### 4.6 API propia — canciones recientes

```js
app.get('/api/canciones', async (req, res) => {
    let token = req.session.spotify_access_token;

    try {
        const response = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        res.json(response.data);

    } catch (error) {
        // Token vencido (401): renueva con el refresh_token y reintenta una vez
        if (error.response?.status === 401) {
            const userId = req.session.spotify_user?.id;
            const tokenNuevo = userId ? await renovarAccessTokenSpotify(userId) : null;

            if (tokenNuevo) {
                req.session.spotify_access_token = tokenNuevo;
                try {
                    const reintento = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
                        headers: { 'Authorization': `Bearer ${tokenNuevo}` }
                    });
                    return res.json(reintento.data);
                } catch (errorReintento) {
                    console.error(errorReintento.response?.data || errorReintento.message);
                }
            }
        }

        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudieron obtener las canciones' });
    }
});
```

1. Pide a Spotify las canciones escuchadas recientemente usando el token de la sesión.
2. Si todo bien, las devuelve al navegador como JSON.
3. Si Spotify responde **401 (token vencido)**:
   - Busca el `userId` en la sesión.
   - Llama a `renovarAccessTokenSpotify(userId)` para pedir un token nuevo con el `refresh_token`.
   - Si consigue token nuevo, lo guarda en la sesión y **reintenta** la petición una vez.
4. Si falla de nuevo (o no hay refresh), devuelve un error 500 con mensaje.

> **Cómo probar la renovación:** cuando el `access_token` vence (aprox. 1 hora), sin volver a loguearte, recargá el dashboard: debería seguir funcionando automáticamente.

### 4.7 Arranque

```js
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
```

Levanta el servidor en el puerto de `.env` y avisa por consola.

---

## 5. Estructura de la base de datos (Supabase)

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

## 6. Flujo de renovación del token (resumen)

```
Acceso al dashboard
      │
      ▼
/api/canciones usa el access_token de la sesión
      │
      ├── Spotify responde OK ──────────────► devuelve las canciones
      │
      └── Spotify responde 401 (venció)
              │
              ▼
      renovarAccessTokenSpotify(userId)
              │  1. Lee refresh_token_spotify de Supabase
              │  2. Pide token nuevo a Spotify (grant_type=refresh_token)
              │  3. Guarda token nuevo en Supabase y en sesión
              ▼
      Reintenta /api/canciones una vez
```

---

## 7. Cómo levantar el proyecto

```bash
cd server
npm install        # la primera vez
node index.js
```

- Login: http://127.0.0.1:3000/pages/index.html
- Test del servidor: http://127.0.0.1:3000/

> Las sesiones viven en la memoria del servidor: si lo reiniciás, el usuario se desloguea y tiene que volver a entrar con Spotify.
