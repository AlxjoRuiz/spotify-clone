# Documentación breve

## Qué hace la aplicación

1. El usuario inicia sesión con Spotify. El backend valida la respuesta OAuth, guarda el token en la sesión y consulta el perfil.
2. El frontend React consume las rutas `/api/*` del backend; el token nunca se expone al navegador.
3. El backend consulta Spotify para búsqueda, perfil, playlists, álbumes y estadísticas.
4. Supabase conserva el usuario, sus tokens renovables y sus canciones favoritas.
5. El reproductor usa el Web Playback SDK (canción completa, requiere Premium); sin Premium, URI o dispositivo usa los previews de 30s como fallback.

Las playlists se abren dentro de esta aplicación. El enlace a Spotify solo se usa cuando un componente lo pide explícitamente.

## Flujo de autenticación

- `GET /auth/spotify`: crea un `state` aleatorio en la sesión y redirige a Spotify.
- `GET /auth/spotify/callback`: comprueba ese `state`, cambia el `code` por tokens y persiste los datos en Supabase.
- `GET /auth/logout`: destruye la sesión.

En local, `localhost` y `127.0.0.1` no comparten cookies. Usá siempre el host registrado en `SPOTIFY_REDIRECT_URI`; la configuración incluida usa `http://127.0.0.1`.

Si Supabase falla, el login de Spotify continúa, pero favoritos y renovación persistente de tokens quedan deshabilitados hasta corregir Supabase.

La renovación del token es bajo demanda (sin cronjobs): `pedirASpotify` reintenta una vez ante un 401 y `/api/token` renueva por expiración. Los tokens se guardan cifrados (AES-256-GCM).

## Rutas API

| Grupo | Propósito |
|---|---|
| `/api/canciones`, `/api/top-*`, `/api/perfil` | Datos personales de Spotify |
| `/api/buscar`, `/api/explorar`, `/api/playlists-*`, `/api/album/*`, `/api/artistas/*` | Catálogo y detalles |
| `/api/favoritos` | Crear, listar y borrar favoritos en Supabase |
| `/api/token`, `/api/player/*` | Token fresco y control de reproducción para el Web Playback SDK |

Los scopes incluyen `streaming` y control del reproductor: después de este cambio hay que volver a iniciar sesión para autorizar los permisos nuevos.

Todas las rutas `/api` requieren una sesión de Spotify. Si expira, el frontend recibe `401` y vuelve al login.

La búsqueda acepta términos de hasta 100 caracteres y las llamadas a Spotify tienen un límite de espera de 15 segundos, para evitar solicitudes colgadas.

## Estructura

| Archivo o carpeta | Responsabilidad |
|---|---|
| `index.js` | Servidor Express: login OAuth, sesión, rutas `/api`, renovación de tokens y archivos compilados. |
| `lib/supabase.ts` | Cliente tipado de Supabase con una función concreta por tabla (users, perfiles, favoritos). |
| `lib/crypto.js` | Cifrado AES-256-GCM de los tokens de Spotify antes de guardarlos en Supabase. |
| `pages/login.html` | Punto de entrada HTML de la pantalla de inicio de sesión. |
| `pages/dashboard.html` | Punto de entrada HTML del dashboard protegido. |
| `scripts/login.tsx` | Interfaz de login y enlace seguro hacia la autorización de Spotify. |
| `scripts/main.tsx` | Monta la aplicación: barra lateral, encabezado, vistas y reproductor. |
| `scripts/api.ts` | Único cliente HTTP del frontend; gestiona errores y sesión expirada. |
| `scripts/sesion.ts` | Nombre mostrado del usuario y cierre de sesión. |
| `scripts/navegacion.tsx` | Estado de vistas, búsquedas y botones atrás/adelante. |
| `scripts/estado.tsx` | Estado global y sincronización de canciones favoritas. |
| `scripts/reproductor.tsx` | Reproductor Web Playback SDK (completo con Premium, fallback a previews), cola con drawer, volumen, aleatorio y repetición. |
| `scripts/componentes.tsx` | Tarjetas, listas de canciones, loaders y mensajes reutilizables. |
| `scripts/vistas/` | Pantallas de Inicio, Explorar, Biblioteca, Perfil, álbum, artista y playlist. |
| `scripts/tipos.ts` | Tipos TypeScript de datos provenientes de Spotify y Supabase. |
| `scripts/utils.ts` | Formateo de tiempos, fechas, duración y valores visuales comunes. |
| `scripts/notificacion.tsx` | Sistema de notificaciones breves (toasts). |
| `styles/index.css` | Estilos globales y utilidades visuales que complementan Tailwind. |
| `vite.config.mts` | Configuración de desarrollo y compilación del frontend con Vite. |
| `supabase/migrations/` | SQL idempotente para crear las tablas y restricciones de Supabase. |
| `.env` | Credenciales locales; nunca se sube al repositorio. |
| `.env.example` | Plantilla pública de variables necesarias para ejecutar el proyecto. |

## Operación

Ejecutá `npm run build` para generar `dist/`, luego `npm start` para servir la aplicación. Para desarrollo visual, usá `npm run dev` en paralelo con el backend.

En producción, definí `NODE_ENV=production`: la cookie de sesión se enviará solo por HTTPS. Usá además un almacenamiento persistente de sesiones (Redis o base de datos), porque el almacenamiento en memoria se pierde al reiniciar el servidor.
