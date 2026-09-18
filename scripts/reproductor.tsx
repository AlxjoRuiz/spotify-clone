import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useToast } from './notificacion';
import { useFavoritos } from './estado';
import { formatearTiempo } from './utils';
import { API } from './api';
import type { Track } from './tipos';

// Reproductor — mismo archivo que reproductor.js: cola, play/pausa,
// anterior/siguiente, shuffle, repeat (lista/una), volumen, progreso,
// atajo Espacio y corazón "me gusta". Dos motores con la misma UI:
// SDK (Web Playback SDK, canción completa, requiere Premium) y preview
// (<audio> de 30s, fallback cuando no hay Premium, URI o dispositivo).
// La lógica vive en PlayerProvider; la barra es el componente Reproductor
// y la cola visible es ColaDrawer (ambos se renderizan en main.tsx).
export interface ColaItem {
    previewUrl: string;
    nombre: string;
    artista: string;
    portada?: string;
    trackId?: string;
    uri?: string;
}

type ModoRepetir = 'off' | 'lista' | 'una';
type Motor = 'sdk' | 'audio' | null;

// Tipos mínimos del SDK (sin any): solo lo que usa este módulo.
interface SDKArtist {
    name: string;
}
interface SDKAlbumArt {
    url: string;
}
interface SDKCurrentTrack {
    uri: string;
    name: string;
    artists: SDKArtist[];
    album: { images: SDKAlbumArt[] };
}
interface SDKPlaybackState {
    position: number;
    duration: number;
    paused: boolean;
    track_window: { current_track: SDKCurrentTrack };
}
interface SDKReady {
    device_id: string;
}
interface SDKError {
    message: string;
}
interface SpotifyPlayerInstance {
    connect(): Promise<boolean>;
    disconnect(): void;
    togglePlay(): Promise<void>;
    seek(positionMs: number): Promise<void>;
    setVolume(volume: number): Promise<void>;
    getCurrentState(): Promise<SDKPlaybackState | null>;
    addListener(event: 'ready' | 'not_ready', cb: (d: SDKReady) => void): boolean;
    addListener(event: 'player_state_changed', cb: (s: SDKPlaybackState | null) => void): boolean;
    addListener(
        event: 'authentication_error' | 'account_error' | 'playback_error' | 'initialization_error',
        cb: (e: SDKError) => void
    ): boolean;
}
interface SpotifyPlayerCtor {
    new (opciones: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
    }): SpotifyPlayerInstance;
}

declare global {
    interface Window {
        Spotify?: { Player: SpotifyPlayerCtor };
        onSpotifyWebPlaybackSDKReady?: () => void;
    }
}

function uriATrackId(uri: string): string {
    return uri.split(':')[2] ?? '';
}

// Carga https://sdk.scdn.co/spotify-player.js una sola vez.
let sdkPromise: Promise<void> | null = null;
function cargarSDK(): Promise<void> {
    if (typeof window === 'undefined') return Promise.reject(new Error('Sin ventana'));
    if (window.Spotify) return Promise.resolve();
    if (!sdkPromise) {
        sdkPromise = new Promise<void>((resolve, reject) => {
            const timer = window.setTimeout(() => {
                sdkPromise = null;
                reject(new Error('Timeout cargando el SDK'));
            }, 15000);
            window.onSpotifyWebPlaybackSDKReady = () => {
                window.clearTimeout(timer);
                resolve();
            };
            const script = document.createElement('script');
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            script.onerror = () => {
                window.clearTimeout(timer);
                sdkPromise = null;
                reject(new Error('No se pudo cargar el SDK'));
            };
            document.body.appendChild(script);
        });
    }
    return sdkPromise;
}

interface ReproductorCtx {
    actual: ColaItem | null;
    reproduciendo: boolean;
    reproducirPreview: (previewUrl: string, nombre: string, artista: string, portada?: string, trackId?: string) => void;
    reproducirTrack: (track: Track, portada?: string) => void;
    // Cola visible (vista Cola)
    cola: ColaItem[];
    indiceActual: number;
    reproducirIndice: (i: number) => void;
    reproducirCola: (items: ColaItem[], inicio?: number) => void;
    colaAbierta: boolean;
    toggleCola: () => void;
}

// Estado completo interno (lógica + UI del footer/drawer)
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
    const playerRef = useRef<SpotifyPlayerInstance | null>(null);
    const deviceIdRef = useRef<string | null>(null);
    const ultimoUriRef = useRef<string | null>(null);
    const ultimoPlayRef = useRef(false);
    const [cola, setCola] = useState<ColaItem[]>([]);
    const [indice, setIndice] = useState(-1);
    const [aleatorio, setAleatorio] = useState(false);
    const [repetir, setRepetir] = useState<ModoRepetir>('off');
    const [volumen, setVolumenState] = useState(0.7);
    const [muted, setMuted] = useState(false);
    const [reproduciendo, setReproduciendo] = useState(false);
    const [tiempoActual, setTiempoActual] = useState(0);
    const [tiempoTotal, setTiempoTotal] = useState(0);
    const [colaAbierta, setColaAbierta] = useState(false);
    const [motor, setMotor] = useState<Motor>(null);
    const [sinPremium, setSinPremium] = useState(false);
    const [sdkPista, setSdkPista] = useState<{
        nombre: string;
        artista: string;
        portada?: string;
        uri: string;
    } | null>(null);

    // Espejos para leer estado fresco dentro de listeners e intervalos.
    const motorRef = useRef<Motor>(null);
    const repetirRef = useRef<ModoRepetir>('off');
    const siguienteRef = useRef<() => void>(() => {});
    const volumenRef = useRef(0.7);
    useEffect(() => {
        motorRef.current = motor;
        repetirRef.current = repetir;
        volumenRef.current = volumen;
    });

    // Lo que muestra la UI: pista del SDK si es el motor activo, si no la cola.
    const actualCola = indice >= 0 && indice < cola.length ? cola[indice] : null;
    const actual: ColaItem | null =
        motor === 'sdk' && sdkPista
            ? {
                  previewUrl: '',
                  nombre: sdkPista.nombre,
                  artista: sdkPista.artista,
                  portada: sdkPista.portada,
                  trackId: uriATrackId(sdkPista.uri),
                  uri: sdkPista.uri,
              }
            : actualCola;

    // Crea el player SDK una vez (token fresco del backend) y lo conecta.
    const asegurarSDK = useCallback(async (): Promise<boolean> => {
        if (typeof window === 'undefined' || sinPremium) return false;
        try {
            await cargarSDK();
            if (!window.Spotify) return false;
            if (!playerRef.current) {
                const player = new window.Spotify.Player({
                    name: 'Spotify Clone',
                    getOAuthToken: (cb) => {
                        API.obtenerToken()
                            .then((t) => cb(t.access_token))
                            .catch(() => {
                                // api.ts ya redirige al login con 401
                            });
                    },
                    volume: volumenRef.current,
                });
                player.addListener('ready', ({ device_id }) => {
                    deviceIdRef.current = device_id;
                    // Reclama el dispositivo sin sonar (el play real lo transfiere).
                    void API.transferirReproduccion(device_id, false).catch(() => {});
                });
                player.addListener('not_ready', () => {
                    deviceIdRef.current = null;
                });
                player.addListener('player_state_changed', (s) => {
                    if (!s) return;
                    const t = s.track_window.current_track;
                    setSdkPista({
                        nombre: t.name,
                        artista: t.artists.map((a) => a.name).join(', ') || 'Desconocido',
                        portada: t.album.images[0]?.url,
                        uri: t.uri,
                    });
                    if (!s.paused) ultimoPlayRef.current = true;
                });
                player.addListener('account_error', () => {
                    setSinPremium(true);
                    mostrarToast('La reproducción completa requiere Spotify Premium', 'error');
                    try {
                        player.disconnect();
                    } catch {
                        // noop: ya está desconectado
                    }
                    playerRef.current = null;
                    deviceIdRef.current = null;
                    setMotor('audio');
                });
                player.addListener('authentication_error', () => {
                    mostrarToast('Spotify no autorizó la reproducción', 'error');
                    try {
                        player.disconnect();
                    } catch {
                        // noop: ya está desconectado
                    }
                    playerRef.current = null;
                    deviceIdRef.current = null;
                    setMotor('audio');
                });
                player.addListener('initialization_error', () => {
                    mostrarToast('No se pudo iniciar el reproductor de Spotify', 'error');
                });
                player.addListener('playback_error', () => {
                    mostrarToast('Error al reproducir en Spotify', 'error');
                });
                playerRef.current = player;
            }
            return await playerRef.current.connect();
        } catch {
            mostrarToast('No se pudo conectar con Spotify', 'error');
            return false;
        }
    }, [mostrarToast, sinPremium]);

    // Reproduce una URI en el dispositivo del SDK (con gracia para el ready).
    const tocarEnSDK = useCallback(
        async (uri: string): Promise<boolean> => {
            if (!deviceIdRef.current) {
                const ok = await asegurarSDK();
                if (ok) {
                    for (let i = 0; i < 30 && !deviceIdRef.current; i++) {
                        await new Promise((r) => setTimeout(r, 100));
                    }
                }
            }
            const dev = deviceIdRef.current;
            if (!dev) return false;
            ultimoUriRef.current = uri;
            try {
                await API.reproducirEnDispositivo([uri], dev);
                audioRef.current?.pause();
                return true;
            } catch {
                mostrarToast('No se pudo reproducir en Spotify, usando preview', 'error');
                return false;
            }
        },
        [asegurarSDK, mostrarToast]
    );

    // Ruta de preview (<audio> de 30s), igual que antes del SDK.
    const reproducirEnAudio = useCallback(
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

    // Decide el motor: SDK si hay URI (canción completa), si no preview.
    const reproducirEnIndice = useCallback(
        async (i: number, lista: ColaItem[]) => {
            const item = lista[i];
            if (!item) return;
            setIndice(i);
            const uri = item.uri ?? (item.trackId ? `spotify:track:${item.trackId}` : undefined);
            if (uri && !sinPremium) {
                setMotor('sdk');
                if (await tocarEnSDK(uri)) return;
                setMotor('audio');
            } else {
                setMotor('audio');
            }
            reproducirEnAudio(i, lista);
        },
        [sinPremium, tocarEnSDK, reproducirEnAudio]
    );

    const reproducirPreview = useCallback(
        (previewUrl: string, nombre: string, artista: string, portada?: string, trackId?: string) => {
            const uri = trackId ? `spotify:track:${trackId}` : undefined;
            if (!previewUrl && !uri) {
                mostrarToast('Esta canción no tiene preview disponible', 'error');
                return;
            }
            const clave = (c: ColaItem) => c.trackId || c.previewUrl;
            const nuevo: ColaItem = { previewUrl, nombre, artista, portada, trackId, uri };
            const existente = cola.findIndex((c) => clave(c) === clave(nuevo));
            if (existente !== -1) {
                void reproducirEnIndice(existente, cola);
                return;
            }
            const lista = [...cola, nuevo];
            setCola(lista);
            void reproducirEnIndice(lista.length - 1, lista);
        },
        [cola, mostrarToast, reproducirEnIndice]
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
            // El Track trae su URI canónica: úsala si el SDK está disponible.
            if (track.uri) {
                setCola((prev) => {
                    const idx = prev.findIndex((c) => c.trackId === track.id);
                    if (idx === -1) return prev;
                    const next = [...prev];
                    next[idx] = { ...next[idx], uri: track.uri };
                    return next;
                });
            }
        },
        [reproducirPreview]
    );

    const siguiente = useCallback(() => {
        if (cola.length === 0) return;
        let nuevo = indice;
        if (aleatorio && cola.length > 1) {
            nuevo = indice;
            while (nuevo === indice) nuevo = Math.floor(Math.random() * cola.length);
        } else if (indice < cola.length - 1) {
            nuevo = indice + 1;
        } else if (repetir === 'lista') {
            nuevo = 0;
        } else {
            return;
        }
        void reproducirEnIndice(nuevo, cola);
    }, [cola, indice, aleatorio, repetir, reproducirEnIndice]);

    const anterior = useCallback(() => {
        if (cola.length === 0) return;
        if (indice > 0) void reproducirEnIndice(indice - 1, cola);
        else if (indice === 0) void reproducirEnIndice(0, cola);
    }, [cola, indice, reproducirEnIndice]);

    const togglePlay = useCallback(() => {
        if (motorRef.current === 'sdk' && playerRef.current) {
            void playerRef.current.togglePlay().catch(() => {});
            return;
        }
        const audio = audioRef.current;
        if (!audio || cola.length === 0) return;
        if (audio.paused) void audio.play().catch(() => {});
        else audio.pause();
    }, [cola.length]);

    const toggleCola = useCallback(() => setColaAbierta((v) => !v), []);

    const irAIndice = useCallback((i: number) => void reproducirEnIndice(i, cola), [cola, reproducirEnIndice]);

    const reproducirCola = useCallback(
        (items: ColaItem[], inicio = 0) => {
            if (items.length === 0) return;
            setCola(items);
            void reproducirEnIndice(inicio, items);
        },
        [reproducirEnIndice]
    );

    const toggleAleatorio = useCallback(() => setAleatorio((v) => !v), []);

    const ciclarRepetir = useCallback(() => {
        setRepetir((r) => (r === 'off' ? 'lista' : r === 'lista' ? 'una' : 'off'));
    }, []);

    const setVolumen = useCallback((v: number) => {
        setVolumenState(v);
        const audio = audioRef.current;
        if (audio) audio.volume = v;
        if (playerRef.current) void playerRef.current.setVolume(v).catch(() => {});
    }, []);

    const toggleMute = useCallback(() => {
        setMuted((m) => {
            const audio = audioRef.current;
            if (audio) audio.muted = !m;
            if (playerRef.current) void playerRef.current.setVolume(!m ? 0 : volumen).catch(() => {});
            return !m;
        });
    }, [volumen]);

    const seek = useCallback(
        (fraccion: number) => {
            if (motorRef.current === 'sdk' && playerRef.current && Number.isFinite(tiempoTotal)) {
                void playerRef.current.seek(Math.round(fraccion * tiempoTotal * 1000)).catch(() => {});
                return;
            }
            const audio = audioRef.current;
            if (audio && Number.isFinite(audio.duration)) audio.currentTime = fraccion * audio.duration;
        },
        [tiempoTotal]
    );

    // Espejos para leer estado fresco dentro de listeners, intervalos y
    // atajos sin re-suscribirlos a cada render.
    useEffect(() => {
        motorRef.current = motor;
        repetirRef.current = repetir;
        siguienteRef.current = siguiente;
        volumenRef.current = volumen;
    });

    // Volumen inicial 70% (como el legacy)
    useEffect(() => {
        const audio = audioRef.current;
        if (audio) audio.volume = 0.7;
    }, []);

    // Desconecta el SDK al desmontar la app.
    useEffect(
        () => () => {
            try {
                playerRef.current?.disconnect();
            } catch {
                // noop: ya está desconectado
            }
        },
        []
    );

    // Eventos del <audio> (modo preview) + atajo Espacio (ambos motores).
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const onPlay = () => {
            if (motorRef.current === 'sdk') return;
            setReproduciendo(true);
        };
        const onPause = () => {
            if (motorRef.current === 'sdk') return;
            setReproduciendo(false);
        };
        const onTime = () => setTiempoActual(audio.currentTime || 0);
        const onMeta = () => setTiempoTotal(audio.duration || 0);
        const onEnded = () => {
            if (motorRef.current === 'sdk') return;
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
            if (motorRef.current === 'sdk' && playerRef.current) {
                e.preventDefault();
                void playerRef.current.togglePlay().catch(() => {});
                return;
            }
            if (cola.length === 0) return;
            e.preventDefault();
            if (audio.paused) void audio.play().catch(() => {});
            else audio.pause();
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
    }, [repetir, siguiente, cola.length]);

    // Progreso en modo SDK: el SDK no emite tiempo cada segundo, se sondea.
    // También detecta fin de pista para repeat-una o avanzar en la cola.
    useEffect(() => {
        if (motor !== 'sdk') return;
        const id = window.setInterval(() => {
            const pl = playerRef.current;
            if (!pl) return;
            void pl
                .getCurrentState()
                .then((s) => {
                    if (!s) return;
                    setTiempoActual(Math.floor(s.position / 1000));
                    setTiempoTotal(Math.floor(s.duration / 1000));
                    setReproduciendo(!s.paused);
                    if (!s.paused) {
                        ultimoPlayRef.current = true;
                        return;
                    }
                    if (ultimoPlayRef.current && s.position < 2000) {
                        ultimoPlayRef.current = false;
                        if (repetirRef.current === 'una') {
                            const u = ultimoUriRef.current;
                            if (u) void tocarEnSDK(u);
                        } else {
                            siguienteRef.current();
                        }
                    }
                })
                .catch(() => {
                    // Sin estado (pista externa o pausa): se reintenta solo
                });
        }, 500);
        return () => window.clearInterval(id);
    }, [motor, tocarEnSDK]);

    const value = useMemo<ReproductorFull>(
        () => ({
            actual,
            reproduciendo,
            reproducirPreview,
            reproducirTrack,
            cola,
            indiceActual: indice,
            reproducirIndice: irAIndice,
            reproducirCola,
            colaAbierta,
            toggleCola,
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
            cola,
            indice,
            irAIndice,
            reproducirCola,
            colaAbierta,
            toggleCola,
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
                    <button
                        title="Cola de reproducción"
                        onClick={p.toggleCola}
                        className={`border-none bg-transparent p-2 text-base transition-colors hover:text-white ${
                            p.colaAbierta ? 'text-[#1DB954] hover:text-[#1ed760]' : 'text-[#B3B3B3]'
                        }`}
                    >
                        <i className="fa-solid fa-list"></i>
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

// Vista Cola: panel lateral con lo que suena y lo que sigue.
// (Spotify la muestra al costado; acá es un drawer fijo a la derecha.)
export function ColaDrawer() {
    const p = useReproductor();
    if (!p.colaAbierta) return null;

    const siguientes = p.cola
        .map((c, i) => ({ c, i }))
        .filter(({ i }) => i > p.indiceActual);

    return (
        <aside className="fixed bottom-0 right-0 top-0 z-[100] flex w-[320px] max-w-[85vw] flex-col border-l border-[#282828] bg-[#121212] text-white shadow-[-8px_0_24px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between border-b border-[#282828] px-4 py-3">
                <h2 className="m-0 text-[1.1rem] font-bold">Cola</h2>
                <button
                    onClick={p.toggleCola}
                    title="Cerrar cola"
                    className="border-none bg-transparent text-[1rem] text-[#B3B3B3] transition-colors hover:text-white"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div className="scroll-spotify flex-1 overflow-y-auto p-4">
                <p className="m-0 mb-2 text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#B3B3B3]">
                    Sonando ahora
                </p>
                {p.actual ? (
                    <FilaCola
                        numero="♪"
                        nombre={p.actual.nombre}
                        artista={p.actual.artista}
                        portada={p.actual.portada}
                        activa
                        onPlay={() => p.reproducirIndice(p.indiceActual)}
                    />
                ) : (
                    <p className="text-[0.85rem] text-[#B3B3B3]">Nada en cola.</p>
                )}

                <p className="m-0 mb-2 mt-5 text-[0.75rem] font-semibold uppercase tracking-[1px] text-[#B3B3B3]">
                    Siguientes
                </p>
                {siguientes.length === 0 && (
                    <p className="text-[0.85rem] text-[#B3B3B3]">Dale play a una canción para armar la cola.</p>
                )}
                {siguientes.map(({ c, i }) => (
                    <FilaCola
                        key={`${c.previewUrl}-${i}`}
                        numero={String(i + 1)}
                        nombre={c.nombre}
                        artista={c.artista}
                        portada={c.portada}
                        onPlay={() => p.reproducirIndice(i)}
                    />
                ))}
            </div>
        </aside>
    );
}

function FilaCola({
    numero,
    nombre,
    artista,
    portada,
    activa,
    onPlay,
}: {
    numero: string;
    nombre: string;
    artista: string;
    portada?: string;
    activa?: boolean;
    onPlay: () => void;
}) {
    return (
        <button
            onClick={onPlay}
            className="group flex w-full cursor-pointer items-center gap-3 rounded-md border-none bg-transparent px-2 py-2 text-left transition-colors hover:bg-white/10"
        >
            {portada ? (
                <img src={portada} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" />
            ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded bg-[#282828] text-[0.8rem] text-[#B3B3B3]">
                    {numero}
                </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
                <span className={`truncate text-[0.85rem] font-semibold ${activa ? 'text-[#1DB954]' : 'text-white'}`}>
                    {nombre}
                </span>
                <span className="truncate text-[0.75rem] text-[#B3B3B3]">{artista}</span>
            </span>
            <i className="fa-solid fa-play text-[0.7rem] text-[#B3B3B3] opacity-0 transition-opacity group-hover:opacity-100"></i>
        </button>
    );
}
