require('dotenv').config(); // Carga las variables del .env (credenciales, puerto)

const path = require('path');
const express = require('express');
const session = require('express-session'); // Guarda el token de Spotify en la sesión del usuario
const axios = require('axios'); // Hace las peticiones HTTP a Spotify y Supabase

const app = express();

// --- Login/sesión ---

// Protege rutas: solo pasa si hay un access_token de Spotify guardado en sesión
function verificarLogin(req, res, next) {
    if (req.session.spotify_access_token) {
        next();
    } else {
        res.redirect('/pages/index.html');
    }
};

app.use(session({
    secret: 'un_secreto_cualquiera', // En producción, mover al .env
    resave: false,
    saveUninitialized: true
}));

app.get('/pages/dashboard.html', verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'dashboard.html'));
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));

const PORT = process.env.PORT;

app.get('/', (req, res) => {
    res.send('¡Servidor funcionando!');
});

// --- Credenciales (Spotify + Supabase) ---

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// --- Helpers de Supabase ---
// Los tres pegan directo a la REST API de Supabase con la SERVICE_ROLE_KEY (acceso admin, salta RLS)

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

// --- Login con Spotify (Authorization Code Flow) ---

app.get('/auth/spotify', (req, res) => {
    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: 'user-read-private user-read-email user-read-recently-played'
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

app.get('/auth/spotify/callback', async (req, res) => {
    const code = req.query.code;

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

        // 2) Pregunta a Spotify quién es el usuario dueño de ese token
        const perfilResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const perfilSpotify = perfilResponse.data;

        // 3) Guarda/actualiza al usuario en la tabla `users`, identificado por spotify_id
        const userRows = await upsertSupabaseTable('users', {
            spotify_id: perfilSpotify.id,
            display_name: perfilSpotify.display_name ?? null,
            email: perfilSpotify.email ?? null
        }, 'spotify_id');

        const user = userRows?.[0] ?? null;

        if (user) {
            // 4) Guarda/actualiza sus tokens en `user_profiles`, vinculados por user_id
            await upsertSupabaseTable('user_profiles', {
                user_id: user.id,
                token_spotify: accessToken,
                refresh_token_spotify: refreshToken ?? null
            }, 'user_id');

            req.session.spotify_user = user; // Se usa después para renovar el token si vence
        } else {
            console.warn('No se pudo guardar el usuario en Supabase. Revisá SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
        }

        res.redirect(`/pages/dashboard.html?nombre=${encodeURIComponent(perfilSpotify.display_name ?? '')}`);

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.send('Error al conectar con Spotify');
    }
});

// --- API propia ---

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

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
