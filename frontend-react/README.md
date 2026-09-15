# Frontend React (TS + Tailwind)

Scaffold coexistiendo con `frontend/` legacy. No rompe nada.

- `npm run dev` → http://localhost:5173 (proxy `/api` y `/auth` a `http://127.0.0.1:3000`)
- Backend: `server/index.js` en JS + Supabase (tablas de `server/supabase/migrations/0001_esquema_inicial.sql`, sin cambios).
- Login real: abrir `http://127.0.0.1:3000/pages/login.html`, luego volver a `:5173`.

Mapa con legacy:
- `components/TrackCard.tsx` ← `frontend/scripts/componentes.js`
- `hooks/usePlayer.ts` + `components/Player.tsx` ← `frontend/scripts/reproductor.js`
- `lib/api.ts` ← `frontend/scripts/api.js` (mismos endpoints)
- `pages/*` ← `frontend/scripts/vistas/*`
