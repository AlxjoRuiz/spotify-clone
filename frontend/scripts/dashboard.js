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

// Pone el saludo en el header
greeting.textContent = `${textoSaludo}`;


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