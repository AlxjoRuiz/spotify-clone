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
    });