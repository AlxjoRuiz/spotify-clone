// ========================================
// USUARIO: leer nombre desde URL (Spotify) o localStorage
// ========================================

// Intenta tomar el nombre de la URL (lo manda el servidor tras login con Spotify)
const params = new URLSearchParams(window.location.search);
let nombreUsuario = params.get('nombre');

// Si no viene en la URL, intenta desde localStorage (login de desarrollo)
if (!nombreUsuario) {
    nombreUsuario = localStorage.getItem('usuario_nombre');
}

// Si no hay nombre en ningún lado (no se logueó), manda al login
if (!nombreUsuario) {
    window.location.href = 'login.html';
}

// Limpia la URL para que no se vea ?nombre=... en la barra de direcciones
if (params.get('nombre')) {
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Muestra el nombre en el perfil del header
document.querySelector('#nombre-perfil').textContent = nombreUsuario;


// ========================================
// CERRAR SESIÓN
// ========================================

const btnLogout = document.querySelector('#btn-logout');

btnLogout.addEventListener('click', () => {
    window.location.href = '/auth/logout';
});


// ========================================
// SALUDO DINÁMICO SEGÚN LA HORA
// ========================================

// Elemento del saludo en el header
const greeting = document.querySelector('#greeting');

// Calcula la hora actual
const hora = new Date().getHours();

// Elige el saludo según el momento del día
let textoSaludo = '¡Hola!';
if (hora >= 6 && hora < 12) {
    textoSaludo = 'Buenos días';
} else if (hora >= 12 && hora < 20) {
    textoSaludo = 'Buenas tardes';
} else {
    textoSaludo = 'Buenas noches';
}

// Pone el saludo en el header con el nombre del usuario
greeting.textContent = `${textoSaludo}, ${nombreUsuario}`;


// ========================================
// SISTEMA DE VISTAS DEL SIDEBAR
// ========================================

// Toma todos los links del sidebar
const linksSidebar = document.querySelectorAll('.sidebar a');

// Toma todas las vistas (secciones del main)
const vistas = document.querySelectorAll('.vista');

// Agrega un click a cada link del sidebar
linksSidebar.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault(); // evita que salte el #

        // Quita la clase activa de todos los links
        linksSidebar.forEach(l => l.classList.remove('activo'));
        // Pone activa la del link que clickearon
        link.classList.add('activo');

        // Oculta todas las vistas
        vistas.forEach(v => v.classList.remove('activa'));

        // Muestra la vista que corresponde según el texto del link
        const texto = link.textContent.trim();
        if (texto === 'Inicio') {
            document.querySelector('#vista-inicio').classList.add('activa');
        } else if (texto === 'Explorar') {
            document.querySelector('#vista-explorar').classList.add('activa');
        } else if (texto === 'Biblioteca') {
            document.querySelector('#vista-biblioteca').classList.add('activa');
        } else if (texto === 'Perfil') {
            document.querySelector('#vista-perfil').classList.add('activa');
        }
    });
});


// ========================================
// REPRODUCTOR PERSONALIZADO
// ========================================

// Elementos del reproductor
const audio = document.querySelector('#audio-control');
const reproPortada = document.querySelector('#reproductor-portada');
const reproNombre = document.querySelector('#reproductor-nombre');
const reproArtista = document.querySelector('#reproductor-artista');

// Botones de control
const btnPlay = document.querySelector('#btn-play');
const btnAnterior = document.querySelector('#btn-anterior');
const btnSiguiente = document.querySelector('#btn-siguiente');
const btnVolumen = document.querySelector('#btn-volumen');

// Barra de progreso y tiempo
const barraProgreso = document.querySelector('#barra-progreso');
const tiempoActual = document.querySelector('#tiempo-actual');
const tiempoTiempoTotal = document.querySelector('#tiempo-total');

// Barra de volumen
const barraVolumen = document.querySelector('#barra-volumen');

// Cola de canciones para siguiente/anterior
let colaCanciones = [];
let indiceActual = -1;

// Formatea segundos a formato mm:ss
function formatearTiempo(segundos) {
    const mins = Math.floor(segundos / 60);
    const secs = Math.floor(segundos % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Actualiza la info que se muestra en el reproductor
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

// Reproduce una canción específica de la cola por su índice
function reproducirPorIndice(indice) {
    if (indice < 0 || indice >= colaCanciones.length) return;

    indiceActual = indice;
    const cancion = colaCanciones[indice];

    if (!cancion.previewUrl) {
        alert('Esta canción no tiene preview disponible');
        return;
    }

    audio.src = cancion.previewUrl;
    audio.play();
    actualizarInfoReproductor(cancion.nombre, cancion.artista, cancion.portada);
    actualizarIconoPlay(true);
}

// Agrega una canción a la cola y la reproduce (para cuando clickean una tarjeta)
function reproducirPreview(previewUrl, nombre, artista, portada) {
    if (!previewUrl) {
        alert('Esta canción no tiene preview disponible');
        return;
    }

    // Si la canción ya está en la cola, reproduce esa
    const indiceExistente = colaCanciones.findIndex(c => c.previewUrl === previewUrl);
    if (indiceExistente !== -1) {
        reproducirPorIndice(indiceExistente);
        return;
    }

    // Si no está, la agrega al final de la cola y la reproduce
    colaCanciones.push({ previewUrl, nombre, artista, portada });
    reproducirPorIndice(colaCanciones.length - 1);
}

// ========================================
// EVENTOS DEL REPRODUCTOR
// ========================================

// Play / Pausa
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

// Canción anterior
btnAnterior.addEventListener('click', () => {
    if (indiceActual > 0) {
        reproducirPorIndice(indiceActual - 1);
    }
});

// Canción siguiente
btnSiguiente.addEventListener('click', () => {
    if (indiceActual < colaCanciones.length - 1) {
        reproducirPorIndice(indiceActual + 1);
    }
});

// Cuando el audio actualiza el tiempo, mueve la barra
audio.addEventListener('timeupdate', () => {
    const porcentaje = (audio.currentTime / audio.duration) * 100 || 0;
    barraProgreso.value = porcentaje;
    tiempoActual.textContent = formatearTiempo(audio.currentTime);
});

// Cuando el audio carga su duración total
audio.addEventListener('loadedmetadata', () => {
    tiempoTiempoTotal.textContent = formatearTiempo(audio.duration || 0);
});

// Cuando termina una canción, pasa a la siguiente
audio.addEventListener('ended', () => {
    if (indiceActual < colaCanciones.length - 1) {
        reproducirPorIndice(indiceActual + 1);
    } else {
        actualizarIconoPlay(false);
    }
});

// Cuando el usuario mueve la barra de progreso
barraProgreso.addEventListener('input', () => {
    const nuevoTiempo = (barraProgreso.value / 100) * audio.duration;
    audio.currentTime = nuevoTiempo;
});

// Control de volumen
barraVolumen.addEventListener('input', () => {
    audio.volume = barraVolumen.value / 100;
    actualizarIconoVolumen();
});

// Silenciar / Activar sonido
btnVolumen.addEventListener('click', () => {
    audio.muted = !audio.muted;
    actualizarIconoVolumen();
});

// Cambia el icono del volumen según el estado
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

// Volumen inicial al 70%
audio.volume = 0.7;


// ========================================
// INICIO: PLAYLETS POPULARES
// ========================================

// Pide las playlists populares y las dibuja en la sección "Para empezar"
fetch('/api/playlists-populares')
    // Convierte la respuesta de JSON a objeto
    .then(response => response.json())
    .then(data => {
        // Recorre cada playlist y crea una tarjeta
        data.playlists.forEach(playlist => {

            // Si la playlist viene sin imagen, la salteamos (no rompe el resto)
            if (!playlist.images || playlist.images.length === 0) return;

            // Crea la tarjeta (misma clase CSS que las canciones recientes)
            const tarjeta = document.createElement('div');
            tarjeta.classList.add('tarjeta-cancion');
            tarjeta.style.setProperty('--portada-url', `url(${playlist.images[0].url})`);

            // Portada de la playlist
            const portada = document.createElement('img');
            portada.src = playlist.images[0].url;
            tarjeta.appendChild(portada);

            // Botón de play (aparece al hover gracias al CSS)
            const btnPlay = document.createElement('button');
            btnPlay.classList.add('btn-play');
            btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
            tarjeta.appendChild(btnPlay);

            // CUANDO CLICKEAN: abre la playlist en Spotify (no tiene preview)
            btnPlay.addEventListener('click', () => {
                window.open(playlist.external_urls.spotify, '_blank');
            });

            // Nombre de la playlist
            const nombre = document.createElement('p');
            nombre.textContent = playlist.name;
            tarjeta.appendChild(nombre);

            // Dueño de la playlist
            const dueno = document.createElement('p');
            dueno.textContent = playlist.owner.display_name;
            tarjeta.appendChild(dueno);

            // Agrega la tarjeta al contenedor de playlists
            document.querySelector('#playlists').appendChild(tarjeta);
        });
    })
    .catch(error => console.error('Error al cargar playlists:', error));


// ========================================
// EXPLORAR: BUSCADOR DE MÚSICA
// ========================================

// Toma el input y el button del sidebar
const inputBuscar = document.querySelector('#input-buscar');
const btnBuscar = document.querySelector('#btn-buscar');

// Cuando hacen click en Buscar
btnBuscar.addEventListener('click', () => {

    // Toma el texto que escribió el usuario
    const texto = inputBuscar.value.trim();

    // Si no escribió nada, no hace nada
    if (!texto) return;

    // Pide a nuestra API que busque en Spotify
    fetch(`/api/buscar?q=${encodeURIComponent(texto)}`)
        .then(response => response.json())
        .then(data => {

            // Toma la vista de explorar y la limpia
            const vista = document.querySelector('#vista-explorar');
            vista.innerHTML = '';

            // Título con lo que se buscó
            const titulo = document.createElement('h2');
            titulo.classList.add('vista-titulo');
            titulo.textContent = `Resultados para: ${texto}`;
            vista.appendChild(titulo);

            // Recorre las canciones encontradas y crea una tarjeta para cada una
            data.tracks.items.forEach(track => {

                const tarjeta = document.createElement('div');
                tarjeta.classList.add('tarjeta-cancion');
                tarjeta.style.setProperty('--portada-url', `url(${track.album.images[0].url})`);

                // Portada del álbum
                const portada = document.createElement('img');
                portada.src = track.album.images[0].url;
                tarjeta.appendChild(portada);

                // Botón de play
                const btnPlay = document.createElement('button');
                btnPlay.classList.add('btn-play');
                btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
                tarjeta.appendChild(btnPlay);

                // CUANDO CLICKEAN EL BOTÓN: reproduce el preview de 30s
                btnPlay.addEventListener('click', () => {
                    reproducirPreview(track.preview_url, track.name, track.artists[0].name, track.album.images[0].url);
                });

                // Nombre de la canción
                const cancion = document.createElement('p');
                cancion.textContent = track.name;
                tarjeta.appendChild(cancion);

                // Artista
                const artista = document.createElement('p');
                artista.textContent = track.artists[0].name;
                tarjeta.appendChild(artista);

                vista.appendChild(tarjeta);
            });

            // Muestra la vista de explorar
            linksSidebar.forEach(l => l.classList.remove('activo'));
            document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
            document.querySelector('#vista-explorar').classList.add('activa');
        })
        .catch(error => console.error('Error al buscar:', error));
});


// ========================================
// BIBLIOTECA: CANCIONES RECIENTES
// ========================================

// Crea una tarjeta de canción y la devuelve como elemento
function crearTarjetaCancion(track) {
    if (!track.album || !track.album.images || track.album.images.length === 0) return null;

    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-cancion');
    tarjeta.style.setProperty('--portada-url', `url(${track.album.images[0].url})`);

    const portada = document.createElement('img');
    portada.src = track.album.images[0].url;
    tarjeta.appendChild(portada);

    const btnPlay = document.createElement('button');
    btnPlay.classList.add('btn-play');
    btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
    tarjeta.appendChild(btnPlay);

    btnPlay.addEventListener('click', () => {
        reproducirPreview(track.preview_url, track.name, track.artists[0].name, track.album.images[0].url);
    });

    const cancion = document.createElement('p');
    cancion.textContent = track.name;
    tarjeta.appendChild(cancion);

    const artista = document.createElement('p');
    artista.textContent = track.artists[0].name;
    tarjeta.appendChild(artista);

    return tarjeta;
}

// Pide las canciones recientes y las dibuja en la vista biblioteca
function cargarCancionesRecientes() {
    const contenedor = document.querySelector('#canciones-recientes');

    fetch('/api/canciones')
        .then(response => response.json())
        .then(data => {
            contenedor.innerHTML = '';

            if (!data.items || data.items.length === 0) {
                contenedor.innerHTML = '<p>No tenés canciones recientes.</p>';
                return;
            }

            data.items.forEach(item => {
                const track = item.track;
                const tarjeta = crearTarjetaCancion(track);
                if (tarjeta) {
                    contenedor.appendChild(tarjeta);
                }
            });
        })
        .catch(error => {
            console.error('Error al cargar canciones recientes:', error);
            contenedor.innerHTML = '<p>Error al cargar tu biblioteca. Probá de nuevo.</p>';
        });
}

// Carga las canciones recientes solo cuando se hace click en Biblioteca
document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', () => {
        const textoLink = link.textContent.trim();

        if (textoLink === 'Biblioteca') {
            cargarCancionesRecientes();
        }

        if (textoLink === 'Perfil') {
            document.querySelector('#perfil-nombre').textContent = nombreUsuario;
        }
    });
});
