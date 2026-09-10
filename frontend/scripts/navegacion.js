// ============================================================
// NAVEGACIÓN — Cambio entre las vistas (Inicio, Explorar,
// Biblioteca, Perfil). Carga perezosa: cada vista pide los datos
// al backend solo la primera vez que se visita.
// ============================================================

import { cargarCancionesRecientes, cargarFavoritos } from './vistas/biblioteca.js';
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

linksSidebar.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();

        const texto = link.textContent.trim();
        mostrarVista(texto);

        // Carga perezosa: solo se pide lo que se necesita en cada vista
        if (texto === 'Biblioteca') {
            cargarCancionesRecientes();
            cargarFavoritos();
        } else if (texto === 'Perfil') {
            cargarPerfilSpotify();
            cargarTopArtistas();
            cargarTopTracks();
        }
    });
});