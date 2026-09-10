// ============================================================
// VISTA BIBLIOTECA — Canciones escuchadas recientemente y
// canciones guardadas como favoritas.
// ============================================================

import API from '../api.js';
import { crearTarjetaCancion } from '../componentes.js';
import { obtenerFavoritos } from '../favoritos.js';

// Canciones escuchadas recientemente en Spotify
export function cargarCancionesRecientes() {
    const contenedor = document.querySelector('#canciones-recientes');

    contenedor.innerHTML = `
        <div class="perfil-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Cargando tus canciones recientes...</p>
        </div>
    `;

    API.cancionesRecientes()
        .then(data => {
            contenedor.innerHTML = '';

            if (!data.items || data.items.length === 0) {
                contenedor.innerHTML = '<p class="sin-resultados">No tenés canciones recientes. Escuchá algo en Spotify primero.</p>';
                return;
            }

            data.items.forEach(item => {
                const tarjeta = crearTarjetaCancion(item.track);
                if (tarjeta) contenedor.appendChild(tarjeta);
            });
        })
        .catch(error => {
            console.error('Error al cargar canciones recientes:', error);
            contenedor.innerHTML = '<p class="sin-resultados">Error al cargar tu biblioteca. Probá de nuevo.</p>';
        });
}

// Carga los favoritos y los dibuja en la sección #favoritos de la Biblioteca
export async function cargarFavoritos() {
    const contenedor = document.querySelector('#favoritos');
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="perfil-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
        </div>
    `;

    const favoritos = await obtenerFavoritos();
    contenedor.innerHTML = '';

    if (favoritos.length === 0) {
        contenedor.innerHTML = '<p class="sin-resultados">Aún no guardaste canciones favoritas.</p>';
        return;
    }

    favoritos.forEach(favorito => {
        const track = {
            id: favorito.track_id,
            name: favorito.track_nombre,
            artists: [{ name: favorito.track_artista }],
            album: { images: [{ url: favorito.track_imagen }] },
            preview_url: favorito.track_preview
        };
        const tarjeta = crearTarjetaCancion(track);
        if (tarjeta) contenedor.appendChild(tarjeta);
    });
}