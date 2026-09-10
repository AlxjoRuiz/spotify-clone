// ============================================================
// VISTA INICIO — Playlists populares del home
// ============================================================

import API from '../api.js';
import { crearTarjetaPlaylist } from '../componentes.js';

const contenedorPlaylists = document.querySelector('#playlists');

export function cargarPlaylists() {
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