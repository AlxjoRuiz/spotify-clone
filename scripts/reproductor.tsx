import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useToast } from './notificacion';
import { useFavoritos } from './estado';
import { formatearTiempo } from './utils';
import type { Track } from './tipos';

// Reproductor — mismo archivo que reproductor.js: cola, play/pausa,
// anterior/siguiente, shuffle, repeat (lista/una), volumen, progreso,
// atajo Espacio y corazón "me gusta". La lógica vive en PlayerProvider;
// la barra (maquetado de dashboard.html) es el componente Reproductor,
// que se renderiza dentro del grid en main.tsx.
export interface ColaItem {
    previewUrl: string;
    nombre: string;
    artista: string;
    portada?: string;
    trackId?: string;
}

type ModoRepetir = 'off' | 'lista' | 'una';

interface ReproductorCtx {
    actual: ColaItem | null;
    reproduciendo: boolean;
    reproducirPreview: (previewUrl: string, nombre: string, artista: string, portada?: string, trackId?: string) => void;
    reproducirTrack: (track: Track, portada?: string) => void;
}

// Estado completo interno (lógica + UI del footer)
interface ReproductorFull extends ReproductorCtx {
    aleatorio: boolean;
    repetir: ModoRepetir;
    volumen: number;
    muted: boolean;
    tiempoActual: number;
    tiempoTotal: number;
    siguiente: () => void;
    anterior: () => void;
    togglePlay: () => void;
    toggleAleatorio: () => void;
    ciclarRepetir: () => void;
    setVolumen: (v: number) => void;
    toggleMute: () => void;
    seek: (fraccion: number) => void;
}

const Ctx = createContext<ReproductorFull | null>(null);

// src="" vacío antes de reproducir (el legacy dejaba src="" con alt="")
const PORTADA_VACIA = '';

export function PlayerProvider({ children }: { children: ReactNode }) {
    const { mostrarToast } = useToast();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [cola, setCola] = useState<ColaItem[]>([]);
    const [indice, setIndice] = useState(-1);
    const [aleatorio, setAleatorio] = useState(false);
    const [repetir, setRepetir] = useState<ModoRepetir>('off');
    const [volumen, setVolumenState] = useState(0.7);
    const [muted, setMuted] = useState(false);
    const [reproduciendo, setReproduciendo] = useState(false);
    const [tiempoActual, setTiempoActual] = useState(0);
    const [tiempoTotal, setTiempoTotal] = useState(0);

    const actual = indice >= 0 && indice < cola.length ? cola[indice] : null;

    const reproducirIndice = useCallback(
        (i: number, lista: ColaItem[]) => {
            if (i < 0 || i >= lista.length) return;
            const cancion = lista[i];
            if (!cancion.previewUrl) {
                mostrarToast('Esta canción no tiene preview disponible', 'error');
                return;
            }
            setIndice(i);
            const audio = audioRef.current;
            if (audio) {
                audio.src = cancion.previewUrl;
                void audio.play().catch(() => {});
            }
        },
        [mostrarToast]
    );

    const reproducirPreview = useCallback(
        (previewUrl: string, nombre: string, artista: string, portada?: string, trackId?: string) => {
            if (!previewUrl) {
                mostrarToast('Esta canción no tiene preview disponible', 'error');
                return;
            }
            setCola((prev) => {
                const existente = prev.findIndex((c) => c.previewUrl === previewUrl);
                if (existente !== -1) {
                    setIndice(existente);
                    const audio = audioRef.current;
                    if (audio) {
                        audio.src = previewUrl;
                        void audio.play().catch(() => {});
                    }
                    return prev;
                }
                const next = [...prev, { previewUrl, nombre, artista, portada, trackId }];
                reproducirIndice(next.length - 1, next);
                return next;
            });
        },
        [mostrarToast, reproducirIndice]
    );

    const reproducirTrack = useCallback(
        (track: Track, portada?: string) => {
            reproducirPreview(
                track.preview_url ?? '',
                track.name,
                track.artists?.map((a) => a.name).join(', ') || 'Desconocido',
                portada ?? track.album?.images?.[0]?.url,
                track.id
            );
        },
        [reproducirPreview]
    );

    const siguiente = useCallback(() => {
        setCola((prev) => {
            setIndice((cur) => {
                if (aleatorio && prev.length > 1) {
                    let nuevo = cur;
                    while (nuevo === cur) nuevo = Math.floor(Math.random() * prev.length);
                    reproducirIndice(nuevo, prev);
                    return nuevo;
                }
                if (cur < prev.length - 1) {
                    reproducirIndice(cur + 1, prev);
                    return cur + 1;
                }
                if (repetir === 'lista' && prev.length > 0) {
                    reproducirIndice(0, prev);
                    return 0;
                }
                return cur;
            });
            return prev;
        });
    }, [aleatorio, repetir, reproducirIndice]);

    const anterior = useCallback(() => {
        setCola((prev) => {
            setIndice((cur) => {
                if (cur > 0) {
                    reproducirIndice(cur - 1, prev);
                    return cur - 1;
                }
                if (cur === 0 && prev.length > 0) {
                    reproducirIndice(0, prev);
                    return 0;
                }
                return cur;
            });
            return prev;
        });
    }, [reproducirIndice]);

    const togglePlay = useCallback(() => {
        const audio = audioRef.current;
        if (!audio || cola.length === 0) return;
        if (audio.paused) void audio.play().catch(() => {});
        else audio.pause();
    }, [cola.length]);

    const toggleAleatorio = useCallback(() => setAleatorio((v) => !v), []);

    const ciclarRepetir = useCallback(() => {
        setRepetir((r) => (r === 'off' ? 'lista' : r === 'lista' ? 'una' : 'off'));
    }, []);

    const setVolumen = useCallback((v: number) => {
        setVolumenState(v);
        const audio = audioRef.current;
        if (audio) audio.volume = v;
    }, []);

    const toggleMute = useCallback(() => {
        setMuted((m) => {
            const audio = audioRef.current;
            if (audio) audio.muted = !m;
            return !m;
        });
    }, []);

    const seek = useCallback((fraccion: number) => {
        const audio = audioRef.current;
        if (audio && Number.isFinite(audio.duration)) audio.currentTime = fraccion * audio.duration;
    }, []);

    // Volumen inicial 70% (como el legacy)
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) audio.volume = 0.7;
    }, []);

    // Eventos del audio + atajo Espacio (misma lógica que reproductor.js)
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onPlay = () => setReproduciendo(true);
        const onPause = () => setReproduciendo(false);
        const onTime = () => setTiempoActual(audio.currentTime || 0);
        const onMeta = () => setTiempoTotal(audio.duration || 0);
        const onEnded = () => {
            if (repetir === 'una') {
                audio.currentTime = 0;
                void audio.play().catch(() => {});
                return;
            }
            siguiente();
        };
        const onTecla = (e: KeyboardEvent) => {
            if (e.code !== 'Space') return;
            const t = e.target;
            const esCampo =
                t instanceof HTMLElement &&
                (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
            if (esCampo) return;
            setCola((prev) => {
                if (prev.length === 0) return prev;
                e.preventDefault();
                if (audio.paused) void audio.play().catch(() => {});
                else audio.pause();
                return prev;
            });
        };

        audio.addEventListener('play', onPlay);
        audio.addEventListener('pause', onPause);
        audio.addEventListener('timeupdate', onTime);
        audio.addEventListener('loadedmetadata', onMeta);
        audio.addEventListener('ended', onEnded);
        document.addEventListener('keydown', onTecla);
        return () => {
            audio.removeEventListener('play', onPlay);
            audio.removeEventListener('pause', onPause);
            audio.removeEventListener('timeupdate', onTime);
            audio.removeEventListener('loadedmetadata', onMeta);
            audio.removeEventListener('ended', onEnded);
            document.removeEventListener('keydown', onTecla);
        };
    }, [repetir, siguiente]);

    const value = useMemo<ReproductorFull>(
        () => ({
            actual,
            reproduciendo,
            reproducirPreview,
            reproducirTrack,
            aleatorio,
            repetir,
            volumen,
            muted,
            tiempoActual,
            tiempoTotal,
            siguiente,
            anterior,
            togglePlay,
            toggleAleatorio,
            ciclarRepetir,
            setVolumen,
            toggleMute,
            seek,
        }),
        [
            actual,
            reproduciendo,
            reproducirPreview,
            reproducirTrack,
            aleatorio,
            repetir,
            volumen,
            muted,
            tiempoActual,
            tiempoTotal,
            siguiente,
            anterior,
            togglePlay,
            toggleAleatorio,
            ciclarRepetir,
            setVolumen,
            toggleMute,
            seek,
        ]
    );

    return (
        <Ctx.Provider value={value}>
            {children}
            <audio ref={audioRef} id="audio-control" className="hidden" />
        </Ctx.Provider>
    );
}

function useReproductor(): ReproductorFull {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useReproductor fuera de PlayerProvider');
    return ctx;
}

// Barra del reproductor (maquetado de dashboard.html). Se renderiza dentro
// del grid en main.tsx; la lógica vive en PlayerProvider.
export function Reproductor() {
    const p = useReproductor();
    const { ids, toggle } = useFavoritos();
    const actual = p.actual;
    const esFav = actual?.trackId ? ids.has(actual.trackId) : false;

    const iconoVolumen =
        p.muted || p.volumen === 0 ? 'fa-volume-xmark' : p.volumen < 0.5 ? 'fa-volume-low' : 'fa-volume-high';

    return (
        <footer className="flex items-center justify-between gap-4 border-t border-[#282828] bg-[#181818] px-5 py-3 max-md:flex-col max-md:gap-2 max-md:px-4 max-md:py-2">
            <div className="flex w-[30%] min-w-[180px] items-center gap-3 max-md:w-full max-md:min-w-0 max-md:justify-center">
                <img src={actual?.portada || PORTADA_VACIA} alt="" className="h-[50px] w-[50px] rounded" />
                <div className="flex flex-col">
                    <span className="max-w-[150px] truncate text-[0.85rem] font-semibold text-white">
                        {actual?.nombre ?? 'Sin reproducir'}
                    </span>
                    <span className="text-[0.75rem] text-[#B3B3B3]">{actual?.artista ?? '-'}</span>
                </div>
                <button
                    title="Guardar en tus favoritos"
                    onClick={() => {
                        if (!actual?.trackId) return;
                        void toggle({
                            id: actual.trackId,
                            name: actual.nombre,
                            preview_url: actual.previewUrl,
                            artists: [{ name: actual.artista }],
                            album: { images: actual.portada ? [{ url: actual.portada }] : [] },
                        });
                    }}
                    className={`border-none bg-transparent p-1.5 text-base transition-all hover:scale-110 hover:text-white ${
                        esFav ? 'text-[#1DB954] hover:text-[#1ed760]' : 'text-[#B3B3B3]'
                    }`}
                >
                    <i className={`${esFav ? 'fa-solid' : 'fa-regular'} fa-heart`}></i>
                </button>
            </div>

            <div className="flex max-w-[600px] flex-1 flex-col items-center gap-2 max-md:w-full max-md:max-w-full">
                <div className="flex items-center gap-4 max-[480px]:gap-2.5">
                    <button
                        title={p.aleatorio ? 'Aleatorio activado' : 'Reproducción aleatoria'}
                        onClick={p.toggleAleatorio}
                        className={`border-none bg-transparent p-2 text-base transition-colors hover:text-white ${
                            p.aleatorio ? 'text-[#1DB954] hover:text-[#1ed760]' : 'text-[#B3B3B3]'
                        }`}
                    >
                        <i className="fa-solid fa-shuffle"></i>
                    </button>
                    <button
                        title="Anterior"
                        onClick={p.anterior}
                        className="border-none bg-transparent p-2 text-base text-[#B3B3B3] transition-colors hover:text-white"
                    >
                        <i className="fa-solid fa-backward-step"></i>
                    </button>
                    <button
                        title="Reproducir"
                        onClick={p.togglePlay}
                        className="flex h-9 w-9 items-center justify-center rounded-full border-none bg-white text-[0.9rem] text-black transition-transform hover:scale-105"
                    >
                        <i className={`fa-solid ${p.reproduciendo ? 'fa-pause' : 'fa-play'}`}></i>
                    </button>
                    <button
                        title="Siguiente"
                        onClick={p.siguiente}
                        className="border-none bg-transparent p-2 text-base text-[#B3B3B3] transition-colors hover:text-white"
                    >
                        <i className="fa-solid fa-forward-step"></i>
                    </button>
                    <button
                        title={
                            p.repetir === 'off'
                                ? 'Repetir desactivado'
                                : p.repetir === 'lista'
                                  ? 'Repetir lista'
                                  : 'Repetir una canción'
                        }
                        onClick={p.ciclarRepetir}
                        className={`border-none bg-transparent p-2 text-base transition-colors hover:text-white ${
                            p.repetir !== 'off' ? 'text-[#1DB954] hover:text-[#1ed760]' : 'text-[#B3B3B3]'
                        }`}
                    >
                        <i className={`fa-solid ${p.repetir === 'una' ? 'fa-repeat-1' : 'fa-repeat'}`}></i>
                    </button>
                </div>

                <div className="flex w-full items-center gap-2.5">
                    <span className="min-w-[35px] text-center text-[0.75rem] text-[#B3B3B3]">
                        {formatearTiempo(p.tiempoActual)}
                    </span>
                    <input
                        type="range"
                        value={p.tiempoTotal ? (p.tiempoActual / p.tiempoTotal) * 100 : 0}
                        max={100}
                        step={0.1}
                        onChange={(e) => p.seek(Number(e.target.value) / 100)}
                        className="slider h-1 flex-1 cursor-pointer appearance-none rounded-sm bg-[#4D4D4D] outline-none"
                    />
                    <span className="min-w-[35px] text-center text-[0.75rem] text-[#B3B3B3]">
                        {formatearTiempo(p.tiempoTotal)}
                    </span>
                </div>
            </div>

            <div className="flex min-w-[140px] items-center justify-end gap-2 max-md:min-w-0 max-md:justify-center">
                <button
                    title="Silenciar"
                    onClick={p.toggleMute}
                    className="border-none bg-transparent text-base text-[#B3B3B3] transition-colors hover:text-white"
                >
                    <i className={`fa-solid ${iconoVolumen}`}></i>
                </button>
                <input
                    type="range"
                    value={p.muted ? 0 : p.volumen * 100}
                    max={100}
                    step={1}
                    onChange={(e) => p.setVolumen(Number(e.target.value) / 100)}
                    className="slider h-1 w-[90px] cursor-pointer appearance-none rounded-sm bg-[#4D4D4D] outline-none max-md:w-[120px]"
                />
            </div>
        </footer>
    );
}

export function usePlayer(): ReproductorCtx {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('usePlayer fuera de PlayerProvider');
    return ctx;
}
