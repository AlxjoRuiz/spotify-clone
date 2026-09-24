import { useMemo } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/index.css';
import logoUrl from '../assets/images/spotify-logo.png';
import videoUrl from '../assets/video/video.mp4';

// Login rediseñado 100% Tailwind: video de fondo con overlay, glows
// ambientales, card glass con entrada animada y botón verde principal.
// Mismo comportamiento: /auth/spotify y error cuando vuelve ?error=.
const FEATURES = [
    { icono: 'fa-solid fa-chart-line', texto: 'Tus tops de artistas y canciones' },
    { icono: 'fa-solid fa-heart', texto: 'Favoritos guardados en tu cuenta' },
    { icono: 'fa-solid fa-magnifying-glass', texto: 'Búsqueda en vivo + biblioteca' },
];

function LoginPage() {
    const tieneError = useMemo(
        () => new URLSearchParams(window.location.search).has('error'),
        []
    );

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 py-10 font-sans text-white">
            <video autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover opacity-40">
                <source src={videoUrl} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0.55)_0%,rgba(10,10,10,0.25)_45%,rgba(10,10,10,0.92)_100%)]"></div>
            <div className="absolute -left-24 top-1/4 h-72 w-72 animate-[float_8s_ease-in-out_infinite] rounded-full bg-[#1DB954]/25 blur-[110px]"></div>
            <div className="absolute -right-20 bottom-1/4 h-80 w-80 animate-[float_10s_ease-in-out_infinite] rounded-full bg-[#a020f0]/20 blur-[120px]"></div>

            <main className="relative z-10 w-[min(430px,94vw)] animate-[fade-up_.6s_ease-out] rounded-3xl border border-white/10 bg-white/[0.06] p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl sm:p-10">
                <img
                    src={logoUrl}
                    alt="Spotify"
                    className="mx-auto mb-4 w-[72px] animate-[glow_2.2s_ease-in-out_infinite]"
                />
                <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-[0.3em] text-[#1DB954]">
                    Spotify
                </p>
                <h1 className="font-['Poppins',sans-serif] text-[2rem] font-black leading-tight">
                    Música sin límites
                </h1>
                <p className="mx-auto mb-6 mt-2 max-w-[300px] font-['Poppins',sans-serif] text-[0.9rem] text-[#B3B3B3]">
                    Inicia sesión con tu cuenta de Spotify y mira tus tops, playlists y favoritos.
                </p>

                {tieneError && (
                    <p className="mx-auto mb-4 max-w-full rounded-lg border border-[rgba(235,87,87,0.5)] bg-[rgba(235,87,87,0.15)] px-4 py-2 text-center font-['Poppins',sans-serif] text-[0.85rem] text-[#f87171]">
                        Hubo un problema al iniciar sesión. Probá de nuevo.
                    </p>
                )}

                <a
                    href="/auth/spotify"
                    className="group flex w-full items-center justify-center gap-2.5 rounded-full bg-[#1DB954] px-6 py-4 font-['Poppins',sans-serif] text-[1rem] font-bold text-black no-underline shadow-[0_8px_30px_rgba(29,185,84,0.35)] transition-all duration-300 hover:scale-[1.02] hover:bg-[#1ed760]"
                >
                    <i className="fa-brands fa-spotify text-[1.25rem]"></i>
                    Iniciar sesión con Spotify
                    <i className="fa-solid fa-arrow-right text-[0.9rem] transition-transform duration-300 group-hover:translate-x-1"></i>
                </a>

                <div className="mx-auto mb-2 mt-7 flex max-w-[320px] flex-col gap-2.5 text-left">
                    {FEATURES.map((f) => (
                        <div key={f.texto} className="flex items-center gap-3 text-[0.82rem] text-[#B3B3B3]">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1DB954]/15 text-[#1DB954]">
                                <i className={f.icono}></i>
                            </span>
                            {f.texto}
                        </div>
                    ))}
                </div>

                <p className="mt-6 text-[0.7rem] text-[#727272]">
                    Reproduce previews de 30 segundos con tu cuenta.
                </p>
            </main>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <LoginPage />
    </React.StrictMode>
);
