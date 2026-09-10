// ============================================================
// MAIN — Punto de entrada de la aplicación (script type=module).
// Importa los módulos necesarios, pinta el saludo dinámico y
// ejecuta la carga inicial (playlists + estado de favoritos).
// ============================================================

import { nombreUsuario } from './sesion.js';
import { saludoSegunHora } from './utils.js';
import { obtenerFavoritos } from './favoritos.js';
import { cargarPlaylists } from './vistas/inicio.js';
// Carga los listeners de la barra lateral y del buscador
import { mostrarVista } from './navegacion.js';
import './vistas/busqueda.js';
// Carga los listeners del contenido inicial de Explorar
import './vistas/explorar.js';

// Saludo dinámico del header según la hora
document.querySelector('#greeting').textContent = `${saludoSegunHora()}, ${nombreUsuario}`;

// Carga inicial: playlists del home y estado de favoritos (para los corazones)
cargarPlaylists();
obtenerFavoritos();

// Comienza en la vista Inicio
mostrarVista('Inicio');