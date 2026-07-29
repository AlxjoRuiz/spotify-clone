// Lee los parámetros que vienen después del "?" en la URL actual
const params = new URLSearchParams(window.location.search);

// Extrae específicamente el valor del parámetro "nombre"
const name = params.get('nombre');

// Busca el <h1> que está dentro de .main-content
const greeting = document.querySelector('.main-content h1');

// Reemplaza el texto del <h1> por un saludo con el nombre real
greeting.textContent = `¡Hola, ${name}!`;