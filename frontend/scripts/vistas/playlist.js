// ============================================================
// VISTA PLAYLIST — Canciones de una playlist del usuario.
// Se muestra dentro de la vista Explorar y pide navegación por
// evento ('mostrar-vista') para no crear ciclos con biblioteca.js.
// ============================================================

import API from '../api.js';
import { escaparHTML, PORTADA_DEFECTO } from '../utils.js';
import { crearListaTracks } from '../componentes.js';

// Pide mostrar una vista sin importar navegación.js (evita ciclos)
function pedirVista(texto) {
    window.dispatchEvent(new CustomEvent('mostrar-vista', { detail: { texto } }));
}

export function cargarPlaylistDetalle(playlistId) {
    pedirVista('Explorar');
    const vista = document.querySelector('#vista-explorar');

    vista.innerHTML = `
        <div class="loading-container">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Cargando playlist...</p>
        </div>
    `;

    API.playlistTracks(playlistId)
        .then(data => {
            vista.innerHTML = '';

            // Encabezado de la playlist (mismo estilo que el álbum)
            const encabezado = document.createElement('div');
            encabezado.classList.add('album-encabezado');

            const img = document.createElement('img');
            img.src = data.playlist.portada || PORTADA_DEFECTO;
            img.classList.add('album-portada');
            img.alt = data.playlist.nombre;
            encabezado.appendChild(img);

            const info = document.createElement('div');
            info.classList.add('album-info');
            info.innerHTML = `
                <p class="album-label">Playlist</p>
                <h2 class="album-nombre">${escaparHTML(data.playlist.nombre)}</h2>
                <p class="album-artista">${escaparHTML(data.playlist.dueno)}</p>
                <p class="album-meta">${escaparHTML(data.playlist.total_canciones)} canciones</p>
            `;
            encabezado.appendChild(info);
            vista.appendChild(encabezado);

            // Botón volver a la Biblioteca
            const btnVolver = document.createElement('button');
            btnVolver.classList.add('btn-volver-busqueda');
            btnVolver.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Volver a Biblioteca';
            btnVolver.addEventListener('click', () => {
                pedirVista('Biblioteca');
            });
            vista.appendChild(btnVolver);

            // Lista de canciones
            vista.appendChild(crearListaTracks(data.tracks, data.playlist.portada));
        })
        .catch(error => {
            console.error('Error al cargar playlist:', error);
            vista.innerHTML = `
                <div class="loading-container">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <p>Error al cargar la playlist. Intentá de nuevo.</p>
                </div>
            `;
        });
}