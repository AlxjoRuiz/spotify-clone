import { useEffect, useState } from 'react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/index.css';
import './sesion';
import { API } from './api';
import { saludoSegunHora } from './utils';
import { nombreUsuario } from './sesion';
import { ToastProvider } from './notificacion';
import { FavoritosProvider } from './estado';
import { PlayerProvider, Reproductor, ColaDrawer } from './reproductor';
import { NavProvider, useNav, type Vista } from './navegacion';
import { useBuscador } from './vistas/busqueda';
import { Inicio } from './vistas/inicio';
import { Explorar } from './vistas/explorar';
import { Biblioteca } from './vistas/biblioteca';
import { Perfil } from './vistas/perfil';

// Punto de entrada — mismo archivo que main.js: saludo, carga inicial,
// avatar del header y vista Inicio. El maquetado viene de dashboard.html
// (sidebar/header/player) portado a estos componentes.

// Sidebar: logo + buscador + sugerencias + navegación (dashboard.html)
function Sidebar() {
    const { vista, navegar } = useNav();
    const { texto, sugerencias, onInput, ejecutar, elegirSugerencia, recargarSugerencias } = useBuscador();

    const links: { vista: Vista; icono: string; texto: string }[] = [
        { vista: 'Inicio', icono: 'fa-solid fa-house', texto: 'Inicio' },
        { vista: 'Explorar', icono: 'fa-solid fa-compass', texto: 'Explorar' },
        { vista: 'Biblioteca', icono: 'fa-solid fa-book-open', texto: 'Biblioteca' },
        { vista: 'Perfil', icono: 'fa-solid fa-user', texto: 'Perfil' },
    ];

    return (
        <aside className="flex flex-col gap-2 overflow-y-auto bg-black p-4 px-3 text-white md:col-start-1 md:row-[1/4] max-md:order-2 max-md:px-4 max-md:py-3">
            <h2 className="mx-3 mb-4 mt-2 flex items-center gap-2 font-['Poppins',sans-serif] text-[1.5rem] font-extrabold tracking-tight max-md:hidden">
                <i className="fa-brands fa-spotify text-[1.9rem] text-[#1DB954]"></i> Spotify
            </h2>

            <div className="my-1 flex items-center gap-1.5 rounded-[22px] bg-[#1f1f1f] py-1 pl-[18px] pr-1.5 max-md:mb-2">
                <input
                    type="text"
                    id="input-buscar"
                    value={texto}
                    onChange={(e) => onInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') ejecutar(texto);
                    }}
                    onFocus={recargarSugerencias}
                    placeholder="Buscar canciones..."
                    className="min-w-0 flex-1 border-none bg-transparent py-1.5 font-['Poppins',sans-serif] text-[0.9rem] text-white outline-none placeholder:text-[#B3B3B3]"
                />
                <button
                    id="btn-buscar"
                    onClick={() => ejecutar(texto)}
                    title="Buscar"
                    className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-none bg-[#1DB954] font-['Poppins',sans-serif] text-[0.85rem] text-black transition-all hover:scale-110 hover:bg-[#1ed760]"
                >
                    <i className="fa-solid fa-magnifying-glass"></i>
                </button>
            </div>

            <div className="mb-2 flex flex-wrap gap-1.5">
                {sugerencias.map((s) => (
                    <button
                        key={s}
                        onClick={() => elegirSugerencia(s)}
                        className="cursor-pointer rounded-[20px] border-none bg-[#282828] px-2.5 py-1 font-['Poppins',sans-serif] text-[0.7rem] text-[#B3B3B3] transition-colors hover:bg-[#1DB954] hover:text-black"
                    >
                        {s}
                    </button>
                ))}
            </div>

            <nav>
                <ul className="m-0 list-none p-0 max-md:flex max-md:justify-center max-md:gap-1">
                    {links.map((l) => (
                        <li key={l.vista}>
                            <a
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    navegar(l.vista);
                                }}
                                className={`flex items-center gap-4 rounded-md px-3 py-2.5 font-semibold text-[#B3B3B3] no-underline transition-colors hover:text-white ${
                                    vista === l.vista ? 'bg-[#1f1f1f] text-white' : ''
                                } max-md:gap-1.5 max-md:rounded-[20px] max-md:bg-[#282828] max-md:px-2.5 max-md:py-1.5 max-md:text-[0.8rem] ${
                                    vista === l.vista ? 'max-md:bg-[#1DB954] max-md:text-black' : ''
                                }`}
                            >
                                <i className={`${l.icono} w-6 text-center text-[1.25rem] max-md:w-auto max-md:text-[0.9rem]`}></i>
                                <span>{l.texto}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}

// Header: flechas + saludo + perfil + logout (dashboard.html + main.js avatar)
function Header() {
    const { atras, adelante, puedeAtras, puedeAdelante } = useNav();
    const [avatar, setAvatar] = useState<string | null>(null);

    useEffect(() => {
        API.perfil()
            .then((perfil) => {
                if (perfil.imagen) setAvatar(perfil.imagen);
            })
            .catch(() => {});
    }, []);

    return (
        <header className="flex items-center justify-between gap-4 px-8 py-4 max-md:order-1 max-md:px-4 max-md:py-3">
            <div className="flex gap-4">
                <button
                    onClick={atras}
                    disabled={!puedeAtras}
                    title="Volver"
                    aria-label="Volver"
                    className="flex h-8 w-8 items-center justify-center rounded-full border-none bg-black/60 text-[0.9rem] text-white transition-all hover:scale-105 hover:bg-black/85 disabled:text-[#B3B3B3] max-md:h-7 max-md:w-7 max-md:text-[0.8rem]"
                >
                    <i className="fa-solid fa-chevron-left"></i>
                </button>
                <button
                    onClick={adelante}
                    disabled={!puedeAdelante}
                    title="Adelante"
                    aria-label="Adelante"
                    className="flex h-8 w-8 items-center justify-center rounded-full border-none bg-black/60 text-[0.9rem] text-white transition-all hover:scale-105 hover:bg-black/85 disabled:text-[#B3B3B3] max-md:h-7 max-md:w-7 max-md:text-[0.8rem]"
                >
                    <i className="fa-solid fa-chevron-right"></i>
                </button>
            </div>

            <span className="flex-1 text-[1.5rem] font-bold max-md:text-[1.1rem]">
                {saludoSegunHora()}, {nombreUsuario}
            </span>

            <div className="flex cursor-pointer items-center gap-2 rounded-[20px] bg-white px-3.5 py-1.5 text-[0.85rem] font-semibold text-black transition-colors hover:bg-[#e5e5e5]">
                {avatar ? (
                    <img src={avatar} alt="Foto de perfil" className="h-7 w-7 rounded-full object-cover" />
                ) : (
                    <i className="fa-solid fa-user" id="perfil-icono-header"></i>
                )}
                <span id="nombre-perfil" className="max-[480px]:hidden">
                    {nombreUsuario}
                </span>
                <a
                    id="btn-logout"
                    href="/auth/logout"
                    title="Cerrar sesión"
                    aria-label="Cerrar sesión"
                    className="ml-1 border-none bg-transparent p-0.5 text-[0.85rem] text-[#616161] transition-colors hover:text-black"
                >
                    <i className="fa-solid fa-right-from-bracket"></i>
                </a>
            </div>
        </header>
    );
}

function Contenido() {
    const { vista } = useNav();

    return (
        <div className="flex min-h-screen flex-col bg-[#121212] font-['Poppins',sans-serif] text-white md:grid md:h-screen md:grid-cols-[200px_1fr] md:grid-rows-[auto_1fr_auto] lg:grid-cols-[240px_1fr]">
            <Sidebar />
            <Header />
            <main className="scroll-spotify grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] content-start gap-5 overflow-y-auto bg-[linear-gradient(180deg,#1e2a24_0%,#121212_320px)] px-8 py-6 md:col-start-2 md:min-h-0 max-md:order-3 max-md:p-4">
                {vista === 'Inicio' && <Inicio />}
                {vista === 'Explorar' && <Explorar />}
                {vista === 'Biblioteca' && <Biblioteca />}
                {vista === 'Perfil' && <Perfil />}
            </main>
            <div className="md:col-start-2 max-md:order-4">
                <Reproductor />
            </div>
            <ColaDrawer />
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ToastProvider>
            <FavoritosProvider>
                <PlayerProvider>
                    <NavProvider>
                        <Contenido />
                    </NavProvider>
                </PlayerProvider>
            </FavoritosProvider>
        </ToastProvider>
    </React.StrictMode>
);
