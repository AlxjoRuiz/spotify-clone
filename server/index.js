// ------------------------------------------------------------------
// SERVER Spotify Clone
// Backend Express que actúa como puente entre el frontend, Spotify y Supabase.
// ------------------------------------------------------------------
require('dotenv').config(); // Carga las variables del .env (credenciales, puerto)

const path = require('path');
const express = require('express');
const session = require('express-session'); // Mantiene al usuario logueado y el token en memoria
const axios = require('axios');             // Peticiones HTTP a Spotify y a la REST API de Supabase

const app = express();

// ------------------------------------------------------------------
// CONFIGURACIÓN GLOBAL
// ------------------------------------------------------------------
app.use(express.json()); // Necesario para leer JSON en req.body (POST /api/favoritos)
app.use(express.static(path.join(__dirname, '..', 'frontend'))); // Sirve HTML/CSS/JS/imágenes

// Sesiones firmadas y sin cookies para visitantes anónimos
app.use(session({
    secret: process.env.SESSION_SECRET || 'un_secreto_cualquiera', // Cambiar en producción
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 // 1 día
    }
}));

const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------------
// CREDENCIALES (Spotify + Supabase)
// ------------------------------------------------------------------
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// playlist-read-private permite listar las playlists del usuario (Biblioteca)
const SCOPE_SPOTIFY = 'user-read-private user-read-email user-read-recently-played user-top-read playlist-read-private';
const RANGOS_DE_TIEMPO = ['short_term', 'medium_term', 'long_term'];

// ------------------------------------------------------------------
// HELPERS DE SUPABASE
// Pegan directo a la REST API de Supabase con la SERVICE_ROLE_KEY (acceso admin, salta RLS)
// ------------------------------------------------------------------

// Inserta o actualiza una fila. onConflict indica la columna única para decidir si crea o actualiza.
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

// Lee filas filtrando por columna=valor. Ej: leerSupabase('user_profiles', { user_id: 5 })
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

// Borra filas que cumplen los filtros. Devuelve true si la URL era válida.
async function borrarSupabase(table, filtros) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return false;

    const query = new URLSearchParams();
    for (const [columna, valor] of Object.entries(filtros)) {
        query.append(columna, `eq.${valor}`);
    }

    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}?${query.toString()}`;
    await axios.delete(url, {
        headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
    });
    return true;
}

// Jerry-rigged: la tabla `favoritos` referencia a `user_profiles.id`.
// Este helper devuelve ese id (guardado en la sesión durante el login).
function obtenerUserProfileId(req) {
    return req.session.spotify_user_profile_id || null;
}

// ------------------------------------------------------------------
// AUTH SPOTIFY (Authorization Code Flow)
// ------------------------------------------------------------------

// Paso 1: redirigir al usuario a la pantalla de autorización de Spotify
app.get('/auth/spotify', (req, res) => {
    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: SCOPE_SPOTIFY
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// Paso 2: Spotify devuelve el `code`; lo cambiamos por tokens y guardamos al usuario
app.get('/auth/spotify/callback', async (req, res) => {
    const code = req.query.code;

    try {
        // 1) Cambia el code por access_token (ucase) + refresh_token
        const tokenResponse = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: SPOTIFY_REDIRECT_URI,
                client_id: SPOTIFY_CLIENT_ID,
                client_secret: SPOTIFY_CLIENT_SECRET
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = tokenResponse.data.access_token;
        const refreshToken = tokenResponse.data.refresh_token;
        req.session.spotify_access_token = accessToken;

        // 2) Pregunta a Spotify quién es el dueño del token
        const perfilResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const perfilSpotify = perfilResponse.data;

        // 3) Guarda/actualiza al usuario en la tabla `users` (identificado por spotify_id)
        const userRows = await upsertSupabaseTable('users', {
            spotify_id: perfilSpotify.id,
            display_name: perfilSpotify.display_name ?? null,
            email: perfilSpotify.email ?? null
        }, 'spotify_id');

        const user = userRows?.[0] ?? null;

        if (user) {
            // 4) Guarda/actualiza sus tokens en `user_profiles` (identificado por user_id)
            //    Devuelve la fila, de la cual tomamos el `id` de user_profiles
            const profileRows = await upsertSupabaseTable('user_profiles', {
                user_id: user.id,
                token_spotify: accessToken,
                refresh_token_spotify: refreshToken ?? null
            }, 'user_id');

            const profile = profileRows?.[0] ?? null;

            // Guardamos ambos ids en sesión:
            //   spotify_user.id           -> id de la tabla `users`
            //   spotify_user_profile_id   -> id de la tabla `user_profiles` (usado por `favoritos`)
            req.session.spotify_user = user;
            if (profile?.id) req.session.spotify_user_profile_id = profile.id;
        } else {
            console.warn('No se pudo guardar el usuario en Supabase. Revisá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
        }

        res.redirect(`/pages/dashboard.html?nombre=${encodeURIComponent(perfilSpotify.display_name ?? '')}`);

    } catch (error) {
        console.error('Error en el callback de Spotify:', error.response?.data || error.message);
        res.redirect('/pages/login.html?error=auth');
    }
});

// Cerrar sesión: destruye la sesión y vuelve al login
app.get('/auth/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/pages/login.html');
    });
});

// ------------------------------------------------------------------
// MIDDLEWARE DE PROTECCIÓN
// ------------------------------------------------------------------

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
    res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'dashboard.html'));
});

// ------------------------------------------------------------------
// HELPERS DE SPOTIFY
// ------------------------------------------------------------------

// Usa el refresh_token guardado en Supabase para pedirle a Spotify un access_token nuevo
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
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response.data;

    } catch (error) {
        if (error.response?.status === 401) {
            const userId = req.session.spotify_user?.id;
            const tokenNuevo = userId ? await renovarAccessTokenSpotify(userId) : null;

            if (tokenNuevo) {
                req.session.spotify_access_token = tokenNuevo;

                const reintento = await axios.get(url, {
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

// ------------------------------------------------------------------
// RUTAS DE LA API (todas protegidas por sesión en el frontend)
// ------------------------------------------------------------------

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
        const q = req.query.q;
        if (!q) return res.status(400).json({ error: 'Falta el término de búsqueda' });

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

// ------------------------------------------------------------------
// CANCIONES FAVORITAS (persistidas en Supabase, tabla `favoritos`)
// ------------------------------------------------------------------

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

// ------------------------------------------------------------------
// ARRANQUE
// ------------------------------------------------------------------
app.get('/', (req, res) => {
    res.send('¡Servidor funcionando!');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});