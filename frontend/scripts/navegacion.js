// ============================================================
// NAVEGACIÓN — Cambio entre las vistas (Inicio, Explorar,
// Biblioteca, Perfil). Carga perezosa: cada vista pide los datos
// al backend solo la primera vez que se visita.
// ============================================================

import { cargarCancionesRecientes, cargarFavoritos, cargarMisPlaylists } from './vistas/biblioteca.js';
import { cargarPerfilSpotify, cargarTopArtistas, cargarTopTracks } from './vistas/perfil.js';

const linksSidebar = document.querySelectorAll('.sidebar a');
const vistas = document.querySelectorAll('.vista');

// Mapa: texto del link -> id de la vista
const ID_VISTAS = {
    'Inicio': 'vista-inicio',
    'Explorar': 'vista-explorar',
    'Biblioteca': 'vista-biblioteca',
    'Perfil': 'vista-perfil'
};

// Muestra una vista por su texto ("Inicio", "Perfil", ...) y marca el link activo
export function mostrarVista(textoLink) {
    linksSidebar.forEach(l => l.classList.remove('activo'));
    vistas.forEach(v => v.classList.remove('activa'));

    const linkActivo = [...linksSidebar].find(l => l.textContent.trim() === textoLink);
    if (linkActivo) linkActivo.classList.add('activo');

    const idVista = ID_VISTAS[textoLink];
    if (idVista) document.querySelector(`#${idVista}`).classList.add('activa');
}

// Carga perezosa: solo pide los datos que necesita cada vista
function cargarDatosDeVista(texto) {
    if (texto === 'Biblioteca') {
        cargarCancionesRecientes();
        cargarFavoritos();
        cargarMisPlaylists();
    } else if (texto === 'Perfil') {
        cargarPerfilSpotify();
        cargarTopArtistas();
        cargarTopTracks();
    }
}

linksSidebar.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();

        const texto = link.textContent.trim();
        mostrarVista(texto);
        cargarDatosDeVista(texto);
    });
});

// Router por eventos: cualquier módulo puede pedir mostrar una vista
// sin importar navegación.js (evita dependencias circulares).
window.addEventListener('mostrar-vista', (e) => {
    const texto = e.detail?.texto;
    if (texto && ID_VISTAS[texto]) {
        mostrarVista(texto);
        cargarDatosDeVista(texto);
    }
});