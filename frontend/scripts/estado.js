// ============================================================
// ESTADO — Estado global de favoritos (corazones de tarjetas)
// Cada módulo que dibuja tarjetas consulta esFavorito().
// Solo favoritos.js modifica este estado vía las funciones de
// este módulo, así el estado se mantiene siempre sincronizado.
// ============================================================

let favoritosIds = new Set();

// Indica si un track (por id) está marcado como favorito
export function esFavorito(id) {
    return favoritosIds.has(id);
}

// Actualiza el corazón de todas las tarjetas visibles y del reproductor
export function actualizarCorazones() {
    document.querySelectorAll('.btn-favorito').forEach(boton => {
        const activo = favoritosIds.has(boton.dataset.trackId);
        boton.classList.toggle('activo', activo);
        boton.innerHTML = activo
            ? '<i class="fa-solid fa-heart"></i>'
            : '<i class="fa-regular fa-heart"></i>';
    });

    // Corazón "me gusta" del reproductor (sigue a la canción actual)
    const btnLike = document.querySelector('#btn-like-reproductor');
    if (btnLike && btnLike.dataset.trackId) {
        const activo = favoritosIds.has(btnLike.dataset.trackId);
        btnLike.classList.toggle('activo', activo);
        btnLike.innerHTML = activo
            ? '<i class="fa-solid fa-heart"></i>'
            : '<i class="fa-regular fa-heart"></i>';
    }
}

// Reemplaza el conjunto completo de favoritos (tras obtenerlos de la API)
export function setFavoritosIds(ids) {
    favoritosIds = new Set(ids);
    actualizarCorazones();
}

// Marca o desmarca un track localmente y refresca los corazones
export function actualizarFavoritoLocal(id, esFavoritoAhora) {
    if (esFavoritoAhora) {
        favoritosIds.add(id);
    } else {
        favoritosIds.delete(id);
    }
    actualizarCorazones();
}