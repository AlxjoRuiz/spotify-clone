import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { API } from './api';
import type { FavoritoRow, Track } from './tipos';

// Estado global de favoritos — mismo archivo que estado.js, absorbiendo
// favoritos.js (obtenerFavoritos/guardarFavorito): el Set de ids reemplaza
// a actualizarCorazones() porque React re-renderiza solo.
interface EstadoCtx {
    ids: Set<string>;
    favoritos: FavoritoRow[];
    toggle: (track: Track) => Promise<void>;
    recargar: () => Promise<FavoritoRow[]>;
}

const Ctx = createContext<EstadoCtx>({
    ids: new Set(),
    favoritos: [],
    toggle: async () => {},
    recargar: async () => [],
});

export function FavoritosProvider({ children }: { children: ReactNode }) {
    const [favoritos, setFavoritos] = useState<FavoritoRow[]>([]);
    const ids = useMemo(() => new Set(favoritos.map((f) => f.track_id)), [favoritos]);

    // Trae los favoritos de Supabase (como obtenerFavoritos())
    const recargar = useCallback(async () => {
        try {
            const data = await API.listarFavoritos();
            const filas = data.favoritos || [];
            setFavoritos(filas);
            return filas;
        } catch (error) {
            console.error('Error al cargar favoritos:', error);
            return [];
        }
    }, []);

    // Carga inicial global (como obtenerFavoritos() en main.js)
    useEffect(() => {
        void recargar();
    }, [recargar]);

    // Toggle corazón (como guardarFavorito()): agrega o quita según el estado
    const toggle = useCallback(
        async (track: Track) => {
            const yaEs = ids.has(track.id);
            try {
                if (yaEs) {
                    const data = await API.quitarFavorito(track.id);
                    if (data.ok) setFavoritos((prev) => prev.filter((f) => f.track_id !== track.id));
                } else {
                    const data = await API.agregarFavorito({
                        trackId: track.id,
                        nombre: track.name,
                        artista: track.artists?.[0]?.name ?? 'Desconocido',
                        imagen: track.album?.images?.[0]?.url ?? null,
                        preview: track.preview_url || null,
                    });
                    if (data.ok) {
                        setFavoritos((prev) => [
                            ...prev,
                            {
                                id: `local-${track.id}`,
                                user_profile_id: '',
                                track_id: track.id,
                                track_nombre: track.name,
                                track_artista: track.artists?.[0]?.name ?? 'Desconocido',
                                track_imagen: track.album?.images?.[0]?.url ?? null,
                                track_preview: track.preview_url || null,
                            },
                        ]);
                    }
                }
            } catch (error) {
                console.error('Error al cambiar favorito:', error);
            }
        },
        [ids]
    );

    const value = useMemo(() => ({ ids, favoritos, toggle, recargar }), [ids, favoritos, toggle, recargar]);

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFavoritos(): EstadoCtx {
    return useContext(Ctx);
}
