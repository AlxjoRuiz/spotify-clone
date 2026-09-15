# Frontend React (TS + Tailwind)

Scaffold coexistiendo con `frontend/` legacy. No rompe nada.

- `npm run dev` → http://localhost:5173 (proxy `/api` y `/auth` a `http://127.0.0.1:3000`)
- Backend: `server/index.js` en JS + Supabase (tablas de `supabase/migrations/0001_esquema_inicial.sql`, sin cambios).
- Login real: abrir `http://127.0.0.1:3000/pages/login.html`, luego volver a `:5173`.

Estructura estilo perfumes-web:
```
src/components/layout/  → Sidebar (layout general)
src/components/player/  → Player (reproductor)
src/components/track/   → TrackCard (tarjetas)
src/components/ui/      → Spinner (piezas reutilizables)
src/hooks/              → usePlayer (estado, como lib/cart.ts en perfumes-web)
src/lib/                → api.ts (endpoints), utils.ts (helpers)
src/types/              → spotify.ts (como types/ en perfumes-web)
src/pages/              → Inicio, Explorar, Biblioteca, Perfil
```

Mapa con legacy:
- `components/track/TrackCard.tsx` ← `frontend/scripts/componentes.js`
- `hooks/usePlayer.ts` + `components/player/Player.tsx` ← `frontend/scripts/reproductor.js`
- `lib/api.ts` ← `frontend/scripts/api.js` (mismos endpoints)
- `lib/utils.ts` ← `frontend/scripts/utils.js`
- `pages/*` ← `frontend/scripts/vistas/*`
