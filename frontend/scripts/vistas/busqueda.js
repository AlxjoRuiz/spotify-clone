// ============================================================
// VISTA BÚSQUEDA — Buscador con historial (últimas 5 búsquedas),
// sugerencias clicables y resultados en la vista Explorar.
// Escucha el evento 'volver-a-resultados' emitido por la vista
// de álbum para regresar a los resultados previos.
// ============================================================

import API from '../api.js';
import { escaparHTML } from '../utils.js';
import { cargarAlbum } from './album.js';
import {
    agregarSeccion,
    crearTarjetaCancion,
    crearTarjetaArtista,
    crearTarjetaAlbum,
    crearTarjetaPlaylist
} from '../componentes.js';
import { mostrarVista } from '../navegacion.js';

const inputBuscar = document.querySelector('#input-buscar');
const btnBuscar = document.querySelector('#btn-buscar');

const HISTORIAL_MAX = 5;
let ultimaBusqueda = '';

// Obtiene el historial guardado en localStorage (o array vacío)
function obtenerHistorial() {
    const historial = localStorage.getItem('historial_busquedas');
    try {
        return historial ? JSON.parse(historial) : [];
    } catch {
        return [];
    }
}

// Guarda la búsqueda en el historial (sin repetir, máx 5) y refresca las sugerencias
function guardarEnHistorial(texto) {
    const historial = obtenerHistorial().filter(item => item.toLowerCase() !== texto.toLowerCase());
    historial.unshift(texto);

    localStorage.setItem('historial_busquedas', JSON.stringify(historial.slice(0, HISTORIAL_MAX)));
    mostrarSugerencias();
}

// Dibuja las búsquedas recientes como chips clicables bajo el buscador
function mostrarSugerencias() {
    const contenedor = document.querySelector('#sugerencias-busqueda');
    if (!contenedor) return;

    const historial = obtenerHistorial();
    contenedor.innerHTML = '';

    historial.forEach(texto => {
        const boton = document.createElement('button');
        boton.classList.add('sugerencia-busqueda');
        boton.textContent = texto;
        boton.addEventListener('click', () => {
            inputBuscar.value = texto;
            ejecutarBusqueda();
        });
        contenedor.appendChild(boton);
    });
}

// Pide los resultados de búsqueda a la API y los dibuja en la vista Explorar
function ejecutarBusqueda() {
    const texto = inputBuscar.value.trim();
    if (!texto) return;

    guardarEnHistorial(texto);
    ultimaBusqueda = texto;

    // Muestra la vista de explorar con un spinner
    mostrarVista('Explorar');
    const vista = document.querySelector('#vista-explorar');
    vista.innerHTML = `
        <div class="loading-container">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Buscando "${escaparHTML(texto)}"...</p>
        </div>
    `;

    API.buscar(texto)
        .then(data => {
            vista.innerHTML = '';

            // Título con lo buscado
            const titulo = document.createElement('h2');
            titulo.classList.add('vista-titulo');
            titulo.textContent = `Resultados para: "${texto}"`;
            vista.appendChild(titulo);

            // Cada sección solo se agrega si tiene resultados válidos
            if (data.tracks) agregarSeccion(vista, 'Canciones', data.tracks.items, crearTarjetaCancion);
            if (data.artists) agregarSeccion(vista, 'Artistas', data.artists.items, crearTarjetaArtista);
            if (data.albums) {
                agregarSeccion(vista, 'Álbumes', data.albums.items, album => crearTarjetaAlbum(album, cargarAlbum));
            }
            if (data.playlists) agregarSeccion(vista, 'Playlists', data.playlists.items, crearTarjetaPlaylist);

            // Si no apareció ninguna tarjeta, muestra un mensaje
            const hayResultados = vista.querySelectorAll('.tarjeta-cancion').length > 0;
            if (!hayResultados) {
                const vacio = document.createElement('p');
                vacio.classList.add('sin-resultados');
                vacio.textContent = `No se encontraron resultados para "${texto}".`;
                vista.appendChild(vacio);
            }
        })
        .catch(error => {
            console.error('Error al buscar:', error);
            vista.innerHTML = `
                <div class="loading-container">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <p>Error al buscar. Intentá de nuevo.</p>
                </div>
            `;
        });
}

// Vuelve a los resultados de la búsqueda que abrió el álbum
function volverAResultados() {
    if (ultimaBusqueda) {
        inputBuscar.value = ultimaBusqueda;
    }
    ejecutarBusqueda();
}

// Eventos del buscador
btnBuscar.addEventListener('click', ejecutarBusqueda);

inputBuscar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') ejecutarBusqueda();
});

// Muestra las sugerencias cuando el campo recibe foco
inputBuscar.addEventListener('focus', mostrarSugerencias);

// Lo emite la vista de álbum con su botón "Volver a resultados"
window.addEventListener('volver-a-resultados', volverAResultados);