// Carga las variables del archivo .env (credenciales, puerto, etc.)
// Siempre va primero, antes de usar process.env
require('dotenv').config();

const path = require('path');       // Ayuda a armar rutas de archivos/carpetas
const express = require('express'); // Framework del servidor
const session = require('express-session'); // Mantiene la sesión del usuario
const axios = require('axios');     // Hace peticiones HTTP (lo usamos para hablar con Spotify)

const app = express(); // Crea la app del servidor

// Middleware: revisa si el usuario tiene sesión activa antes de dejarlo pasar
// Antes usaba req.isAuthenticated() (de Passport/Google). Ahora, sin Google,
// la prueba de que el usuario está logueado es que tenga guardado el token de Spotify.
function verificarLogin(req, res, next) {
    if (req.session.spotify_access_token) {
        next(); // Sí está logueado, sigue a la ruta pedida
    } else {
        res.redirect('/pages/index.html'); // No está logueado, lo manda al login
    }
};

// Activa las sesiones (cookie que "recuerda" al usuario entre peticiones)
app.use(session({
    secret: 'un_secreto_cualquiera', // Firma la cookie (en producción va en .env)
    resave: false,
    saveUninitialized: true
}));

// Ruta protegida: solo entrega dashboard.html si hay sesión activa
app.get('/pages/dashboard.html', verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'dashboard.html'));
});

// Sirve todos los archivos del frontend (HTML, CSS, JS, imágenes) automáticamente
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const PORT = process.env.PORT; // Puerto del servidor, definido en .env

// Ruta de prueba: confirma que el servidor está vivo
app.get('/', (req, res) => {
    res.send('¡Servidor funcionando!');
});

// Credenciales y datos de la app de Spotify (desde .env)
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function upsertSupabaseTable(table, payload, onConflict) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        return null;
    }

    const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}`;
    const response = await axios.post(url, payload, {
        headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: `resolution=merge-duplicates,return=representation${onConflict ? `,on_conflict=${onConflict}` : ''}`
        }
    });

    return response.data;
}

// Ruta que arranca el login/autorización con Spotify
app.get('/auth/spotify', (req, res) => {
    // Arma los parámetros que Spotify necesita en la URL de autorización
    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code', // Pedimos un "code" (Authorization Code Flow)
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: 'user-read-private user-read-email user-read-recently-played' // Qué datos pedimos
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// Ruta de callback: Spotify vuelve acá después de que el usuario autoriza
app.get('/auth/spotify/callback', async (req, res) => {
    const code = req.query.code; // El código temporal que mandó Spotify

    try {
        // 1) Intercambia el "code" por un access_token real (petición al servidor de Spotify)
        const response = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: SPOTIFY_REDIRECT_URI,
                client_id: SPOTIFY_CLIENT_ID,
                client_secret: SPOTIFY_CLIENT_SECRET
            }),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );

        // Guarda el token en la sesión, para usarlo después en pedidos a la API de Spotify
        const accessToken = response.data.access_token;
        req.session.spotify_access_token = accessToken;

        // 2) Con ese token, le preguntamos a Spotify "¿quién sos?"
        //    Mismo patrón que /api/canciones, pero apuntando al endpoint de perfil
        const perfilResponse = await axios.get('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${accessToken}` // el token identifica al usuario ante Spotify
            }
        });

        // 3) perfilResponse.data trae el perfil: { id, display_name, email, ... }
        const perfilSpotify = perfilResponse.data;

        const userPayload = {
            spotify_id: perfilSpotify.id,
            display_name: perfilSpotify.display_name ?? null,
            email: perfilSpotify.email ?? null
        };

        const userRows = await upsertSupabaseTable('User', userPayload, 'spotify_id');
        const user = userRows?.[0] ?? userPayload;

        await upsertSupabaseTable('UserProfile', {
            user_id: user.id ?? user.spotify_id,
            spotify_access_token: accessToken
        }, 'user_id');

        req.session.spotify_user = user;
        console.log('Usuario logueado:', perfilSpotify.id, perfilSpotify.display_name);

        res.redirect('/pages/dashboard.html');

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.send('Error al conectar con Spotify');
    }
});

// Ruta que devuelve las canciones escuchadas recientemente por el usuario
app.get('/api/canciones', async (req, res) => {
    // Recupera el token guardado cuando el usuario autorizó Spotify
    const token = req.session.spotify_access_token;

    try {
        // Pide a Spotify las canciones recientes, usando el token como credencial
        const response = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
            headers: {
                'Authorization': `Bearer ${token}` // Formato estándar para mandar el token
            }
        });

        // Si todo sale bien, le devuelve esos datos al navegador
        res.json(response.data);

    } catch (error) {
        // Si algo falla (token vencido, sin permiso, etc.), avisa sin romper el servidor
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudieron obtener las canciones' });
    }
});

// Arranca el servidor en el puerto definido
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
