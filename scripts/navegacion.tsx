import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

// Navegación — mismo archivo que navegacion.js, con la misma semántica:
// vistas, carga perezosa (la hace cada página al montarse), historial
// atrás/adelante y vista Explorar multifunción (inicial/búsqueda/álbum/playlist).
// Los eventos 'mostrar-vista', 'volver-a-resultados' y 'volver-a-explorar'
// se reemplazan por funciones del contexto (mismo efecto).
export type Vista = 'Inicio' | 'Explorar' | 'Biblioteca' | 'Perfil';

export type ExplorarState =
    | { kind: 'inicial'; nonce: number }
    | { kind: 'busqueda'; texto: string; busquedaId: number }
    | { kind: 'album'; id: string }
    | { kind: 'playlist'; id: string }
    | { kind: 'artista'; id: string; desde: Vista };

interface NavegacionCtx {
    vista: Vista;
    explorar: ExplorarState;
    ultimaBusqueda: string;
    puedeAtras: boolean;
    puedeAdelante: boolean;
    navegar: (v: Vista) => void;
    atras: () => void;
    adelante: () => void;
    buscar: (texto: string) => void;
    abrirAlbum: (id: string) => void;
    abrirPlaylist: (id: string) => void;
    abrirArtista: (id: string) => void;
    volverAResultados: () => void;
}

const Ctx = createContext<NavegacionCtx | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
    const [vista, setVista] = useState<Vista>('Inicio');
    const [explorar, setExplorar] = useState<ExplorarState>({ kind: 'inicial', nonce: 0 });
    const [ultimaBusqueda, setUltimaBusqueda] = useState('');
    // La vista inicial también forma parte del historial: así el primer salto
    // a Explorar/Biblioteca puede volver correctamente a Inicio.
    const [historialAtras, setHistorialAtras] = useState<Vista[]>(['Inicio']);
    const [historialAdelante, setHistorialAdelante] = useState<Vista[]>([]);
    const busquedaIdRef = useRef(0);

    const navegar = useCallback((v: Vista) => {
        setHistorialAtras((prev) => {
            if (prev[prev.length - 1] === v) return prev;
            const next = [...prev, v];
            return next.length > 50 ? next.slice(1) : next;
        });
        setHistorialAdelante([]);
        setVista(v);
    }, []);

    const atras = useCallback(() => {
        setHistorialAtras((prev) => {
            if (prev.length < 2) return prev;
            const actual = prev[prev.length - 1];
            setHistorialAdelante((ad) => [...ad, actual]);
            setVista(prev[prev.length - 2]);
            return prev.slice(0, -1);
        });
    }, []);

    const adelante = useCallback(() => {
        setHistorialAdelante((prev) => {
            const siguiente = prev[prev.length - 1];
            if (!siguiente) return prev;
            setHistorialAtras((at) => [...at, siguiente]);
            setVista(siguiente);
            return prev.slice(0, -1);
        });
    }, []);

    const buscar = useCallback((texto: string) => {
        setUltimaBusqueda(texto);
        busquedaIdRef.current += 1;
        setExplorar({ kind: 'busqueda', texto, busquedaId: busquedaIdRef.current });
        setHistorialAtras((prev) => {
            if (prev[prev.length - 1] === 'Explorar') return prev;
            return [...prev, 'Explorar'];
        });
        setHistorialAdelante([]);
        setVista('Explorar');
    }, []);

    const abrirAlbum = useCallback((id: string) => {
        setExplorar({ kind: 'album', id });
        setVista('Explorar');
    }, []);

    const abrirPlaylist = useCallback((id: string) => {
        setExplorar({ kind: 'playlist', id });
        setVista('Explorar');
    }, []);

    // Abre el detalle de artista recordando desde qué vista vino (para volver)
    const abrirArtista = useCallback(
        (id: string) => {
            setExplorar({ kind: 'artista', id, desde: vista });
            setVista('Explorar');
        },
        [vista]
    );

    const volverAResultados = useCallback(() => {
        if (!ultimaBusqueda) {
            // Como 'volver-a-explorar': recarga el contenido inicial
            setExplorar((e) =>
                e.kind === 'inicial' ? { kind: 'inicial', nonce: e.nonce + 1 } : { kind: 'inicial', nonce: 0 }
            );
            setVista('Explorar');
            return;
        }
        buscar(ultimaBusqueda);
    }, [ultimaBusqueda, buscar]);

    const value = useMemo<NavegacionCtx>(
        () => ({
            vista,
            explorar,
            ultimaBusqueda,
            puedeAtras: historialAtras.length >= 2,
            puedeAdelante: historialAdelante.length > 0,
            navegar,
            atras,
            adelante,
            buscar,
            abrirAlbum,
            abrirPlaylist,
            abrirArtista,
            volverAResultados,
        }),
        [
            vista,
            explorar,
            ultimaBusqueda,
            historialAtras,
            historialAdelante,
            navegar,
            atras,
            adelante,
            buscar,
            abrirAlbum,
            abrirPlaylist,
            abrirArtista,
            volverAResultados,
        ]
    );

    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNav(): NavegacionCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useNav fuera de NavProvider');
    return ctx;
}
