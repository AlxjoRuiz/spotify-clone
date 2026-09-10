// ============================================================
// VISTA EXPLORAR — Contenido inicial de exploración: playlists
// destacadas y lanzamientos recientes. Se muestra solo si la
// vista aún no tiene resultados de búsqueda ni un detalle abierto,
// y usa eventos para navegar (evita dependencias circulares).
// ============================================================

import API from '../api.js';
import { crearTarjetaPlaylist, crearTarjetaAlbum, agregarSeccion } from '../componentes.js';
import { cargarAlbum } from './album.js';

let explorarCargado = false;

// Pide mostrar la vista Explorar sin importar navegación.js (evita ciclos)
function pedirVistaExplorar() {
    window.dispatchEvent(new CustomEvent('mostrar-vista', { detail: { texto: 'Explorar' } }));
}

export function cargarExplorar() {
    pedirVistaExplorar();
    const vista = document.querySelector('#vista-explorar');

    // Si ya hay resultados de búsqueda o un detalle (álbum/playlist), no los piso
    if (vista.querySelector('.tarjeta-cancion') || vista.querySelector('.album-encabezado')) return;
    if (explorarCargado) return;
    explorarCargado = true;

    vista.innerHTML = `
        <div class="loading-container">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Cargando sugerencias para vos...</p>
        </div>
    `;

    API.explorar()
        .then(data => {
            vista.innerHTML = '';

            const titulo = document.createElement('h2');
            titulo.classList.add('vista-titulo');
            titulo.textContent = 'Descubrí música nueva';
            vista.appendChild(titulo);

            const hayPlaylists = (data.playlists || []).length > 0;
            const hayNuevos = (data.nuevos || []).length > 0;

            if (hayPlaylists) {
                agregarSeccion(vista, 'Playlists destacadas', data.playlists, crearTarjetaPlaylist);
            }

            if (hayNuevos) {
                agregarSeccion(vista, 'Lanzamientos recientes', data.nuevos,
                    album => crearTarjetaAlbum(album, cargarAlbum));
            }

            if (!hayPlaylists && !hayNuevos) {
                const aviso = document.createElement('p');
                aviso.classList.add('sin-resultados');
                aviso.textContent = 'No hay contenido para mostrar por ahora. Buscá tu música en el buscador.';
                vista.appendChild(aviso);
            }
        })
        .catch(error => {
            console.error('Error al cargar Explorar:', error);
            explorarCargado = false; // Permitir reintentar
            vista.innerHTML = `
                <div class="loading-container">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <p>Error al cargar Explorar. Intentá de nuevo.</p>
                </div>
            `;
        });
}

// Al hacer click en "Explorar" cargamos el contenido inicial (si hace falta)
const linkExplorar = [...document.querySelectorAll('.sidebar a')]
    .find(link => link.textContent.trim() === 'Explorar');

if (linkExplorar) {
    linkExplorar.addEventListener('click', cargarExplorar);
}