// Carga las variables del archivo .env (credenciales, puerto, etc.)
// Siempre va primero, antes de usar process.env
require('dotenv').config();

const path = require('path');       // Ayuda a armar rutas de archivos/carpetas
const express = require('express'); // Framework del servidor
const session = require('express-session'); // Mantiene la sesión del usuario
const axios = require('axios');     // Hace peticiones HTTP (lo usamos para hablar con Spotify)

const app = express(); // Crea la app del servidor

// Middleware: revisa si el usuario tiene sesión activa antes de dejarlo pasar
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

// Ruta que arranca el login/autorización con Spotify
app.get('/auth/spotify', (req, res) => {
    const params = new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        response_type: 'code',
        redirect_uri: SPOTIFY_REDIRECT_URI,
        scope: 'user-read-private user-read-email user-read-recently-played'
    });
    res.redirect(`https://accounts.spotify.com/authorize?${params.toString()}`);
});

// Ruta de callback: Spotify vuelve acá después de que el usuario autoriza
app.get('/auth/spotify/callback', async (req, res) => {
    const code = req.query.code;

    try {
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

        req.session.spotify_access_token = response.data.access_token;
        res.redirect('/pages/dashboard.html'); // Todavía sin ?nombre=, lo agregamos cuando conectemos el perfil de Spotify

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.send('Error al conectar con Spotify');
    }
});

// Ruta que devuelve las canciones escuchadas recientemente por el usuario
app.get('/api/canciones', async (req, res) => {
    const token = req.session.spotify_access_token;

    try {
        const response = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        res.json(response.data);

    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudieron obtener las canciones' });
    }
});

// Arranca el servidor en el puerto definido
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});