// ============================================================
// COMPONENTES — Creadores de tarjetas DOM reutilizables
// (canción, artista, álbum, playlist, top track) y utilitarios
// de maquetado como agregarSeccion().
// ============================================================

import { formatearTiempo, PORTADA_DEFECTO } from './utils.js';
import { reproducirPreview } from './reproductor.js';
import { guardarFavorito } from './favoritos.js';
import { esFavorito } from './estado.js';

// Título de sección (Canciones, Artistas, Álbumes, ...)
export function crearTituloSeccion(texto) {
    const titulo = document.createElement('h3');
    titulo.classList.add('seccion-titulo');
    titulo.textContent = texto;
    return titulo;
}

// Botón corazón de favoritos (reusable para cualquier tarjeta de canción)
export function crearBotonFavorito(track) {
    const boton = document.createElement('button');
    boton.classList.add('btn-favorito');
    boton.dataset.trackId = track.id;
    boton.classList.toggle('activo', esFavorito(track.id));
    boton.innerHTML = esFavorito(track.id)
        ? '<i class="fa-solid fa-heart"></i>'
        : '<i class="fa-regular fa-heart"></i>';

    boton.addEventListener('click', (e) => {
        e.stopPropagation();
        guardarFavorito(track, boton);
    });

    return boton;
}

// Tarjeta de canción reutilizable (portada + play + corazón + nombre/artista)
export function crearTarjetaCancion(track) {
    const portadaUrl = track.album?.images?.[0]?.url || PORTADA_DEFECTO;

    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-cancion');
    tarjeta.style.setProperty('--portada-url', `url(${portadaUrl})`);

    // Portada
    const portada = document.createElement('img');
    portada.src = portadaUrl;
    portada.alt = track.name;
    tarjeta.appendChild(portada);

    // Botón play
    const btnReproducir = document.createElement('button');
    btnReproducir.classList.add('btn-play');
    btnReproducir.innerHTML = '<i class="fa-solid fa-play"></i>';
    btnReproducir.addEventListener('click', (e) => {
        e.stopPropagation();
        reproducirPreview(
            track.preview_url,
            track.name,
            track.artists?.[0]?.name ?? 'Desconocido',
            portadaUrl,
            track.id
        );
    });
    tarjeta.appendChild(btnReproducir);

    // Botón corazón
    tarjeta.appendChild(crearBotonFavorito(track));

    // Nombre y artista
    const nombre = document.createElement('p');
    nombre.textContent = track.name;
    tarjeta.appendChild(nombre);

    const artista = document.createElement('p');
    artista.textContent = track.artists?.map(a => a.name).join(', ') || 'Desconocido';
    tarjeta.appendChild(artista);

    return tarjeta;
}

// Tarjeta de artista (imagen circular, abre Spotify al click)
export function crearTarjetaArtista(artista) {
    const portadaUrl = artista.images?.[0]?.url || PORTADA_DEFECTO;

    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-cancion', 'tarjeta-artista');
    tarjeta.style.setProperty('--portada-url', `url(${portadaUrl})`);

    const portada = document.createElement('img');
    portada.src = portadaUrl;
    tarjeta.appendChild(portada);

    const nombre = document.createElement('p');
    nombre.textContent = artista.name;
    tarjeta.appendChild(nombre);

    const tipo = document.createElement('p');
    tipo.textContent = 'Artista';
    tarjeta.appendChild(tipo);

    if (artista.external_urls?.spotify) {
        tarjeta.addEventListener('click', () => {
            window.open(artista.external_urls.spotify, '_blank');
        });
    }

    return tarjeta;
}

// Tarjeta de álbum (al hacer click muestra sus canciones en la vista Explorar)
// El callback alAbrirAlbum(id) lo inyecta la vista de búsqueda para
// evitar dependencias circulares entre módulos.
export function crearTarjetaAlbum(album, alAbrirAlbum) {
    const portadaUrl = album.images?.[0]?.url || PORTADA_DEFECTO;

    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-cancion');
    tarjeta.style.setProperty('--portada-url', `url(${portadaUrl})`);

    const portada = document.createElement('img');
    portada.src = portadaUrl;
    tarjeta.appendChild(portada);

    const nombre = document.createElement('p');
    nombre.textContent = album.name;
    tarjeta.appendChild(nombre);

    const artista = document.createElement('p');
    artista.textContent = album.artists?.[0]?.name ?? 'Desconocido';
    tarjeta.appendChild(artista);

    if (typeof alAbrirAlbum === 'function') {
        tarjeta.addEventListener('click', () => {
            alAbrirAlbum(album.id);
        });
    }

    return tarjeta;
}

// Tarjeta de playlist. Si se pasa alAbrirPlaylist(id), abre el detalle
// en la app; si no, abre Spotify en otra pestaña (playlists del home).
export function crearTarjetaPlaylist(playlist, alAbrirPlaylist) {
    const portadaUrl = playlist.images?.[0]?.url || PORTADA_DEFECTO;

    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-cancion');
    tarjeta.style.setProperty('--portada-url', `url(${portadaUrl})`);

    const portada = document.createElement('img');
    portada.src = portadaUrl;
    tarjeta.appendChild(portada);

    const nombre = document.createElement('p');
    nombre.textContent = playlist.name;
    tarjeta.appendChild(nombre);

    const dueno = document.createElement('p');
    dueno.textContent = playlist.owner?.display_name ?? 'Desconocido';
    tarjeta.appendChild(dueno);

    if (typeof alAbrirPlaylist === 'function') {
        tarjeta.addEventListener('click', () => {
            alAbrirPlaylist(playlist.id);
        });
    } else if (playlist.external_urls?.spotify) {
        tarjeta.addEventListener('click', () => {
            window.open(playlist.external_urls.spotify, '_blank');
        });
    }

    return tarjeta;
}

// Tarjeta de top track: reusa crearTarjetaCancion y agrega número + duración
export function crearTarjetaTopTrack(track, index) {
    const tarjeta = crearTarjetaCancion(track);
    if (!tarjeta) return null;

    const posicion = document.createElement('span');
    posicion.classList.add('top-track-numero');
    posicion.textContent = `#${index + 1}`;
    tarjeta.insertBefore(posicion, tarjeta.firstChild);

    const duracion = document.createElement('p');
    duracion.classList.add('top-track-duracion');
    duracion.textContent = formatearTiempo((track.duration_ms || 0) / 1000);
    tarjeta.appendChild(duracion);

    return tarjeta;
}

// Agrega a una vista una sección con título y sus tarjetas.
// Si no hay tarjetas válidas, no agrega ni el título.
export function agregarSeccion(contenedor, tituloTexto, items, funcionTarjeta) {
    const tarjetas = (items || [])
        .filter(item => item)
        .map(item => funcionTarjeta(item))
        .filter(tarjeta => tarjeta !== null);

    if (tarjetas.length === 0) return;

    contenedor.appendChild(crearTituloSeccion(tituloTexto));
    tarjetas.forEach(tarjeta => contenedor.appendChild(tarjeta));
}

// Lista de canciones de un detalle (álbum o playlist): número, nombre,
// artista, duración y botón play. Compartida para no duplicar maquetado.
export function crearListaTracks(tracks, portada) {
    const lista = document.createElement('div');
    lista.classList.add('album-lista');

    (tracks || []).forEach((track, index) => {
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
                    portada,
                    track.id
                );
            });
            cancion.appendChild(btnPlayCancion);
        }

        lista.appendChild(cancion);
    });

    return lista;
}