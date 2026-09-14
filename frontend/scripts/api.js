// ============================================================
// API — Cliente HTTP para los endpoints del backend (server/)
// Todos los fetch del frontend pasan por acá.
// ============================================================

// Hace un fetch y devuelve la respuesta parseada como JSON.
// Si la sesión expiró (401) redirige al login.
async function pedir(url, opciones) {
    const response = await fetch(url, opciones);

    if (response.status === 401) {
        window.location.href = '/pages/login.html';
        throw new Error('Sesión expirada');
    }

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
    topArtistas: (timeRange = 'medium_term') => pedir(`/api/top-artistas?time_range=${timeRange}`),
    topTracks: (timeRange = 'medium_term') => pedir(`/api/top-tracks?time_range=${timeRange}`),
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