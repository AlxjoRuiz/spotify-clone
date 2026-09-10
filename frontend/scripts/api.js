// ============================================================
// API — Cliente HTTP para los endpoints del backend (server/)
// Todos los fetch del frontend pasan por acá.
// ============================================================

// Hace un fetch y devuelve la respuesta parseada como JSON
async function pedir(url, opciones) {
    const response = await fetch(url, opciones);
    return response.json();
}

export const API = {
    // Spotify
    playlistsPopulares: () => pedir('/api/playlists-populares'),
    explorar: () => pedir('/api/explorar'),
    misPlaylists: () => pedir('/api/mis-playlists'),
    playlistTracks: (idPlaylist) => pedir(`/api/playlists/${idPlaylist}/tracks`),
    buscar: (texto) => pedir(`/api/buscar?q=${encodeURIComponent(texto)}`),
    albumTracks: (idAlbum) => pedir(`/api/album/${idAlbum}/tracks`),
    perfil: () => pedir('/api/perfil'),
    topArtistas: () => pedir('/api/top-artistas'),
    topTracks: () => pedir('/api/top-tracks'),
    cancionesRecientes: () => pedir('/api/canciones'),

    // Favoritos
    listarFavoritos: () => pedir('/api/favoritos'),
    agregarFavorito: (datos) => pedir('/api/favoritos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
    }),
    quitarFavorito: (idTrack) => pedir(`/api/favoritos/${encodeURIComponent(idTrack)}`, {
        method: 'DELETE'
    })
};

export default API;