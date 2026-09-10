// ============================================================
// VISTA ÁLBUM — Canciones de un álbum dentro de la vista Explorar.
// Al pulsar "Volver a resultados" emite un evento global que
// la vista de búsqueda interpreta (evita dependencias circulares).
// ============================================================

import API from '../api.js';
import { formatearTiempo, escaparHTML, PORTADA_DEFECTO } from '../utils.js';
import { reproducirPreview } from '../reproductor.js';
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
            info.innerHTML = `
                <p class="album-label">Álbum</p>
                <h2 class="album-nombre">${escaparHTML(data.album.nombre)}</h2>
                <p class="album-artista">${escaparHTML(data.album.artista)}</p>
                <p class="album-meta">${escaparHTML(data.album.total_canciones)} canciones · ${escaparHTML(data.album.fecha)}</p>
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
            const lista = document.createElement('div');
            lista.classList.add('album-lista');

            data.tracks.forEach((track, index) => {
                const cancion = document.createElement('div');
                cancion.classList.add('album-cancion');

                const posicion = document.createElement('span');
                posicion.classList.add('album-cancion-numero');
                posicion.textContent = index + 1;
                cancion.appendChild(posicion);

                const infoCancion = document.createElement('div');
                infoCancion.classList.add('album-cancion-info');

                const nombreCancion = document.createElement('p');
                nombreCancion.textContent = track.name;
                infoCancion.appendChild(nombreCancion);

                const artistaCancion = document.createElement('p');
                artistaCancion.textContent = track.artists?.map(a => a.name).join(', ') || 'Desconocido';
                infoCancion.appendChild(artistaCancion);

                cancion.appendChild(infoCancion);

                const duracion = document.createElement('span');
                duracion.classList.add('album-cancion-duracion');
                duracion.textContent = formatearTiempo((track.duration_ms || 0) / 1000);
                cancion.appendChild(duracion);

                if (track.preview_url) {
                    const btnPlayCancion = document.createElement('button');
                    btnPlayCancion.classList.add('album-cancion-play');
                    btnPlayCancion.innerHTML = '<i class="fa-solid fa-play"></i>';
                    btnPlayCancion.addEventListener('click', (e) => {
                        e.stopPropagation();
                        reproducirPreview(
                            track.preview_url,
                            track.name,
                            track.artists?.[0]?.name ?? 'Desconocido',
                            data.album.portada
                        );
                    });
                    cancion.appendChild(btnPlayCancion);
                }

                lista.appendChild(cancion);
            });

            vista.appendChild(lista);
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