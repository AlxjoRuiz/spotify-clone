// Lee los parámetros que vienen después del "?" en la URL actual
const params = new URLSearchParams(window.location.search);

// Extrae específicamente el valor del parámetro "nombre"
const name = params.get('nombre');

// Busca el <h1> que está dentro de .main-content
const greeting = document.querySelector('.main-content h1');

// Reemplaza el texto del <h1> por un saludo con el nombre real
greeting.textContent = `¡Hola, ${name}!`;

// Pide los datos a nuestra propia ruta del servidor (/api/canciones)
fetch('/api/canciones')
    // Cuando llega la respuesta, la convierte de JSON (texto) a un objeto usable en JS
    .then(response => response.json())
    // Ya con los datos listos, recorremos la lista de canciones una por una
    .then(data => {
        data.items.forEach(item => {
            
            const tarjeta = document.createElement('div'); // Crea un <div> nuevo que va a agrupar toda la info de esta canción
            tarjeta.classList.add('tarjeta-cancion'); // Le agrega la clase CSS "tarjeta-cancion", para poder estilarla después

            tarjeta.style.setProperty('--portada-url', `url(${item.track.album.images[0].url})`);           

            const portada = document.createElement('img'); // Crea un elemento <img> nuevo para la portada del álbum
            portada.src = item.track.album.images[0].url; // Le asigna la URL de la portada (images es un array de tamaños distintos)
            tarjeta.appendChild(portada); // Agrega la imagen al main-content

            
            const cancion = document.createElement('p'); // Crea un elemento <p> nuevo, vacío por ahora
            cancion.textContent = item.track.name; // Le pone como texto el nombre de la canción (item.track.name)
            tarjeta.appendChild(cancion); // Busca el main-content y le agrega el <p> recién creado, al final

            
            const artista = document.createElement('p'); // Crea un elemento <p> nuevo para el artista
            artista.textContent = item.track.artists[0].name; // Le pone como texto el nombre del primer artista (artists es un array)
            tarjeta.appendChild(artista); // Agrega el <p> del artista al main-content
           
            document.querySelector('.main-content').appendChild(tarjeta); // Agrega la tarjeta completa al main-content
        });
    })
    .catch(error => console.error('Error al cargar canciones:', error));

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

// Ruta que busca canciones/artistas en Spotify según lo que escriba el usuario
app.get('/api/buscar', async (req, res) => {

    try {
        // Toma el texto que llegó desde el frontend (?q=...)
        const q = req.query.q;

        // Pide a Spotify los resultados de búsqueda (type=track devuelve canciones)
        const data = await pedirASpotify(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=20&market=CO`, req);

        // Devuelve los tracks encontrados
        res.json(data);

    } catch (error) {
        // Si algo falla, avisa sin romper el servidor
        console.error(error.response?.data || error.message);
        res.status(500).json({ error: 'No se pudo buscar' });
    }
});

// --- Buscador de música ---

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

            // Limpia el contenido anterior del dashboard
            const main = document.querySelector('.main-content');
            main.innerHTML = '';

            // Título con lo que se buscó
            const titulo = document.createElement('h2');
            titulo.textContent = `Resultados para: ${texto}`;
            main.appendChild(titulo);

            // Recorre las canciones encontradas y crea una tarjeta para cada una
            data.tracks.items.forEach(track => {

                const tarjeta = document.createElement('div');
                tarjeta.classList.add('tarjeta-cancion');
                tarjeta.style.setProperty('--portada-url', `url(${track.album.images[0].url})`);

                // Portada del álbum
                const portada = document.createElement('img');
                portada.src = track.album.images[0].url;
                tarjeta.appendChild(portada);

                // Nombre de la canción
                const cancion = document.createElement('p');
                cancion.textContent = track.name;
                tarjeta.appendChild(cancion);

                // Artista
                const artista = document.createElement('p');
                artista.textContent = track.artists[0].name;
                tarjeta.appendChild(artista);

                main.appendChild(tarjeta);
            });
        })
        .catch(error => console.error('Error al buscar:', error));
});

// --- Buscador de música ---

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

            // Limpia el contenido anterior del dashboard
            const main = document.querySelector('.main-content');
            main.innerHTML = '';

            // Título con lo que se buscó
            const titulo = document.createElement('h2');
            titulo.textContent = `Resultados para: ${texto}`;
            main.appendChild(titulo);

            // Recorre las canciones encontradas y crea una tarjeta para cada una
            data.tracks.items.forEach(track => {

                const tarjeta = document.createElement('div');
                tarjeta.classList.add('tarjeta-cancion');
                tarjeta.style.setProperty('--portada-url', `url(${track.album.images[0].url})`);

                // Portada del álbum
                const portada = document.createElement('img');
                portada.src = track.album.images[0].url;
                tarjeta.appendChild(portada);

                // Nombre de la canción
                const cancion = document.createElement('p');
                cancion.textContent = track.name;
                tarjeta.appendChild(cancion);

                // Artista
                const artista = document.createElement('p');
                artista.textContent = track.artists[0].name;
                tarjeta.appendChild(artista);

                main.appendChild(tarjeta);
            });
        })
        .catch(error => console.error('Error al buscar:', error));
});