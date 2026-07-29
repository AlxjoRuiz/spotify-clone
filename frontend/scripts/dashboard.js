const params = new URLSearchParams (window.location.search);
const name = params.get('nombre');
const greeting = document.querySelector('.main-content h1');
greeting.textContent = `¡Hola, ${name}!`;