# Documentación breve

## Qué hace la aplicación

1. El usuario inicia sesión con Spotify. El backend valida la respuesta OAuth, guarda el token en la sesión y consulta el perfil.
2. El frontend React consume las rutas `/api/*` del backend; el token nunca se expone al navegador.
3. El backend consulta Spotify para búsqueda, perfil, playlists, álbumes y estadísticas.
4. Supabase conserva el usuario, sus tokens renovables y sus canciones favoritas.
5. El reproductor usa las vistas previas públicas que devuelve Spotify; no reproduce el catálogo completo.

## Flujo de autenticación

- `GET /auth/spotify`: crea un `state` aleatorio en la sesión y redirige a Spotify.
- `GET /auth/spotify/callback`: comprueba ese `state`, cambia el `code` por tokens y persiste los datos en Supabase.
- `GET /auth/logout`: destruye la sesión.

Si Supabase falla, el login de Spotify continúa, pero favoritos y renovación persistente de tokens quedan deshabilitados hasta corregir Supabase.

## Rutas API

| Grupo | Propósito |
|---|---|
| `/api/canciones`, `/api/top-*`, `/api/perfil` | Datos personales de Spotify |
| `/api/buscar`, `/api/explorar`, `/api/playlists-*`, `/api/album/*`, `/api/artistas/*` | Catálogo y detalles |
| `/api/favoritos` | Crear, listar y borrar favoritos en Supabase |

Todas las rutas `/api` requieren una sesión de Spotify. Si expira, el frontend recibe `401` y vuelve al login.

La búsqueda acepta términos de hasta 100 caracteres y las llamadas a Spotify tienen un límite de espera de 15 segundos, para evitar solicitudes colgadas.

## Estructura

- `index.js`: servidor Express, OAuth, sesión y proxy seguro a Spotify.
- `lib/supabase.ts`: acceso exclusivo a las tres tablas de Supabase.
- `scripts/`: interfaz React, estado, reproductor y cliente HTTP.
- `supabase/migrations/`: esquema idempotente de la base de datos.

## Operación

Ejecutá `npm run build` para generar `dist/`, luego `npm start` para servir la aplicación. Para desarrollo visual, usá `npm run dev` en paralelo con el backend.

En producción, definí `NODE_ENV=production`: la cookie de sesión se enviará solo por HTTPS. Usá además un almacenamiento persistente de sesiones (Redis o base de datos), porque el almacenamiento en memoria se pierde al reiniciar el servidor.
