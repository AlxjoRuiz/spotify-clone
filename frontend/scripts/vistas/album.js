// ============================================================
// VISTA ÁLBUM — Canciones de un álbum dentro de la vista Explorar.
// Al pulsar "Volver a resultados" emite un evento global que
// la vista de búsqueda interpreta (evita dependencias circulares).
// ============================================================

import API from '../api.js';
import { escaparHTML, PORTADA_DEFECTO, formatearDuracionTotal } from '../utils.js';
import { crearListaTracks } from '../componentes.js';
import { mostrarVista } from '../navegacion.js';

export function cargarAlbum(albumId) {
    mostrarVista('Explorar');
    const vista = document.querySelector('#vista-explorar');

    vista.innerHTML = `
        <div class="loading-container">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Cargando álbum...</p>
        </div>
    `;

    API.albumTracks(albumId)
        .then(data => {
            vista.innerHTML = '';

            // Encabezado del álbum
            const encabezado = document.createElement('div');
            encabezado.classList.add('album-encabezado');

            const img = document.createElement('img');
            img.src = data.album.portada || PORTADA_DEFECTO;
            img.classList.add('album-portada');
            img.alt = data.album.nombre;
            encabezado.appendChild(img);

            const info = document.createElement('div');
            info.classList.add('album-info');
            const duracionTotal = formatearDuracionTotal(
                (data.tracks || []).reduce((acc, t) => acc + (t.duration_ms || 0), 0)
            );
            info.innerHTML = `
                <p class="album-label">Álbum</p>
                <h2 class="album-nombre">${escaparHTML(data.album.nombre)}</h2>
                <p class="album-artista">${escaparHTML(data.album.artista)}</p>
                <p class="album-meta">${escaparHTML(data.album.total_canciones)} canciones · ${escaparHTML(data.album.fecha)} · ${duracionTotal}</p>
            `;
            encabezado.appendChild(info);
            vista.appendChild(encabezado);

            // Botón volver a los resultados de la búsqueda previa
            const btnVolver = document.createElement('button');
            btnVolver.classList.add('btn-volver-busqueda');
            btnVolver.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Volver a resultados';
            btnVolver.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('volver-a-resultados'));
            });
            vista.appendChild(btnVolver);

            // Lista de canciones
            vista.appendChild(crearListaTracks(data.tracks, data.album.portada));
        })
        .catch(error => {
            console.error('Error al cargar álbum:', error);
            vista.innerHTML = `
                <div class="loading-container">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <p>Error al cargar el álbum. Intentá de nuevo.</p>
                </div>
            `;
        });
}