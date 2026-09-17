// SERVER Spotify Clone: backend Express que actúa como puente entre el
// frontend, Spotify y Supabase (login OAuth, proxy de la API y favoritos).
require('dotenv').config(); // Carga las variables del .env (credenciales, puerto)

const crypto = require('crypto');
const path = require('path');
const express = require('express');
const session = require('express-session'); // Mantiene al usuario logueado y el token en memoria
const axios = require('axios');             // Peticiones HTTP a Spotify
const { upsertSupabaseTable, leerSupabase, borrarSupabase } = require('./lib/supabase'); // Supabase SDK (mismas tablas de la migración 0001)

const app = express();
// Cliente aislado para Spotify: el timeout evita que una caída externa deje
// solicitudes HTTP abiertas indefinidamente.
const spotifyHttp = axios.create({ timeout: 15_000 });

// Configuración global: JSON para el body, estáticos del build y sesiones firmadas.
app.use(express.json()); // Necesario para leer JSON en req.body (POST /api/favoritos)
app.use(express.static(path.join(__dirname, 'dist'))); // Sirve el build de Vite (npm run build)

// Sesiones firmadas y sin cookies para visitantes anónimos
const PORT = process.env.PORT || 3000;

// Credenciales leídas del .env (nunca se suben al repo).
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
// Fallar al inicio es más claro y seguro que descubrir una credencial ausente
// a mitad de un callback OAuth.
const variablesRequeridas = {
    SPOTIFY_CLIENT_ID,
    SPOTIFY_CLIENT_SECRET,
    SPOTIFY_REDIRECT_URI,
    SESSION_SECRET: process.env.SESSION_SECRET,
};
const faltantes = Object.entries(variablesRequeridas)
    .filter(([, valor]) => !valor || valor.startsWith('tu_') || valor === 'un_secreto_largo_y_aleatorio')
    .map(([nombre]) => nombre);

if (faltantes.length > 0) {
    throw new Error(`Faltan variables de entorno válidas: ${faltantes.join(', ')}. Completá el archivo .env antes de iniciar el servidor.`);
}

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// La cookie solo contiene el identificador firmado de la sesión; los tokens
// permanecen del lado del servidor. En producción solo viaja mediante HTTPS.
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 // 1 día
    }
}));

// playlist-read-private permite listar las playlists del usuario (Biblioteca)
const SCOPE_SPOTIFY = 'user-read-private user-read-email user-read-recently-played user-top-read playlist-read-private playlist-read-collaborative';
const RANGOS_DE_TIEMPO = ['short_term', 'medium_term', 'long_term'];

// Helpers de Supabase: el cliente oficial vive en lib/supabase.ts y trabaja
// con las tablas de la migración 0001 (users, user_profiles, favoritos).

// Jerry-rigged: la tabla `favoritos` referencia a `user_profiles.id`.
// Este helper devuelve ese id (guardado en la sesión durante el login).
function obtenerUserProfileId(req) {
    return req.session.spotify_user_profile_id || null;
}

// Auth Spotify (Authorization Code Flow): redirección a Spotify, callback
// que canjea el code por tokens y los guarda, más cierre de sesión.

// Paso 1: redirigir al usuario a la pantalla de autorización de Spotify
app.get('/auth/spotify', (req, res, next) => {
    // `state` vincula este callback con la sesión que inició el login y evita
    // aceptar callbacks OAuth disparados desde otro sitio (CSRF).
    const state = crypto.randomBytes(24).toString('hex');
    req.session.spotify_oauth_state = state;
    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: SCOPE_SPOTIFY,
        state
    });
    req.session.save((error) => {
        if (error) return next(error);
        res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
    });
});

// Paso 2: Spotify devuelve el `code`; lo cambiamos por tokens y guardamos al usuario
app.get('/auth/spotify/callback', async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;

    try {
        if (req.query.error) throw new Error(`Spotify rechazó la autorización: ${req.query.error}`);
        if (!code || typeof code !== 'string') throw new Error('Spotify no devolvió un código de autorización.');
        if (!state || typeof state !== 'string' || state !== req.session.spotify_oauth_state) {
            throw new Error('El estado OAuth no coincide con la sesión. Volvé a iniciar sesión.');
        }
        delete req.session.spotify_oauth_state;

        // 1) Cambia el code por access_token (ucase) + refresh_token
        const tokenResponse = await spotifyHttp.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: SPOTIFY_REDIRECT_URI
            }),
            { headers: spotifyTokenHeaders() }
        );

        const accessToken = tokenResponse.data.access_token;
        const refreshToken = tokenResponse.data.refresh_token;
        req.session.spotify_access_token = accessToken;

        // 2) Pregunta a Spotify quién es el dueño del token
        const perfilResponse = await spotifyHttp.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const perfilSpotify = perfilResponse.data;

        // 3) Persistir usuario y tokens es opcional para el login. Si Supabase
        // está caído o mal configurado, no debemos rechazar un OAuth válido de
        // Spotify (supabase-js reporta ese caso como "TypeError: fetch failed").
        try {
            const userRows = await upsertSupabaseTable('users', {
                spotify_id: perfilSpotify.id,
                display_name: perfilSpotify.display_name ?? null,
                email: perfilSpotify.email ?? null
            }, 'spotify_id');

            const user = userRows?.[0] ?? null;

            if (user) {
                const profileRows = await upsertSupabaseTable('user_profiles', {
                    user_id: user.id,
                    token_spotify: accessToken,
                    refresh_token_spotify: refreshToken ?? null
                }, 'user_id');
                const profile = profileRows?.[0] ?? null;

                // `users.id` permite renovar el token; `user_profiles.id` se usa
                // para favoritos.
                req.session.spotify_user = user;
                if (profile?.id) req.session.spotify_user_profile_id = profile.id;
            } else {
                console.warn('[auth] Supabase no está configurado; la sesión de Spotify continuará sin favoritos ni renovación de token.');
            }
        } catch (supabaseError) {
            console.error('[auth] No se pudo conectar a Supabase; la sesión de Spotify continuará sin favoritos ni renovación de token:', describirError(supabaseError));
        }

        // Guardar la sesión antes de redirigir evita carreras con stores remotos.
        req.session.save((sessionError) => {
            if (sessionError) {
                console.error('No se pudo guardar la sesión:', describirError(sessionError));
                return res.redirect('/pages/login.html?error=session');
            }
            res.redirect(`/pages/dashboard.html?nombre=${encodeURIComponent(perfilSpotify.display_name ?? '')}`);
        });

    } catch (error) {
        console.error('Error en el callback de Spotify:', error.response?.data || describirError(error));
        res.redirect('/pages/login.html?error=auth');
    }
});

// Incluye la causa de errores de red de Node/undici (por ejemplo ENOTFOUND o
// ECONNREFUSED), que normalmente queda oculta detrás de "fetch failed".
function describirError(error) {
    if (!(error instanceof Error)) return error;
    const causa = error.cause;
    return causa instanceof Error && causa.message
        ? `${error.message} (${causa.message})`
        : error.message;
}

function spotifyTokenHeaders() {
    // Spotify espera Client ID y Client Secret en Basic Auth al canjear o
    // renovar tokens. Nunca se devuelven estas credenciales al frontend.
    const credenciales = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
    return {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credenciales}`
    };
}

// Cerrar sesión: destruye la sesión y vuelve al login
app.get('/auth/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/pages/login.html');
    });
});

// Middleware de protección: solo deja pasar si hay access_token en sesión.

// Solo deja pasar si hay access_token en la sesión; si no, manda al login
function verificarLogin(req, res, next) {
    if (req.session.spotify_access_token) {
        next();
    } else {
        res.redirect('/pages/login.html');
    }
}

// Página del dashboard protegida (se sirve sola si hay sesión)
app.get('/pages/dashboard.html', verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'pages', 'dashboard.html'));
});

// Helpers de Spotify: renuevan el token vencido y reintentan la petición.

// Usa el refresh_token guardado en Supabase para pedirle a Spotify un access_token nuevo
async function renovarAccessTokenSpotify(userId) {
    try {
        const filas = await leerSupabase('user_profiles', { user_id: userId });
        const refreshToken = filas?.[0]?.refresh_token_spotify;
        if (!refreshToken) return null;

        const response = await spotifyHttp.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken
            }),
            { headers: spotifyTokenHeaders() }
        );

        const nuevoToken = response.data.access_token;

        // Spotify a veces rota el refresh_token; si no manda uno nuevo, conserva el viejo
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

// Petición GET a Spotify con auto-renovación: si responde 401, renueva el token y reintenta
async function pedirASpotify(url, req) {
    let token = req.session.spotify_access_token;

    try {
        const response = await spotifyHttp.get(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;

    } catch (error) {
        if (error.response?.status === 401) {
            const userId = req.session.spotify_user?.id;
            const tokenNuevo = userId ? await renovarAccessTokenSpotify(userId) : null;

            if (tokenNuevo) {
                req.session.spotify_access_token = tokenNuevo;

                const reintento = await spotifyHttp.get(url, {
                    headers: { 'Authorization': `Bearer ${tokenNuevo}` }
                });
                return reintento.data;
            }
        }
        throw error;
    }
}

// Normaliza el parámetro time_range (evita valores inválidos)
function validarTimeRange(valor) {
    return RANGOS_DE_TIEMPO.includes(valor) ? valor : 'medium_term';
}

// Toda ruta /api requiere sesión activa. Si expiró devolvemos 401 (JSON)
// y el frontend redirige al login, en vez de un 500 críptico.
app.use('/api', (req, res, next) => {
    if (req.session.spotify_access_token) return next();
    res.status(401).json({ error: 'No autorizado' });
});

// Rutas /api/*: devuelven JSON al frontend; sin sesión responden 401.

// Canciones escuchadas recientemente
app.get('/api/canciones', async (req, res) => {
    try {
        const data = await pedirASpotify('https://api.spotify.com/v1/me/player/recently-played', req);
        res.json(data);
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudieron obtener las canciones' });
    }
});

// Playlists populares armadas desde búsquedas por géneros conocidos
app.get('/api/playlists-populares', async (req, res) => {
    try {
        const busquedas = ['hot hits', 'reggaeton', 'rock', 'pop', 'top 50', 'dance'];

        const resultados = await Promise.all(busquedas.map(busqueda =>
            pedirASpotify(`https://api.spotify.com/v1/search?q=${encodeURIComponent(busqueda)}&type=playlist&limit=3&market=CO`, req)
        ));

        const vistos = new Set();
        const playlists = [];

        for (const resultado of resultados) {
            for (const playlist of resultado.playlists.items) {
                if (!playlist) continue; // Spotify a veces devuelve items nulos
                if (!vistos.has(playlist.id)) {
                    vistos.add(playlist.id);
                    playlists.push(playlist);
                }
            }
        }

        res.json({ playlists });

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudieron obtener las playlists' });
    }
});

// Contenido inicial de Explorar: playlists destacadas + lanzamientos recientes
app.get('/api/explorar', async (req, res) => {
    try {
        const [destacadas, lanzamientos] = await Promise.all([
            pedirASpotify('https://api.spotify.com/v1/browse/featured-playlists?limit=8&market=CO', req),
            pedirASpotify('https://api.spotify.com/v1/browse/new-releases?limit=8&market=CO', req)
        ]);

        res.json({
            playlists: destacadas.playlists?.items ?? [],
            nuevos: lanzamientos.albums?.items ?? []
        });

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudo obtener el contenido de Explorar' });
    }
});

// Playlists del usuario (requiere scope playlist-read-private)
app.get('/api/mis-playlists', async (req, res) => {
    try {
        const data = await pedirASpotify('https://api.spotify.com/v1/me/playlists?limit=20', req);
        res.json({ playlists: data.items ?? [] });

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudieron obtener tus playlists' });
    }
});

// Canciones de una playlist específica (y datos de la playlist)
app.get('/api/playlists/:id/tracks', async (req, res) => {
    try {
        const [tracksData, playlistData] = await Promise.all([
            pedirASpotify(`https://api.spotify.com/v1/playlists/${req.params.id}/tracks?limit=50&market=CO`, req),
            pedirASpotify(`https://api.spotify.com/v1/playlists/${req.params.id}?market=CO`, req)
        ]);

        res.json({
            playlist: {
                id: playlistData.id,
                nombre: playlistData.name,
                dueno: playlistData.owner?.display_name ?? 'Desconocido',
                portada: playlistData.images?.[0]?.url ?? null,
                total_canciones: playlistData.tracks?.total ?? 0
            },
            // Cada item de una playlist puede venir null si la canción se eliminó
            tracks: (tracksData.items ?? []).map(item => item.track).filter(track => track)
        });

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudieron obtener las canciones de la playlist' });
    }
});

// Búsqueda de canciones, artistas, álbumes y playlists
app.get('/api/buscar', async (req, res) => {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        if (!q) return res.status(400).json({ error: 'Falta el término de búsqueda' });
        if (q.length > 100) return res.status(400).json({ error: 'El término de búsqueda es demasiado largo' });

        const data = await pedirASpotify(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track,artist,album,playlist&limit=8&market=CO`, req);
        res.json(data);

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudo buscar' });
    }
});

// Perfil completo del usuario logueado
app.get('/api/perfil', async (req, res) => {
    try {
        const perfil = await pedirASpotify('https://api.spotify.com/v1/me', req);

        res.json({
            nombre: perfil.display_name ?? 'Sin nombre',
            email: perfil.email ?? 'Sin email',
            imagen: perfil.images?.[0]?.url ?? null,
            tipo_cuenta: perfil.product ?? 'free',
            pais: perfil.country ?? 'Desconocido',
            seguidores: perfil.followers?.total ?? 0,
            id_spotify: perfil.id
        });

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudo obtener el perfil' });
    }
});

// Artistas más escuchados (?time_range=short_term|medium_term|long_term)
app.get('/api/top-artistas', async (req, res) => {
    try {
        const timeRange = validarTimeRange(req.query.time_range);
        const data = await pedirASpotify(
            `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=10`,
            req
        );
        res.json(data);

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudieron obtener los artistas' });
    }
});

// Canciones más escuchadas (?time_range=short_term|medium_term|long_term)
app.get('/api/top-tracks', async (req, res) => {
    try {
        const timeRange = validarTimeRange(req.query.time_range);
        const data = await pedirASpotify(
            `https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=10`,
            req
        );
        res.json(data);

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudieron obtener las canciones' });
    }
});

// Canciones de un álbum específico (usado por la vista de álbum)
app.get('/api/album/:id/tracks', async (req, res) => {
    try {
        const [tracksData, albumData] = await Promise.all([
            pedirASpotify(`https://api.spotify.com/v1/albums/${req.params.id}/tracks?limit=50&market=CO`, req),
            pedirASpotify(`https://api.spotify.com/v1/albums/${req.params.id}`, req)
        ]);

        res.json({
            album: {
                nombre: albumData.name,
                artista: albumData.artists[0]?.name ?? 'Desconocido',
                portada: albumData.images?.[0]?.url ?? null,
                fecha: albumData.release_date,
                total_canciones: albumData.total_tracks
            },
            tracks: tracksData.items
        });

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudieron obtener las canciones del álbum' });
    }
});

// Detalle de artista: perfil + top tracks + álbumes para la vista de artista.

// Detalle de un artista en una sola respuesta (3 llamadas en paralelo)
app.get('/api/artistas/:id', async (req, res) => {
    try {
        const [artista, top, albums] = await Promise.all([
            pedirASpotify(`https://api.spotify.com/v1/artists/${req.params.id}`, req),
            pedirASpotify(`https://api.spotify.com/v1/artists/${req.params.id}/top-tracks?market=CO`, req),
            pedirASpotify(`https://api.spotify.com/v1/artists/${req.params.id}/albums?limit=10&market=CO`, req)
        ]);

        res.json({
            artista: {
                id: artista.id,
                nombre: artista.name,
                imagen: artista.images?.[0]?.url ?? null,
                generos: artista.genres ?? [],
                seguidores: artista.followers?.total ?? 0,
                popularidad: artista.popularity ?? 0,
                spotify_url: artista.external_urls?.spotify ?? null
            },
            top: top.tracks ?? [],
            albums: albums.items ?? []
        });

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudo obtener el artista' });
    }
});

// Favoritos en Supabase (tabla favoritos): agregar, listar y borrar por usuario.

// AGREGAR/ACTUALIZAR un favorito
app.post('/api/favoritos', async (req, res) => {
    try {
        const userProfileId = obtenerUserProfileId(req);
        if (!userProfileId) return res.status(401).json({ error: 'No logueado' });

        const { trackId, nombre, artista, imagen, preview } = req.body || {};
        if (!trackId || !nombre || !artista) {
            return res.status(400).json({ error: 'Faltan datos de la canción' });
        }

        // Si ya existe (mismo perfil + track), se actualiza; si no, se crea
        await upsertSupabaseTable('favoritos', {
            user_profile_id: userProfileId,
            track_id: trackId,
            track_nombre: nombre,
            track_artista: artista,
            track_imagen: imagen,
            track_preview: preview
        }, 'user_profile_id,track_id');

        res.json({ ok: true });

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudo guardar el favorito' });
    }
});

// LISTAR todos los favoritos del usuario
app.get('/api/favoritos', async (req, res) => {
    try {
        const userProfileId = obtenerUserProfileId(req);
        if (!userProfileId) return res.status(401).json({ error: 'No logueado' });

        const filas = await leerSupabase('favoritos', { user_profile_id: userProfileId });
        res.json({ favoritos: filas || [] });

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudieron obtener los favoritos' });
    }
});

// BORRAR un favorito (filtra por perfil Y track para que cada usuario borre solo lo suyo)
app.delete('/api/favoritos/:trackId', async (req, res) => {
    try {
        const userProfileId = obtenerUserProfileId(req);
        if (!userProfileId) return res.status(401).json({ error: 'No logueado' });

        const borrado = await borrarSupabase('favoritos', {
            user_profile_id: userProfileId,
            track_id: req.params.trackId
        });

        if (borrado === false) {
            return res.status(500).json({ error: 'No se pudo borrar el favorito' });
        }

        res.json({ ok: true });

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudo borrar el favorito' });
    }
});

// Arranque: ruta de salud y escucha en el puerto configurado.
app.get('/', (req, res) => {
    res.send('¡Servidor funcionando!');
});

// Última barrera para errores inesperados (por ejemplo al guardar una sesión).
// No devuelve detalles internos al navegador ni filtra secretos al cliente.
app.use((error, req, res, next) => {
    console.error('Error no controlado:', describirError(error));
    if (res.headersSent) return next(error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
