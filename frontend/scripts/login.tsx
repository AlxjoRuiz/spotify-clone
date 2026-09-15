import { useMemo } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/index.css';
import logoUrl from '../assets/images/spotify-logo.png';
import videoUrl from '../assets/video/video.mp4';

// Login — reemplaza el <script> inline de pages/login.html (mismo archivo
// HTML, misma UI y comportamiento: video, logo con glow, botón /auth/spotify
// y error cuando el callback vuelve con ?error=).
function LoginPage() {
    const tieneError = useMemo(
        () => new URLSearchParams(window.location.search).has('error'),
        []
    );

    return (
        <div className="flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#121212] font-sans text-white">
            <video autoPlay muted loop id="video-fondo" className="fixed left-0 top-0 h-full w-full object-cover">
                <source src={videoUrl} type="video/mp4" />
            </video>

            <div className="login relative z-10 flex min-w-[340px] flex-col items-center rounded-[26px] border border-white/[.18] p-2.5 backdrop-blur-xl saturate-[1.35]">
                <img
                    id="logo"
                    src={logoUrl}
                    alt="logo"
                    className="mb-5 w-20 animate-[glow_1.5s_ease-in-out_infinite]"
                />
                <h1 className="font-['Poppins',sans-serif] text-2xl font-black">¡BIENVENIDO A SPOTIFY!</h1>
                <p className="font-['Poppins',sans-serif]">Millones de canciones gratis en Spotify.</p>

                {tieneError && (
                    <p className="error-msg max-w-[300px] rounded-lg border border-[rgba(235,87,87,0.5)] bg-[rgba(235,87,87,0.15)] px-4 py-2 text-center font-['Poppins',sans-serif] text-[0.85rem] text-[#f87171]">
                        Hubo un problema al iniciar sesión. Probá de nuevo.
                    </p>
                )}

                <a
                    href="/auth/spotify"
                    className="btn-spotify relative my-2.5 block w-[300px] overflow-hidden rounded-full border-[3px] border-transparent bg-[linear-gradient(rgba(255,255,255,0.08),rgba(255,255,255,0.08))] bg-clip-padding p-[15px] text-center font-['Poppins',sans-serif] font-bold text-white no-underline shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-transform duration-500 hover:scale-105 hover:bg-[linear-gradient(rgba(255,255,255,0.15),rgba(255,255,255,0.15)),linear-gradient(to_right,#1DB954,#1DB954,#1DB954,#1DB954)] hover:[background-clip:padding-box,border-box]"
                    id="btn-spotify"
                >
                    <i className="fa-brands fa-spotify"></i> Iniciar sesión con Spotify
                </a>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <LoginPage />
    </React.StrictMode>
);
