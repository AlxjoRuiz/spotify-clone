// Carga las variables de entorno desde el archivo .env (Client ID, Client Secret, PORT).
// Debe ir siempre primero, antes de usar cualquier variable con process.env
require('dotenv').config();
const path = require('path');
const express = require('express');                             
const passport = require('passport');                          
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');                     

const app = express();

function verificarLogin(req, res, next) {
    if (req.isAuthenticated()) {
        next();     
    } else {
        res.redirect('/pages/index.html')
    }
};

app.get('/pages/dashboard.html', verificarLogin, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'pages', 'dashboard.html'));
});

app.use(express.static(path.join(__dirname, '..', 'frontend')));

app.use(session({
    secret: 'un_secreto_cualquiera', 
    resave: false,                  
    saveUninitialized: true         
}));

app.use(passport.initialize());
app.use(passport.session());

const PORT = process.env.PORT;

app.get('/', (req, res) => {
    res.send('¡Servidor funcionando!'); 
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,        
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, 
    callbackURL: "http://localhost:3000/auth/google/callback" 
},
function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
}
));

passport.serializeUser((user, done) => {
    done(null, user); 
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/pages/dashboard.html');
    }
);

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});