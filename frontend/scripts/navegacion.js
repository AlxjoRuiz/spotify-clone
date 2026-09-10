// ============================================================
// NAVEGACIÓN — Cambio entre las vistas (Inicio, Explorar,
// Biblioteca, Perfil). Carga perezosa: cada vista pide los datos
// al backend solo la primera vez que se visita.
// ============================================================

import { cargarCancionesRecientes, cargarFavoritos, cargarMisPlaylists } from './vistas/biblioteca.js';
import { cargarPerfilSpotify, cargarTopArtistas, cargarTopTracks } from './vistas/perfil.js';

const linksSidebar = document.querySelectorAll('.sidebar a');
const vistas = document.querySelectorAll('.vista');

const btnAtras = document.querySelector('#btn-atras');
const btnAdelante = document.querySelector('#btn-adelante');

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

// ------------------------------------------------------------------
// HISTORIAL DE VISTAS (flechas atrás/adelante del header)
// ------------------------------------------------------------------

const historialAtras = [];
const historialAdelante = [];

// Habilita/deshabilita las flechas según si hay historia
function actualizarFlechas() {
    if (btnAtras) btnAtras.disabled = historialAtras.length < 2;
    if (btnAdelante) btnAdelante.disabled = historialAdelante.length === 0;
}

// Navega a una vista y la registra en el historial (sin repetidos seguidos)
function navegar(texto) {
    if (historialAtras[historialAtras.length - 1] !== texto) {
        historialAtras.push(texto);
        if (historialAtras.length > 50) historialAtras.shift();
    }
    historialAdelante.length = 0; // navegación nueva invalida el "adelante"

    mostrarVista(texto);
    cargarDatosDeVista(texto);
    actualizarFlechas();
}

if (btnAtras) {
    btnAtras.addEventListener('click', () => {
        if (historialAtras.length < 2) return;

        const actual = historialAtras.pop();
        historialAdelante.push(actual);

        const destino = historialAtras[historialAtras.length - 1];
        mostrarVista(destino);
        cargarDatosDeVista(destino);
        actualizarFlechas();
    });
}

if (btnAdelante) {
    btnAdelante.addEventListener('click', () => {
        const siguiente = historialAdelante.pop();
        if (!siguiente) return;

        historialAtras.push(siguiente);
        mostrarVista(siguiente);
        cargarDatosDeVista(siguiente);
        actualizarFlechas();
    });
}

linksSidebar.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const texto = link.textContent.trim();
        navegar(texto);
    });
});

// Router por eventos: cualquier módulo puede pedir mostrar una vista
// sin importar navegación.js (evita dependencias circulares).
window.addEventListener('mostrar-vista', (e) => {
    const texto = e.detail?.texto;
    if (texto && ID_VISTAS[texto]) {
        navegar(texto);
    }
});