// ============================================================
// DASHBOARD JS — Spotify Clone
// Ordenado por secciones: sesión, saludo, vistas, favoritos,
// reproductor, tarjetas, inicio, búsqueda, biblioteca y perfil.
// ============================================================

// ---------- Sección 1: UTILIDADES ----------

// Formatea segundos a mm:ss (ej: 245 -> "4:05")
function formatearTiempo(segundos) {
    const mins = Math.floor(segundos / 60);
    const secs = Math.floor(segundos % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Escapa caracteres HTML para usar texto dinámico dentro de innerHTML (evita inyección)
function escaparHTML(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ---------- Sección 2: SESIÓN ----------

// Nombre desde la URL (lo manda Spotify tras login) o desde localStorage (login de desarrollo)
const paramsURL = new URLSearchParams(window.location.search);
let nombreUsuario = paramsURL.get('nombre');

if (!nombreUsuario) {
    nombreUsuario = localStorage.getItem('usuario_nombre');
}

// Sin nombre => no hay sesión activa
if (!nombreUsuario) {
    window.location.href = 'login.html';
}

// Limpia la URL para que no se vea ?nombre=... en la barra de direcciones
if (paramsURL.get('nombre')) {
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Muestra el nombre en el perfil del header
document.querySelector('#nombre-perfil').textContent = nombreUsuario;

// Cerrar sesión
const btnLogout = document.querySelector('#btn-logout');
btnLogout.addEventListener('click', () => {
    window.location.href = '/auth/logout';
});

// ---------- Sección 3: SALUDO DINÁMICO ----------

function saludoSegunHora() {
    const hora = new Date().getHours();
    if (hora >= 6 && hora < 12) return 'Buenos días';
    if (hora >= 12 && hora < 20) return 'Buenas tardes';
    return 'Buenas noches';
}

document.querySelector('#greeting').textContent = `${saludoSegunHora()}, ${nombreUsuario}`;

// ---------- Sección 4: NAVEGACIÓN ENTRE VISTAS ----------

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
function mostrarVista(textoLink) {
    linksSidebar.forEach(l => l.classList.remove('activo'));
    vistas.forEach(v => v.classList.remove('activa'));

    const linkActivo = [...linksSidebar].find(l => l.textContent.trim() === textoLink);
    if (linkActivo) linkActivo.classList.add('activo');

    const idVista = ID_VISTAS[textoLink];
    if (idVista) document.querySelector(`#${idVista}`).classList.add('activa');
}

// ---------- Sección 5: FAVORITOS (estado global) ----------
// El corazón de cada tarjeta depende de este conjunto.
// Se mantiene sincronizado con Supabase.

let favoritosIds = new Set();

// Actualiza los corazones de TODAS las tarjetas visibles según favoritosIds
function actualizarCorazones() {
    document.querySelectorAll('.btn-favorito').forEach(boton => {
        const activo = favoritosIds.has(boton.dataset.trackId);
        boton.classList.toggle('activo', activo);
        boton.innerHTML = activo
            ? '<i class="fa-solid fa-heart"></i>'
            : '<i class="fa-regular fa-heart"></i>';
    });
}

// Trae los favoritos de Supabase y actualiza el estado global
async function obtenerFavoritos() {
    try {
        const response = await fetch('/api/favoritos');
        const data = await response.json();
        const favoritos = data.favoritos || [];
        favoritosIds = new Set(favoritos.map(f => f.track_id));
        actualizarCorazones();
        return favoritos;
    } catch (error) {
        console.error('Error al cargar favoritos:', error);
        return [];
    }
}

// Agrega o quita un favorito según si ya está marcado (toggle)
async function guardarFavorito(track, boton) {
    const yaEsFavorito = favoritosIds.has(track.id);

    try {
        if (yaEsFavorito) {
            const response = await fetch(`/api/favoritos/${encodeURIComponent(track.id)}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.ok) favoritosIds.delete(track.id);
        } else {
            const datos = {
                trackId: track.id,
                nombre: track.name,
                artista: track.artists?.[0]?.name ?? 'Desconocido',
                imagen: track.album?.images?.[0]?.url ?? null,
                preview: track.preview_url || null
            };
            const response = await fetch('/api/favoritos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            const data = await response.json();
            if (data.ok) favoritosIds.add(track.id);
        }

        actualizarCorazones();
    } catch (error) {
        console.error('Error al cambiar favorito:', error);
    }
}

// Carga los favoritos y los dibuja en la sección #favoritos de la Biblioteca
async function cargarFavoritos() {
    const contenedor = document.querySelector('#favoritos');
    if (!contenedor) return;

    contenedor.innerHTML = `
        <div class="perfil-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
        </div>
    `;

    const favoritos = await obtenerFavoritos();
    contenedor.innerHTML = '';

    if (favoritos.length === 0) {
        contenedor.innerHTML = '<p class="sin-resultados">Aún no guardaste canciones favoritas.</p>';
        return;
    }

    favoritos.forEach(favorito => {
        const track = {
            id: favorito.track_id,
            name: favorito.track_nombre,
            artists: [{ name: favorito.track_artista }],
            album: { images: [{ url: favorito.track_imagen }] },
            preview_url: favorito.track_preview
        };
        const tarjeta = crearTarjetaCancion(track);
        if (tarjeta) contenedor.appendChild(tarjeta);
    });
}

// ---------- Sección 6: REPRODUCTOR ----------

const audio = document.querySelector('#audio-control');
const reproPortada = document.querySelector('#reproductor-portada');
const reproNombre = document.querySelector('#reproductor-nombre');
const reproArtista = document.querySelector('#reproductor-artista');

const btnPlay = document.querySelector('#btn-play');
const btnAnterior = document.querySelector('#btn-anterior');
const btnSiguiente = document.querySelector('#btn-siguiente');
const btnVolumen = document.querySelector('#btn-volumen');

const barraProgreso = document.querySelector('#barra-progreso');
const tiempoActual = document.querySelector('#tiempo-actual');
const tiempoTotal = document.querySelector('#tiempo-total');

const barraVolumen = document.querySelector('#barra-volumen');

// Cola de canciones para siguiente/anterior
let colaCanciones = [];
let indiceActual = -1;

// Muestra la info de la canción actual en el reproductor
function actualizarInfoReproductor(nombre, artista, portada) {
    reproNombre.textContent = nombre;
    reproArtista.textContent = artista;
    reproPortada.src = portada;
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
function reproducirPreview(previewUrl, nombre, artista, portada) {
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
    if (indiceActual > 0) reproducirPorIndice(indiceActual - 1);
});

btnSiguiente.addEventListener('click', () => {
    if (indiceActual < colaCanciones.length - 1) reproducirPorIndice(indiceActual + 1);
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
    if (indiceActual < colaCanciones.length - 1) {
        reproducirPorIndice(indiceActual + 1);
    } else {
        actualizarIconoPlay(false);
    }
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

// Volumen inicial al 70%
audio.volume = 0.7;
actualizarIconoVolumen();

// ---------- Sección 7: CREADORES DE TARJETAS ----------

// Título de sección (Canciones, Artistas, Álbumes, ...)
function crearTituloSeccion(texto) {
    const titulo = document.createElement('h3');
    titulo.classList.add('seccion-titulo');
    titulo.textContent = texto;
    return titulo;
}

// Botón corazón de favoritos (reusable para cualquier tarjeta de canción)
function crearBotonFavorito(track) {
    const boton = document.createElement('button');
    boton.classList.add('btn-favorito');
    boton.dataset.trackId = track.id;
    boton.classList.toggle('activo', favoritosIds.has(track.id));
    boton.innerHTML = favoritosIds.has(track.id)
        ? '<i class="fa-solid fa-heart"></i>'
        : '<i class="fa-regular fa-heart"></i>';

    boton.addEventListener('click', (e) => {
        e.stopPropagation();
        guardarFavorito(track, boton);
    });

    return boton;
}

// Tarjeta de canción reutilizable (portada + play + corazón + nombre/artista)
function crearTarjetaCancion(track) {
    const portadaUrl = track.album?.images?.[0]?.url;
    if (!portadaUrl) return null;

    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-cancion');
    tarjeta.style.setProperty('--portada-url', `url(${portadaUrl})`);

    // Portada
    const portada = document.createElement('img');
    portada.src = portadaUrl;
    portada.alt = track.name;
    tarjeta.appendChild(portada);

    // Botón play
    const btnReproducir = document.createElement('button');
    btnReproducir.classList.add('btn-play');
    btnReproducir.innerHTML = '<i class="fa-solid fa-play"></i>';
    btnReproducir.addEventListener('click', (e) => {
        e.stopPropagation();
        reproducirPreview(
            track.preview_url,
            track.name,
            track.artists?.[0]?.name ?? 'Desconocido',
            portadaUrl
        );
    });
    tarjeta.appendChild(btnReproducir);

    // Botón corazón
    tarjeta.appendChild(crearBotonFavorito(track));

    // Nombre y artista
    const nombre = document.createElement('p');
    nombre.textContent = track.name;
    tarjeta.appendChild(nombre);

    const artista = document.createElement('p');
    artista.textContent = track.artists?.map(a => a.name).join(', ') || 'Desconocido';
    tarjeta.appendChild(artista);

    return tarjeta;
}

// Tarjeta de artista (imagen circular, abre Spotify al click)
function crearTarjetaArtista(artista) {
    if (!artista.images || artista.images.length === 0) return null;

    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-cancion', 'tarjeta-artista');
    tarjeta.style.setProperty('--portada-url', `url(${artista.images[0].url})`);

    const portada = document.createElement('img');
    portada.src = artista.images[0].url;
    tarjeta.appendChild(portada);

    const nombre = document.createElement('p');
    nombre.textContent = artista.name;
    tarjeta.appendChild(nombre);

    const tipo = document.createElement('p');
    tipo.textContent = 'Artista';
    tarjeta.appendChild(tipo);

    if (artista.external_urls?.spotify) {
        tarjeta.addEventListener('click', () => {
            window.open(artista.external_urls.spotify, '_blank');
        });
    }

    return tarjeta;
}

// Tarjeta de álbum (al hacer click muestra sus canciones en la vista Explorar)
function crearTarjetaAlbum(album) {
    if (!album.images || album.images.length === 0) return null;

    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-cancion');
    tarjeta.style.setProperty('--portada-url', `url(${album.images[0].url})`);

    const portada = document.createElement('img');
    portada.src = album.images[0].url;
    tarjeta.appendChild(portada);

    const nombre = document.createElement('p');
    nombre.textContent = album.name;
    tarjeta.appendChild(nombre);

    const artista = document.createElement('p');
    artista.textContent = album.artists?.[0]?.name ?? 'Desconocido';
    tarjeta.appendChild(artista);

    tarjeta.addEventListener('click', () => {
        cargarAlbum(album.id);
    });

    return tarjeta;
}

// Tarjeta de playlist (abre Spotify al click)
function crearTarjetaPlaylist(playlist) {
    if (!playlist.images || playlist.images.length === 0) return null;

    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-cancion');
    tarjeta.style.setProperty('--portada-url', `url(${playlist.images[0].url})`);

    const portada = document.createElement('img');
    portada.src = playlist.images[0].url;
    tarjeta.appendChild(portada);

    const nombre = document.createElement('p');
    nombre.textContent = playlist.name;
    tarjeta.appendChild(nombre);

    const dueno = document.createElement('p');
    dueno.textContent = playlist.owner?.display_name ?? 'Desconocido';
    tarjeta.appendChild(dueno);

    if (playlist.external_urls?.spotify) {
        tarjeta.addEventListener('click', () => {
            window.open(playlist.external_urls.spotify, '_blank');
        });
    }

    return tarjeta;
}

// Agrega a una vista una sección con título y sus tarjetas.
// Si no hay tarjetas válidas, no agrega ni el título.
function agregarSeccion(contenedor, tituloTexto, items, funcionTarjeta) {
    const tarjetas = (items || [])
        .filter(item => item)
        .map(item => funcionTarjeta(item))
        .filter(tarjeta => tarjeta !== null);

    if (tarjetas.length === 0) return;

    contenedor.appendChild(crearTituloSeccion(tituloTexto));
    tarjetas.forEach(tarjeta => contenedor.appendChild(tarjeta));
}

// ---------- Sección 8: INICIO — PLAYLISTS POPULARES ----------

const contenedorPlaylists = document.querySelector('#playlists');

function cargarPlaylists() {
    contenedorPlaylists.innerHTML = `
        <div class="perfil-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Cargando playlists...</p>
        </div>
    `;

    fetch('/api/playlists-populares')
        .then(response => response.json())
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

// ---------- Sección 9: BÚSQUEDA + HISTORIAL ----------

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

    fetch(`/api/buscar?q=${encodeURIComponent(texto)}`)
        .then(response => response.json())
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
            if (data.albums) agregarSeccion(vista, 'Álbumes', data.albums.items, crearTarjetaAlbum);
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

btnBuscar.addEventListener('click', ejecutarBusqueda);

inputBuscar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') ejecutarBusqueda();
});

// Muestra las sugerencias cuando el campo recibe foco
inputBuscar.addEventListener('focus', mostrarSugerencias);

// ---------- Sección 10: VISTA DE ÁLBUM ----------

// Pide las canciones de un álbum y las dibuja en la vista Explorar
function cargarAlbum(albumId) {
    mostrarVista('Explorar');
    const vista = document.querySelector('#vista-explorar');

    vista.innerHTML = `
        <div class="loading-container">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Cargando álbum...</p>
        </div>
    `;

    fetch(`/api/album/${albumId}/tracks`)
        .then(response => response.json())
        .then(data => {
            vista.innerHTML = '';

            // Encabezado del álbum
            const encabezado = document.createElement('div');
            encabezado.classList.add('album-encabezado');

            if (data.album.portada) {
                const img = document.createElement('img');
                img.src = data.album.portada;
                img.classList.add('album-portada');
                img.alt = data.album.nombre;
                encabezado.appendChild(img);
            }

            const info = document.createElement('div');
            info.classList.add('album-info');
            info.innerHTML = `
                <p class="album-label">Álbum</p>
                <h2 class="album-nombre">${escaparHTML(data.album.nombre)}</h2>
                <p class="album-artista">${escaparHTML(data.album.artista)}</p>
                <p class="album-meta">${escaparHTML(data.album.total_canciones)} canciones · ${escaparHTML(data.album.fecha)}</p>
            `;
            encabezado.appendChild(info);
            vista.appendChild(encabezado);

            // Botón volver a los resultados de la búsqueda previa
            const btnVolver = document.createElement('button');
            btnVolver.classList.add('btn-volver-busqueda');
            btnVolver.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Volver a resultados';
            btnVolver.addEventListener('click', () => {
                if (ultimaBusqueda) {
                    inputBuscar.value = ultimaBusqueda;
                }
                ejecutarBusqueda();
            });
            vista.appendChild(btnVolver);

            // Lista de canciones
            const lista = document.createElement('div');
            lista.classList.add('album-lista');

            data.tracks.forEach((track, index) => {
                const cancion = document.createElement('div');
                cancion.classList.add('album-cancion');

                const posicion = document.createElement('span');
                posicion.classList.add('album-cancion-numero');
                posicion.textContent = index + 1;
                cancion.appendChild(posicion);

                const infoCancion = document.createElement('div');
                infoCancion.classList.add('album-cancion-info');

                const nombreCancion = document.createElement('p');
                nombreCancion.textContent = track.name;
                infoCancion.appendChild(nombreCancion);

                const artistaCancion = document.createElement('p');
                artistaCancion.textContent = track.artists?.map(a => a.name).join(', ') || 'Desconocido';
                infoCancion.appendChild(artistaCancion);

                cancion.appendChild(infoCancion);

                const duracion = document.createElement('span');
                duracion.classList.add('album-cancion-duracion');
                duracion.textContent = formatearTiempo((track.duration_ms || 0) / 1000);
                cancion.appendChild(duracion);

                if (track.preview_url) {
                    const btnPlayCancion = document.createElement('button');
                    btnPlayCancion.classList.add('album-cancion-play');
                    btnPlayCancion.innerHTML = '<i class="fa-solid fa-play"></i>';
                    btnPlayCancion.addEventListener('click', (e) => {
                        e.stopPropagation();
                        reproducirPreview(
                            track.preview_url,
                            track.name,
                            track.artists?.[0]?.name ?? 'Desconocido',
                            data.album.portada
                        );
                    });
                    cancion.appendChild(btnPlayCancion);
                }

                lista.appendChild(cancion);
            });

            vista.appendChild(lista);
        })
        .catch(error => {
            console.error('Error al cargar álbum:', error);
            vista.innerHTML = `
                <div class="loading-container">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <p>Error al cargar el álbum. Intentá de nuevo.</p>
                </div>
            `;
        });
}

// ---------- Sección 11: BIBLIOTECA — CANCIONES RECIENTES ----------

function cargarCancionesRecientes() {
    const contenedor = document.querySelector('#canciones-recientes');

    contenedor.innerHTML = `
        <div class="perfil-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Cargando tus canciones recientes...</p>
        </div>
    `;

    fetch('/api/canciones')
        .then(response => response.json())
        .then(data => {
            contenedor.innerHTML = '';

            if (!data.items || data.items.length === 0) {
                contenedor.innerHTML = '<p class="sin-resultados">No tenés canciones recientes. Escuchá algo en Spotify primero.</p>';
                return;
            }

            data.items.forEach(item => {
                const tarjeta = crearTarjetaCancion(item.track);
                if (tarjeta) contenedor.appendChild(tarjeta);
            });
        })
        .catch(error => {
            console.error('Error al cargar canciones recientes:', error);
            contenedor.innerHTML = '<p class="sin-resultados">Error al cargar tu biblioteca. Probá de nuevo.</p>';
        });
}

// ---------- Sección 12: PERFIL, TOP ARTISTAS Y TOP TRACKS ----------

// Evita cargar varias veces si el usuario alterna de vista
let perfilCargado = false;
let topArtistasCargado = false;
let topTracksCargado = false;

function cargarPerfilSpotify() {
    if (perfilCargado) return;

    const contenedor = document.querySelector('#perfil-container');

    fetch('/api/perfil')
        .then(response => response.json())
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

    fetch('/api/top-artistas')
        .then(response => response.json())
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

// Tarjeta de top track: reusa crearTarjetaCancion y agrega número + duración
function crearTarjetaTopTrack(track, index) {
    const tarjeta = crearTarjetaCancion(track);
    if (!tarjeta) return null;

    const posicion = document.createElement('span');
    posicion.classList.add('top-track-numero');
    posicion.textContent = `#${index + 1}`;
    tarjeta.insertBefore(posicion, tarjeta.firstChild);

    const duracion = document.createElement('p');
    duracion.classList.add('top-track-duracion');
    duracion.textContent = formatearTiempo((track.duration_ms || 0) / 1000);
    tarjeta.appendChild(duracion);

    return tarjeta;
}

function cargarTopTracks() {
    if (topTracksCargado) return;

    const contenedor = document.querySelector('#top-tracks');
    contenedor.innerHTML = '<div class="perfil-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>';

    fetch('/api/top-tracks')
        .then(response => response.json())
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

// ---------- Sección 13: NAVEGACIÓN (carga perezosa por vista) ----------

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

// ---------- Sección 14: INICIALIZACIÓN ----------

// Carga inicial: playlists del home y estado de favoritos (para los corazones)
cargarPlaylists();
obtenerFavoritos();