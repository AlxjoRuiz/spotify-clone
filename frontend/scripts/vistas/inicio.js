// ============================================================
// VISTA INICIO — Playlists populares del home
// ============================================================

import API from '../api.js';
import { crearTarjetaPlaylist } from '../componentes.js';

const contenedorPlaylists = document.querySelector('#playlists');

// Accesos rápidos de la Home (patrón "Buenos días" de Spotify): ->
// tiles con color de fondo que navegan a las otras vistas
const HERO_TILES = [
    { icono: 'fa-solid fa-bolt', texto: 'Lanzamientos', color: '#a020f0', vista: 'Explorar' },
    { icono: 'fa-solid fa-list-ul', texto: 'Tus playlists', color: '#0ea5e9', vista: 'Biblioteca' },
    { icono: 'fa-solid fa-heart', texto: 'Canciones favoritas', color: '#e0245e', vista: 'Biblioteca' },
    { icono: 'fa-solid fa-user', texto: 'Tu perfil', color: '#1db954', vista: 'Perfil' },
    { icono: 'fa-solid fa-magnifying-glass', texto: 'Buscar', color: '#f59e0b', vista: 'Explorar' },
    { icono: 'fa-solid fa-compact-disc', texto: 'Descubrir', color: '#2563eb', vista: 'Explorar' }
];

// Dibuja la grilla de accesos rápidos en el hero del home
function dibujarHero() {
    const contenedor = document.querySelector('#hero-home');
    if (!contenedor) return;

    contenedor.innerHTML = '';

    HERO_TILES.forEach(tile => {
        const boton = document.createElement('button');
        boton.classList.add('hero-tile');
        boton.style.background = tile.color;
        boton.innerHTML = `
            <span class="hero-tile-icono"><i class="${tile.icono}"></i></span>
            <span class="hero-tile-texto">${tile.texto}</span>
        `;
        boton.addEventListener('click', () => {
            window.dispatchEvent(new CustomEvent('mostrar-vista', { detail: { texto: tile.vista } }));
        });
        contenedor.appendChild(boton);
    });
}

export function cargarPlaylists() {
    dibujarHero();

    contenedorPlaylists.innerHTML = `
        <div class="perfil-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Cargando playlists...</p>
        </div>
    `;

    API.playlistsPopulares()
        .then(data => {
            contenedorPlaylists.innerHTML = '';

            if (!data.playlists || data.playlists.length === 0) {
                contenedorPlaylists.innerHTML = '<p class="sin-resultados">No se encontraron playlists.</p>';
                return;
            }

            data.playlists.forEach(playlist => {
                if (!playlist.images || playlist.images.length === 0) return;

                const tarjeta = crearTarjetaPlaylist(playlist);
                if (tarjeta) contenedorPlaylists.appendChild(tarjeta);
            });
        })
        .catch(error => {
            console.error('Error al cargar playlists:', error);
            contenedorPlaylists.innerHTML = '<p class="sin-resultados">Error al cargar las playlists.</p>';
        });
}