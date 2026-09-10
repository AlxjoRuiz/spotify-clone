// ============================================================
// VISTA PERFIL — Datos del usuario de Spotify, top artistas y
// top canciones más escuchadas.
// ============================================================

import API from '../api.js';
import { escaparHTML } from '../utils.js';
import { crearTarjetaTopTrack } from '../componentes.js';
import { nombreUsuario } from '../sesion.js';

// Evita cargar varias veces si el usuario alterna de vista
let perfilCargado = false;
let topArtistasCargado = false;
let topTracksCargado = false;

function cargarPerfilSpotify() {
    if (perfilCargado) return;

    const contenedor = document.querySelector('#perfil-container');

    API.perfil()
        .then(perfil => {
            perfilCargado = true;

            contenedor.innerHTML = `
                <div class="perfil-avatar">
                    ${perfil.imagen
                        ? `<img src="${escaparHTML(perfil.imagen)}" alt="Foto de perfil">`
                        : '<i class="fa-solid fa-user"></i>'}
                </div>

                <div class="perfil-info">
                    <p class="perfil-label">Nombre de usuario</p>
                    <p class="perfil-nombre">${escaparHTML(perfil.nombre)}</p>
                </div>

                <div class="perfil-info">
                    <p class="perfil-label">Email</p>
                    <p class="perfil-dato">${escaparHTML(perfil.email)}</p>
                </div>

                <div class="perfil-info">
                    <p class="perfil-label">Tipo de cuenta</p>
                    <p class="perfil-dato ${perfil.tipo_cuenta === 'premium' ? 'premium' : ''}">
                        ${perfil.tipo_cuenta === 'premium' ? 'Premium' : 'Free'}
                    </p>
                </div>

                <div class="perfil-info">
                    <p class="perfil-label">País</p>
                    <p class="perfil-dato">${escaparHTML(perfil.pais)}</p>
                </div>

                <div class="perfil-info">
                    <p class="perfil-label">Seguidores</p>
                    <p class="perfil-dato">${perfil.seguidores.toLocaleString()}</p>
                </div>

                <div class="perfil-info">
                    <p class="perfil-label">Conectado con</p>
                    <p class="perfil-dato">Spotify</p>
                </div>
            `;

            // Foto en el header (solo si el usuario tiene imagen)
            if (perfil.imagen) {
                const headerPerfil = document.querySelector('.header .perfil');
                if (!headerPerfil.querySelector('img')) {
                    const imgHeader = document.createElement('img');
                    imgHeader.src = perfil.imagen;
                    imgHeader.alt = 'Foto';
                    imgHeader.style.cssText = 'width: 28px; height: 28px; border-radius: 50%; object-fit: cover;';
                    headerPerfil.insertBefore(imgHeader, headerPerfil.firstChild);
                }
            }
        })
        .catch(error => {
            console.error('Error al cargar perfil:', error);
            contenedor.innerHTML = `
                <div class="perfil-avatar">
                    <i class="fa-solid fa-user"></i>
                </div>
                <div class="perfil-info">
                    <p class="perfil-label">Nombre de usuario</p>
                    <p class="perfil-nombre">${escaparHTML(nombreUsuario)}</p>
                </div>
                <p class="sin-resultados">No se pudieron cargar los datos del perfil.</p>
            `;
        });
}

function cargarTopArtistas() {
    if (topArtistasCargado) return;

    const contenedor = document.querySelector('#top-artistas');
    contenedor.innerHTML = '<div class="perfil-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>';

    API.topArtistas()
        .then(data => {
            topArtistasCargado = true;

            if (!data.items || data.items.length === 0) {
                contenedor.innerHTML = '<p class="sin-resultados">Todavía no tenés suficientes datos de escucha.</p>';
                return;
            }

            contenedor.innerHTML = '';

            data.items.forEach(artista => {
                if (!artista.images || artista.images.length === 0) return;

                const tarjeta = document.createElement('div');
                tarjeta.classList.add('tarjeta-cancion', 'tarjeta-artista');
                tarjeta.style.setProperty('--portada-url', `url(${artista.images[0].url})`);

                const portada = document.createElement('img');
                portada.src = artista.images[0].url;
                portada.alt = artista.name;
                tarjeta.appendChild(portada);

                const nombre = document.createElement('p');
                nombre.textContent = artista.name;
                tarjeta.appendChild(nombre);

                const generos = document.createElement('p');
                generos.textContent = artista.genres?.slice(0, 2).join(', ') || 'Artista';
                tarjeta.appendChild(generos);

                if (artista.external_urls?.spotify) {
                    tarjeta.addEventListener('click', () => {
                        window.open(artista.external_urls.spotify, '_blank');
                    });
                }

                contenedor.appendChild(tarjeta);
            });
        })
        .catch(error => {
            console.error('Error al cargar top artistas:', error);
            contenedor.innerHTML = '<p class="sin-resultados">Error al cargar los artistas.</p>';
        });
}

function cargarTopTracks() {
    if (topTracksCargado) return;

    const contenedor = document.querySelector('#top-tracks');
    contenedor.innerHTML = '<div class="perfil-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>';

    API.topTracks()
        .then(data => {
            topTracksCargado = true;

            if (!data.items || data.items.length === 0) {
                contenedor.innerHTML = '<p class="sin-resultados">Todavía no tenés suficientes datos de escucha.</p>';
                return;
            }

            contenedor.innerHTML = '';

            data.items.forEach((track, index) => {
                const tarjeta = crearTarjetaTopTrack(track, index);
                if (tarjeta) contenedor.appendChild(tarjeta);
            });
        })
        .catch(error => {
            console.error('Error al cargar top tracks:', error);
            contenedor.innerHTML = '<p class="sin-resultados">Error al cargar las canciones.</p>';
        });
}

export { cargarPerfilSpotify, cargarTopArtistas, cargarTopTracks };