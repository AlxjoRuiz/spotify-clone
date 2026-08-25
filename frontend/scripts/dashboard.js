// USUARIO: leer nombre desde URL (Spotify) o localStorage
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

// CERRAR SESIÓN
const btnLogout = document.querySelector('#btn-logout');

btnLogout.addEventListener('click', () => {
    window.location.href = '/auth/logout';
});


// SALUDO DINÁMICO SEGÚN LA HORA
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



// SISTEMA DE VISTAS DEL SIDEBAR
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

// REPRODUCTOR PERSONALIZADO
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
const tiempoTotal = document.querySelector('#tiempo-total');

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


// EVENTOS DEL REPRODUCTOR
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
    tiempoTotal.textContent = formatearTiempo(audio.duration || 0);
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

// INICIO: PLAYLISTS POPULARES
// Muestra un spinner mientras carga las playlists
const contenedorPlaylists = document.querySelector('#playlists');
contenedorPlaylists.innerHTML = `
    <div class="loading-container">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <p>Cargando playlists...</p>
    </div>
`;

// Pide las playlists populares y las dibuja en la sección "Para empezar"
fetch('/api/playlists-populares')
    .then(response => response.json())
    .then(data => {
        // Limpia el spinner
        contenedorPlaylists.innerHTML = '';

        // Si no hay playlists, muestra un mensaje
        if (!data.playlists || data.playlists.length === 0) {
            contenedorPlaylists.innerHTML = '<p class="sin-resultados">No se encontraron playlists.</p>';
            return;
        }

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
            contenedorPlaylists.appendChild(tarjeta);
        });
    })
    .catch(error => {
        console.error('Error al cargar playlists:', error);
        contenedorPlaylists.innerHTML = '<p class="sin-resultados">Error al cargar las playlists.</p>';
    });

// EXPLORAR: BUSCADOR DE MÚSICA
// Toma el input y el button del sidebar
const inputBuscar = document.querySelector('#input-buscar');
const btnBuscar = document.querySelector('#btn-buscar');

// Crea el título de una sección (Canciones, Artistas, etc.) y lo devuelve
function crearTituloSeccion(texto) {
    const titulo = document.createElement('h3');
    titulo.classList.add('seccion-titulo');
    titulo.textContent = texto;
    return titulo;
}

// Crea una tarjeta de artista (imagen circular, abre Spotify al click)
function crearTarjetaArtista(artista) {
    if (!artista.images || artista.images.length === 0) return null;

    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-cancion', 'tarjeta-artista');
    tarjeta.style.setProperty('--portada-url', `url(${artista.images[0].url})`);

    // Foto del artista
    const portada = document.createElement('img');
    portada.src = artista.images[0].url;
    tarjeta.appendChild(portada);

    // Nombre del artista
    const nombre = document.createElement('p');
    nombre.textContent = artista.name;
    tarjeta.appendChild(nombre);

    // Tipo de contenido (queda como subtítulo gris)
    const tipo = document.createElement('p');
    tipo.textContent = 'Artista';
    tarjeta.appendChild(tipo);

    // CUANDO CLICKEAN: abre el artista en Spotify
    tarjeta.addEventListener('click', () => {
        window.open(artista.external_urls.spotify, '_blank');
    });

    return tarjeta;
}

// Crea una tarjeta de álbum (abre Spotify al click)
function crearTarjetaAlbum(album) {
    if (!album.images || album.images.length === 0) return null;

    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-cancion');
    tarjeta.style.setProperty('--portada-url', `url(${album.images[0].url})`);

    // Portada del álbum
    const portada = document.createElement('img');
    portada.src = album.images[0].url;
    tarjeta.appendChild(portada);

    // Nombre del álbum
    const nombre = document.createElement('p');
    nombre.textContent = album.name;
    tarjeta.appendChild(nombre);

    // Artista principal del álbum
    const artista = document.createElement('p');
    artista.textContent = album.artists[0].name;
    tarjeta.appendChild(artista);

    // CUANDO CLICKEAN: abre el álbum en Spotify
    tarjeta.addEventListener('click', () => {
        window.open(album.external_urls.spotify, '_blank');
    });

    return tarjeta;
}

// Crea una tarjeta de playlist (abre Spotify al click)
function crearTarjetaPlaylist(playlist) {
    if (!playlist.images || playlist.images.length === 0) return null;

    const tarjeta = document.createElement('div');
    tarjeta.classList.add('tarjeta-cancion');
    tarjeta.style.setProperty('--portada-url', `url(${playlist.images[0].url})`);

    // Portada de la playlist
    const portada = document.createElement('img');
    portada.src = playlist.images[0].url;
    tarjeta.appendChild(portada);

    // Nombre de la playlist
    const nombre = document.createElement('p');
    nombre.textContent = playlist.name;
    tarjeta.appendChild(nombre);

    // Dueño de la playlist
    const dueno = document.createElement('p');
    dueno.textContent = playlist.owner.display_name;
    tarjeta.appendChild(dueno);

    // CUANDO CLICKEAN: abre la playlist en Spotify
    tarjeta.addEventListener('click', () => {
        window.open(playlist.external_urls.spotify, '_blank');
    });

    return tarjeta;
}

// Agrega a la vista una sección con título y sus tarjetas
// Si no hay tarjetas para mostrar, no agrega nada (ni el título)
function agregarSeccion(vista, tituloTexto, items, funcionTarjeta) {

    // Crea las tarjetas válidas (Spotify a veces devuelve items nulos o sin imagen)
    const tarjetas = items.filter(item => item)
        .map(item => funcionTarjeta(item))
        .filter(tarjeta => tarjeta !== null);

    // Si ninguna tarjeta se pudo crear, sale sin agregar nada
    if (tarjetas.length === 0) return;

    // Agrega el título de la sección
    vista.appendChild(crearTituloSeccion(tituloTexto));

    // Agrega las tarjetas una por una
    tarjetas.forEach(tarjeta => vista.appendChild(tarjeta));
}

// Cuando hacen click en Buscar O presionan Enter
function ejecutarBusqueda() {
    // Toma el texto que escribió el usuario
    const texto = inputBuscar.value.trim();

    // Si no escribió nada, no hace nada
    if (!texto) return;

    // Muestra un spinner mientras busca
    const vista = document.querySelector('#vista-explorar');
    vista.innerHTML = `
        <div class="loading-container">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Buscando "${texto}"...</p>
        </div>
    `;

    // Muestra la vista de explorar con el spinner
    linksSidebar.forEach(l => l.classList.remove('activo'));
    document.querySelectorAll('.vista').forEach(v => v.classList.remove('activa'));
    vista.classList.add('activa');

    // Pide a nuestra API que busque en Spotify
    fetch(`/api/buscar?q=${encodeURIComponent(texto)}`)
        .then(response => response.json())
        .then(data => {

            // Limpia el spinner
            vista.innerHTML = '';

            // Título con lo que se buscó
            const titulo = document.createElement('h2');
            titulo.classList.add('vista-titulo');
            titulo.textContent = `Resultados para: "${texto}"`;
            vista.appendChild(titulo);

            // Agrega cada sección solo si tiene resultados
            if (data.tracks) agregarSeccion(vista, 'Canciones', data.tracks.items, crearTarjetaCancion);
            if (data.artists) agregarSeccion(vista, 'Artistas', data.artists.items, crearTarjetaArtista);
            if (data.albums) agregarSeccion(vista, 'Álbumes', data.albums.items, crearTarjetaAlbum);
            if (data.playlists) agregarSeccion(vista, 'Playlists', data.playlists.items, crearTarjetaPlaylist);

            // Si no apareció ninguna tarjeta en toda la vista, muestra un mensaje
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

// Click en el botón Buscar
btnBuscar.addEventListener('click', ejecutarBusqueda);

// Presionar Enter en el input de búsqueda
inputBuscar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        ejecutarBusqueda();
    }
});



// BIBLIOTECA: CANCIONES RECIENTES
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

    // Muestra spinner mientras carga
    contenedor.innerHTML = `
        <div class="loading-container">
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
                const track = item.track;
                const tarjeta = crearTarjetaCancion(track);
                if (tarjeta) {
                    contenedor.appendChild(tarjeta);
                }
            });
        })
        .catch(error => {
            console.error('Error al cargar canciones recientes:', error);
            contenedor.innerHTML = '<p class="sin-resultados">Error al cargar tu biblioteca. Probá de nuevo.</p>';
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
            cargarPerfilSpotify();
            cargarTopArtistas();
        }
    });
});


// PERFIL: datos reales del usuario desde Spotify
// Evita cargar el perfil múltiples veces
let perfilCargado = false;

// Pide los datos del perfil a nuestro servidor (que a su vez pide a Spotify)
// y los dibuja en la vista de perfil
function cargarPerfilSpotify() {
    // Si ya se cargó antes, no vuelve a pedir (evita requests innecesarios)
    if (perfilCargado) return;

    const contenedor = document.querySelector('#perfil-container');

    fetch('/api/perfil')
        .then(response => response.json())
        .then(perfil => {
            // Marca como cargado para no volver a pedir
            perfilCargado = true;

            // Construye el HTML del perfil con los datos reales
            contenedor.innerHTML = `
                <!-- Avatar: foto de Spotify o icono por defecto -->
                <div class="perfil-avatar">
                    ${perfil.imagen
                        ? `<img src="${perfil.imagen}" alt="Foto de perfil">`
                        : '<i class="fa-solid fa-user"></i>'}
                </div>

                <!-- Nombre de usuario -->
                <div class="perfil-info">
                    <p class="perfil-label">Nombre de usuario</p>
                    <p class="perfil-nombre">${perfil.nombre}</p>
                </div>

                <!-- Email -->
                <div class="perfil-info">
                    <p class="perfil-label">Email</p>
                    <p class="perfil-dato">${perfil.email}</p>
                </div>

                <!-- Tipo de cuenta (Free o Premium) -->
                <div class="perfil-info">
                    <p class="perfil-label">Tipo de cuenta</p>
                    <p class="perfil-dato ${perfil.tipo_cuenta === 'premium' ? 'premium' : ''}">
                        ${perfil.tipo_cuenta === 'premium' ? 'Premium' : 'Free'}
                    </p>
                </div>

                <!-- País -->
                <div class="perfil-info">
                    <p class="perfil-label">País</p>
                    <p class="perfil-dato">${perfil.pais}</p>
                </div>

                <!-- Seguidores -->
                <div class="perfil-info">
                    <p class="perfil-label">Seguidores</p>
                    <p class="perfil-dato">${perfil.seguidores.toLocaleString()}</p>
                </div>

                <!-- Conectado con -->
                <div class="perfil-info">
                    <p class="perfil-label">Conectado con</p>
                    <p class="perfil-dato">Spotify</p>
                </div>
            `;

            // También actualiza la imagen en el header si el usuario tiene foto
            if (perfil.imagen) {
                const headerPerfil = document.querySelector('.header .perfil');
                // Solo agrega la imagen si no existe ya
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
            // Si falla, muestra un perfil básico con el nombre que ya tenemos
            contenedor.innerHTML = `
                <div class="perfil-avatar">
                    <i class="fa-solid fa-user"></i>
                </div>
                <div class="perfil-info">
                    <p class="perfil-label">Nombre de usuario</p>
                    <p class="perfil-nombre">${nombreUsuario}</p>
                </div>
                <div class="perfil-info">
                    <p class="perfil-label">Conectado con</p>
                    <p class="perfil-dato">Spotify</p>
                </div>
                <p class="sin-resultados">No se pudieron cargar los datos del perfil.</p>
            `;
        });
}


// TOP ARTISTAS: artistas más escuchados
let topArtistasCargado = false;
// Bandera que indica si ya se cargaron los artistas.
// Evita hacer requests repetidos si el usuario hace clickear "Perfil" varias veces.


function cargarTopArtistas() {

    // Si ya se cargaron antes, no vuelve a pedir
    if (topArtistasCargado) return;

    // Referencia al contenedor donde van las tarjetas
    const contenedor = document.querySelector('#top-artistas');

    // Muestra un spinner de carga mientras llegan los datos
    contenedor.innerHTML = '<div class="perfil-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>';


    // Pide los artistas al servidor (que a su vez pide a Spotify)
    fetch('/api/top-artistas')
        .then(response => response.json())  // Convierte la respuesta a objeto JS
        .then(data => {

            // Marca como cargado para no volver a pedir
            topArtistasCargado = true;

            // Si no hay artistas (usuario nuevo), muestra un mensaje
            if (!data.items || data.items.length === 0) {
                contenedor.innerHTML = '<p class="sin-resultados">Todavía no tenés suficientes datos de escucha.</p>';
                return;
            }

            // Limpia el spinner
            contenedor.innerHTML = '';


            // Recorre cada artista y crea una tarjeta
            data.items.forEach(artista => {

                // Salta artistas sin imagen
                if (!artista.images || artista.images.length === 0) return;


                // Crea la tarjeta con el efecto hover (degradado)
                const tarjeta = document.createElement('div');
                tarjeta.classList.add('tarjeta-cancion', 'tarjeta-artista');
                tarjeta.style.setProperty('--portada-url', `url(${artista.images[0].url})`);


                // Foto del artista
                const portada = document.createElement('img');
                portada.src = artista.images[0].url;
                portada.alt = artista.name;
                tarjeta.appendChild(portada);


                // Nombre del artista
                const nombre = document.createElement('p');
                nombre.textContent = artista.name;
                tarjeta.appendChild(nombre);


                // Géneros musicales (máximo 2)
                const generos = document.createElement('p');
                generos.textContent = artista.genres.slice(0, 2).join(', ') || 'Artista';
                tarjeta.appendChild(generos);


                // Click: abre el artista en Spotify
                tarjeta.addEventListener('click', () => {
                    window.open(artista.external_urls.spotify, '_blank');
                });


                contenedor.appendChild(tarjeta);
            });
        })
        .catch(error => {
            console.error('Error al cargar top artistas:', error);
            contenedor.innerHTML = '<p class="sin-resultados">Error al cargar los artistas.</p>';
        });


    // También carga las canciones favoritas en paralelo
    cargarTopTracks();
    // Ambas funciones se ejecutan al mismo tiempo, más rápido que una tras otra
}

// TOP TRACKS: canciones más escuchadas
// Bandera para no cargar los datos dos veces si el usuario hace clickear
// "Perfil" varias veces seguidas
let topTracksCargado = false;

// Función que pide las top tracks al servidor y las dibuja en pantalla
function cargarTopTracks() {

    // Si ya se cargaron antes, no vuelve a pedir (evita requests innecesarios)
    if (topTracksCargado) return;

    // Referencia al contenedor donde van las tarjetas
    const contenedor = document.querySelector('#top-tracks');

    // Muestra un spinner mientras carga (feedback visual al usuario)
    contenedor.innerHTML = '<div class="perfil-loading"><i class="fa-solid fa-spinner fa-spin"></i></div>';

    // Pide los datos a nuestro servidor (que a su vez pide a Spotify)
    fetch('/api/top-tracks')
        .then(response => response.json())  // Convierte la respuesta a objeto JavaScript
        .then(data => {
            topTracksCargado = true;  // Marca como cargado para no repetir

            // Si no hay tracks (usuario nuevo o sin historial), muestra un mensaje
            if (!data.items || data.items.length === 0) {
                contenedor.innerHTML = '<p class="sin-resultados">Todavía no tenés suficientes datos de escucha.</p>';
                return;
            }

            contenedor.innerHTML = '';  // Limpia el spinner

            // Recorre cada canción del array y crea una tarjeta visual
            data.items.forEach((track, index) => {

                // Salta canciones sin imagen (Spotify a veces devuelve null)
                if (!track.album || !track.album.images || track.album.images.length === 0) return;

                // --- CREAR LA TARJETA ---
                const tarjeta = document.createElement('div');
                tarjeta.classList.add('tarjeta-cancion');  // Misma clase CSS que las demás tarjetas
                tarjeta.style.setProperty('--portada-url', `url(${track.album.images[0].url})`);

                // --- NÚMERO DE POSICIÓN (#1, #2, #3...) ---
                const posicion = document.createElement('span');
                posicion.classList.add('top-track-numero');
                posicion.textContent = `#${index + 1}`;  // index empieza en 0, sumamos 1
                tarjeta.appendChild(posicion);

                // --- PORTADA ---
                const portada = document.createElement('img');
                portada.src = track.album.images[0].url;  // images[0] = la más grande
                tarjeta.appendChild(portada);

                // --- BOTÓN DE PLAY ---
                const btnPlay = document.createElement('button');
                btnPlay.classList.add('btn-play');
                btnPlay.innerHTML = '<i class="fa-solid fa-play"></i>';
                tarjeta.appendChild(btnPlay);

                // Al hacer clickear: reproduce el preview de 30 segundos
                btnPlay.addEventListener('click', () => {
                    reproducirPreview(
                        track.preview_url,          // URL del preview (30 seg)
                        track.name,                 // Nombre de la canción
                        track.artists[0].name,      // Nombre del artista principal
                        track.album.images[0].url   // URL de la portada
                    );
                    // reproducirPreview() es una función que ya existe en dashboard.js
                    // Se encarga de agregar la canción a la cola y reproducirla
                });

                // --- NOMBRE DE LA CANCIÓN ---
                const nombre = document.createElement('p');
                nombre.textContent = track.name;
                tarjeta.appendChild(nombre);

                // --- ARTISTA(S) ---
                // track.artists es un array porque una canción puede tener varios artistas
                // .map() transforma cada artista en su nombre
                // .join(', ') une los nombres con coma (ej: "Bad Bunny, J Balvin")
                const artista = document.createElement('p');
                artista.textContent = track.artists.map(a => a.name).join(', ');
                tarjeta.appendChild(artista);

                // --- DURACIÓN ---
                // Spotify da la duración en milisegundos, convertimos a minutos:segundos
                const duracion = document.createElement('p');
                duracion.classList.add('top-track-duracion');
                const mins = Math.floor(track.duration_ms / 60000);          // 60000ms = 1 min
                const secs = Math.floor((track.duration_ms % 60000) / 1000); // % saca los minutos, /1000 convierte a seg
                duracion.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`; // Formato "3:05" no "3:5"
                tarjeta.appendChild(duracion);

                // Agrega la tarjeta completa al contenedor
                contenedor.appendChild(tarjeta);
            });
        })
        .catch(error => {
            // Si falla la petición (token vencido, error de red, etc.)
            console.error('Error al cargar top tracks:', error);
            contenedor.innerHTML = '<p class="sin-resultados">Error al cargar las canciones.</p>';
        });
}

