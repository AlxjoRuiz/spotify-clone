// ============================================================
// VISTA INICIO — Playlists populares + secciones personalizadas
// ("Hecho para ti"): recientes, artistas y canciones del usuario.
// ============================================================

import API from '../api.js';
import { crearTarjetaPlaylist, crearTarjetaArtista, crearTarjetaCancion } from '../componentes.js';

const contenedorPlaylists = document.querySelector('#playlists');
let seccionesCargadas = false;

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

// Dibuja una sección personalizada debajo de "Para empezar"
function agregarSeccionHome(titulo, items, funcionTarjeta, mensajeVacio) {
    const vistaInicio = document.querySelector('#vista-inicio');

    const tituloEl = document.createElement('h2');
    tituloEl.classList.add('vista-titulo');
    tituloEl.textContent = titulo;
    vistaInicio.appendChild(tituloEl);

    const grid = document.createElement('div');
    grid.classList.add('grid-tarjetas');

    const tarjetas = (items || [])
        .filter(item => item && item.id)
        .map(item => funcionTarjeta(item))
        .filter(tarjeta => tarjeta);

    if (tarjetas.length === 0) {
        grid.innerHTML = `<p class="sin-resultados">${mensajeVacio}</p>`;
    } else {
        tarjetas.forEach(tarjeta => grid.appendChild(tarjeta));
    }

    vistaInicio.appendChild(grid);
}

// Carga una sola vez las secciones personalizadas del home:
// recientes + artistas más escuchados + canciones más escuchadas.
function cargarSeccionesHome() {
    if (seccionesCargadas) return;
    seccionesCargadas = true;

    Promise.allSettled([
        API.cancionesRecientes(),
        API.topArtistas(),
        API.topTracks()
    ]).then(([recientes, artistas, tracks]) => {
        if (recientes.status === 'fulfilled') {
            agregarSeccionHome(
                'Escuchado recientemente',
                recientes.value?.items?.map(item => item?.track) ?? [],
                crearTarjetaCancion,
                'Todavía no tenés reproducciones recientes en Spotify.'
            );
        } else {
            console.error('Error al cargar recientes en el home:', recientes.reason);
        }

        if (artistas.status === 'fulfilled') {
            agregarSeccionHome(
                'Tus artistas más escuchados',
                artistas.value?.items ?? [],
                crearTarjetaArtista,
                'Todavía no tenés suficientes datos de escucha.'
            );
        } else {
            console.error('Error al cargar top artistas en el home:', artistas.reason);
        }

        if (tracks.status === 'fulfilled') {
            agregarSeccionHome(
                'Tus canciones más escuchadas',
                tracks.value?.items ?? [],
                crearTarjetaCancion,
                'Todavía no tenés suficientes datos de escucha.'
            );
        } else {
            console.error('Error al cargar top tracks en el home:', tracks.reason);
        }
    });
}

export function cargarPlaylists() {
    dibujarHero();
    cargarSeccionesHome();

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