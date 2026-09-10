// ============================================================
// REPRODUCTOR — Barra inferior: cola de canciones, play/pausa,
// anterior/siguiente, shuffle (aleatorio), repeat (lista/canción),
// volumen y barra de progreso.
// Exporta reproducirPreview(), usado por cualquier card/lista.
// ============================================================

import { formatearTiempo, PORTADA_DEFECTO } from './utils.js';

const audio = document.querySelector('#audio-control');
const reproPortada = document.querySelector('#reproductor-portada');
const reproNombre = document.querySelector('#reproductor-nombre');
const reproArtista = document.querySelector('#reproductor-artista');

const btnPlay = document.querySelector('#btn-play');
const btnAnterior = document.querySelector('#btn-anterior');
const btnSiguiente = document.querySelector('#btn-siguiente');
const btnAleatorio = document.querySelector('#btn-aleatorio');
const btnRepetir = document.querySelector('#btn-repetir');
const btnVolumen = document.querySelector('#btn-volumen');

const barraProgreso = document.querySelector('#barra-progreso');
const tiempoActual = document.querySelector('#tiempo-actual');
const tiempoTotal = document.querySelector('#tiempo-total');

const barraVolumen = document.querySelector('#barra-volumen');

// Cola de canciones para siguiente/anterior
let colaCanciones = [];
let indiceActual = -1;
let aleatorioActivo = false;         // Modo shuffle: siguiente elige canción al azar
let repetirActivo = false;           // Modo repeat: al terminar vuelve al inicio si hay más
let repetirUna = false;              // Repetir la MISMA canción al terminar

// Muestra la info de la canción actual en el reproductor
function actualizarInfoReproductor(nombre, artista, portada) {
    reproNombre.textContent = nombre;
    reproArtista.textContent = artista;
    reproPortada.src = portada || PORTADA_DEFECTO;
}

// Cambia el icono del botón play/pausa
function actualizarIconoPlay(estaReproduciendo) {
    const icono = btnPlay.querySelector('i');
    icono.className = estaReproduciendo ? 'fa-solid fa-pause' : 'fa-solid fa-play';
}

// Cambia el icono del volumen según mute/sonido
function actualizarIconoVolumen() {
    const icono = btnVolumen.querySelector('i');
    if (audio.muted || audio.volume === 0) {
        icono.className = 'fa-solid fa-volume-xmark';
    } else if (audio.volume < 0.5) {
        icono.className = 'fa-solid fa-volume-low';
    } else {
        icono.className = 'fa-solid fa-volume-high';
    }
}

// Reproduce una canción específica de la cola por su índice
function reproducirPorIndice(indice) {
    if (indice < 0 || indice >= colaCanciones.length) return;

    const cancion = colaCanciones[indice];
    if (!cancion.previewUrl) {
        alert('Esta canción no tiene preview disponible');
        return;
    }

    indiceActual = indice;
    audio.src = cancion.previewUrl;
    audio.play();
    actualizarInfoReproductor(cancion.nombre, cancion.artista, cancion.portada);
    actualizarIconoPlay(true);
}

// Agrega una canción a la cola y la reproduce
export function reproducirPreview(previewUrl, nombre, artista, portada) {
    if (!previewUrl) {
        alert('Esta canción no tiene preview disponible');
        return;
    }

    const indiceExistente = colaCanciones.findIndex(c => c.previewUrl === previewUrl);
    if (indiceExistente !== -1) {
        reproducirPorIndice(indiceExistente);
        return;
    }

    colaCanciones.push({ previewUrl, nombre, artista, portada });
    reproducirPorIndice(colaCanciones.length - 1);
}

// Elige a qué canción ir cuando se pide "siguiente"
// Respeta el modo aleatorio y el repeat (lista completa)
function reproducirSiguiente() {
    if (aleatorioActivo && colaCanciones.length > 1) {
        // Índice aleatorio distinto del actual
        let nuevoIndice;
        do {
            nuevoIndice = Math.floor(Math.random() * colaCanciones.length);
        } while (nuevoIndice === indiceActual);
        reproducirPorIndice(nuevoIndice);
        return;
    }

    if (indiceActual < colaCanciones.length - 1) {
        reproducirPorIndice(indiceActual + 1);
        return;
    }

    // Llegó al final de la lista
    if (repetirActivo && colaCanciones.length > 0) {
        reproducirPorIndice(0);
    } else {
        actualizarIconoPlay(false);
    }
}

// Elige a qué canción ir cuando se pide "anterior"
function reproducirAnterior() {
    if (indiceActual > 0) {
        reproducirPorIndice(indiceActual - 1);
    } else if (indiceActual === 0 && colaCanciones.length > 0) {
        // Reinicia la canción actual si ya estaba en el principio
        reproducirPorIndice(0);
    }
}

// Actualiza el estilo (verde = activo) de los botones de aleatorio/repetir
function actualizarIconosModo() {
    btnAleatorio.classList.toggle('activo', aleatorioActivo);
    btnAleatorio.title = aleatorioActivo ? 'Aleatorio activado' : 'Reproducción aleatoria';

    btnRepetir.classList.toggle('activo', repetirActivo);
    const iconoRepetir = btnRepetir.querySelector('i');
    if (repetirUna) {
        iconoRepetir.className = 'fa-solid fa-repeat-1';
        btnRepetir.title = 'Repetir una canción';
    } else {
        iconoRepetir.className = 'fa-solid fa-repeat';
        btnRepetir.title = repetirActivo ? 'Repetir lista' : 'Repetir desactivado';
    }
}

// Eventos del reproductor
btnPlay.addEventListener('click', () => {
    if (colaCanciones.length === 0) return;

    if (audio.paused) {
        audio.play();
        actualizarIconoPlay(true);
    } else {
        audio.pause();
        actualizarIconoPlay(false);
    }
});

btnAnterior.addEventListener('click', () => {
    reproducirAnterior();
});

btnSiguiente.addEventListener('click', () => {
    reproducirSiguiente();
});

// Alterna el modo aleatorio (shuffle)
btnAleatorio.addEventListener('click', () => {
    aleatorioActivo = !aleatorioActivo;
    actualizarIconosModo();
});

// Cicla los modos de repetición: desactivado -> repetir lista -> repetir canción -> desactivado
btnRepetir.addEventListener('click', () => {
    if (!repetirActivo) {
        repetirActivo = true;
        repetirUna = false;
    } else if (!repetirUna) {
        repetirUna = true;
    } else {
        repetirActivo = false;
        repetirUna = false;
    }
    actualizarIconosModo();
});

audio.addEventListener('timeupdate', () => {
    const porcentaje = (audio.currentTime / audio.duration) * 100 || 0;
    barraProgreso.value = porcentaje;
    tiempoActual.textContent = formatearTiempo(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
    tiempoTotal.textContent = formatearTiempo(audio.duration || 0);
});

audio.addEventListener('ended', () => {
    // Repetir la MISMA canción
    if (repetirUna) {
        audio.currentTime = 0;
        audio.play();
        return;
    }
    reproducirSiguiente();
});

barraProgreso.addEventListener('input', () => {
    const nuevoTiempo = (barraProgreso.value / 100) * audio.duration;
    audio.currentTime = nuevoTiempo;
});

barraVolumen.addEventListener('input', () => {
    audio.volume = barraVolumen.value / 100;
    actualizarIconoVolumen();
});

btnVolumen.addEventListener('click', () => {
    audio.muted = !audio.muted;
    actualizarIconoVolumen();
});

// Volumen inicial al 70% e iconos de modo por defecto
audio.volume = 0.7;
actualizarIconoVolumen();
actualizarIconosModo();