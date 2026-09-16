import type { ReactNode } from 'react';
import { usePlayer } from './reproductor';
import { useFavoritos } from './estado';
import { useNav } from './navegacion';
import { PORTADA_DEFECTO, formatearTiempo } from './utils';
import type { AlbumRef, Artist, PlaylistRef, Track } from './tipos';

// Componentes — mismo archivo que componentes.js: tarjetas reutilizables
// (canción, artista, álbum, playlist), lista de tracks y estados de carga.

// Spinners y mensajes de error/ vacío que muestran las vistas al cargar.

export function Spinner({ texto }: { texto?: string }) {
    return (
        <div className="col-span-full flex flex-col items-center gap-3 py-10 text-[#B3B3B3]">
            <i className="fa-solid fa-spinner fa-spin text-[2rem] text-[#1DB954]"></i>
            {texto && <p>{texto}</p>}
        </div>
    );
}

export function ErrorCarga({ texto }: { texto: string }) {
    return (
        <div className="col-span-full flex flex-col items-center justify-center gap-3 px-0 py-[60px] text-[#B3B3B3]">
            <i className="fa-solid fa-circle-exclamation text-[2.5rem] text-[#1DB954]"></i>
            <p>{texto}</p>
        </div>
    );
}

// Títulos y grillas que agrupan tarjetas dentro de cada vista.

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
    return (
        <>
            <h3 className="col-span-full mb-[5px] mt-[15px] text-[1.1rem] font-bold">{titulo}</h3>
            {children}
        </>
    );
}

export function GridTarjetas({ children }: { children: ReactNode }) {
    return (
        <div className="col-span-full grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-5 max-md:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] max-md:gap-3 max-[480px]:grid-cols-[repeat(auto-fill,minmax(110px,1fr))] max-[480px]:gap-2">
            {children}
        </div>
    );
}

export function SinResultados({ texto }: { texto: string }) {
    return <p className="col-span-full text-[#B3B3B3]">{texto}</p>;
}

// Tarjetas de canción, artista, álbum y playlist + lista de tracks.
// Comparten la misma base visual (fondo oscuro, hover, textos recortados).

const cardBase =
    'group relative w-full cursor-pointer overflow-hidden rounded-lg bg-[#181818] p-4 transition-colors duration-300 hover:bg-[#282828] max-md:max-w-[160px] max-[480px]:max-w-[140px] max-[480px]:p-2.5';
const cardImg = 'relative z-[1] aspect-square w-full rounded object-cover shadow-[0_8px_24px_rgba(0,0,0,0.5)]';
const cardNombre =
    "relative z-[1] m-0 mt-1.5 max-w-full truncate whitespace-nowrap text-ellipsis font-['Poppins',sans-serif] font-semibold text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]";
const cardSub =
    "relative z-[1] m-0 mt-1.5 max-w-full truncate whitespace-nowrap text-ellipsis font-['Poppins',sans-serif] text-[0.8rem] font-normal text-[#B3B3B3] [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]";

// Botón corazón (crearBotonFavorito)
function BotonFavorito({ track }: { track: Track }) {
    const { ids, toggle } = useFavoritos();
    const activo = ids.has(track.id);
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                void toggle(track);
            }}
            className={`absolute right-3 top-3 z-[2] flex h-8 w-8 items-center justify-center rounded-full border-none bg-black/70 text-white opacity-0 transition-all duration-200 group-hover:opacity-100 ${
                activo ? 'opacity-100 text-[#e0245e]' : ''
            }`}
        >
            <i className={`${activo ? 'fa-solid' : 'fa-regular'} fa-heart text-[0.85rem]`}></i>
        </button>
    );
}

// Tarjeta de canción (crearTarjetaCancion). lineaExtra = "hace X" en
// recientes; numeroTop = "#N" + duración en top tracks.
export function TrackCard({
    track,
    lineaExtra,
    numeroTop,
}: {
    track: Track;
    lineaExtra?: string;
    numeroTop?: number;
}) {
    const { reproducirTrack } = usePlayer();
    const portada = track.album?.images?.[0]?.url || PORTADA_DEFECTO;

    return (
        <div className={cardBase}>
            {numeroTop !== undefined && (
                <span className="absolute left-5 top-5 z-[2] text-[1.5rem] font-black text-[#B3B3B3] [text-shadow:0_2px_8px_rgba(0,0,0,0.8)]">
                    #{numeroTop}
                </span>
            )}
            <img src={portada} alt={track.name} className={cardImg} loading="lazy" />
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    reproducirTrack(track, portada);
                }}
                className="absolute bottom-4 right-4 z-[2] flex h-10 w-10 translate-y-2 items-center justify-center rounded-full border-none bg-[#1DB954] text-base text-black opacity-0 shadow-[0_8px_16px_rgba(0,0,0,0.3)] transition-all duration-300 hover:scale-110 hover:bg-[#1ed760] group-hover:translate-y-0 group-hover:opacity-100"
            >
                <i className="fa-solid fa-play"></i>
            </button>
            <BotonFavorito track={track} />
            <p className={cardNombre}>{track.name}</p>
            <p className={cardSub}>{track.artists?.map((a) => a.name).join(', ') || 'Desconocido'}</p>
            {numeroTop !== undefined && track.duration_ms !== undefined && (
                <p className="!mt-1 !text-[0.75rem] !font-normal !text-[#727272]">
                    {formatearTiempo(track.duration_ms / 1000)}
                </p>
            )}
            {lineaExtra && <p className="!m-0 text-[0.72rem] font-semibold text-[#1DB954]">{lineaExtra}</p>}
        </div>
    );
}

// Tarjeta de artista (ArtistCard): foto circular, click abre el detalle interno.
export function ArtistCard({ artista, sublabel }: { artista: Artist; sublabel?: string }) {
    const { abrirArtista } = useNav();
    const portada = artista.images?.[0]?.url || PORTADA_DEFECTO;

    return (
        <div className={cardBase} onClick={() => abrirArtista(artista.id)}>
            <img src={portada} alt={artista.name} className={`${cardImg} rounded-full`} loading="lazy" />
            <p className={cardNombre}>{artista.name}</p>
            <p className={cardSub}>{sublabel || 'Artista'}</p>
        </div>
    );
}

// Tarjeta de álbum (crearTarjetaAlbum): click abre el detalle.
export function AlbumCard({ album }: { album: AlbumRef }) {
    const { abrirAlbum } = useNav();
    const portada = album.images?.[0]?.url || PORTADA_DEFECTO;

    return (
        <div className={cardBase} onClick={() => abrirAlbum(album.id)}>
            <img src={portada} alt={album.name} className={cardImg} loading="lazy" />
            <p className={cardNombre}>{album.name}</p>
            <p className={cardSub}>{album.artists?.[0]?.name ?? 'Desconocido'}</p>
        </div>
    );
}

// Tarjeta de playlist (crearTarjetaPlaylist): con abrirDetalle abre el
// detalle en la app; sin él abre Spotify en otra pestaña (home).
export function PlaylistCard({ playlist, abrirDetalle }: { playlist: PlaylistRef; abrirDetalle?: boolean }) {
    const { abrirPlaylist } = useNav();
    const portada = playlist.images?.[0]?.url || PORTADA_DEFECTO;

    return (
        <div
            className={cardBase}
            onClick={() => {
                if (abrirDetalle) abrirPlaylist(playlist.id);
                else if (playlist.external_urls?.spotify) window.open(playlist.external_urls.spotify, '_blank');
            }}
        >
            <img src={portada} alt={playlist.name} className={cardImg} loading="lazy" />
            <p className={cardNombre}>{playlist.name}</p>
            <p className={cardSub}>{playlist.owner?.display_name ?? 'Desconocido'}</p>
        </div>
    );
}

// Lista de canciones de un detalle (crearListaTracks): número, nombre,
// artista, duración y play al hover (solo si hay preview).
export function TrackList({ tracks, portada }: { tracks: Track[]; portada?: string | null }) {
    const { reproducirPreview } = usePlayer();

    return (
        <div className="col-span-full flex flex-col gap-0.5">
            {(tracks || []).map((track, index) => (
                <div
                    key={track.id ?? index}
                    className="group relative grid grid-cols-[48px_1fr_auto] items-center gap-4 rounded-md px-3 py-2.5 transition-colors hover:bg-white/10"
                >
                    <span className="text-center text-[0.9rem] text-[#B3B3B3] transition-opacity group-hover:opacity-0">
                        {index + 1}
                    </span>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                        <p className="m-0 truncate text-[0.9rem] font-semibold text-white">{track.name}</p>
                        <p className="m-0 truncate text-[0.8rem] text-[#B3B3B3]">
                            {track.artists?.map((a) => a.name).join(', ') || 'Desconocido'}
                        </p>
                    </div>
                    <span className="text-right text-[0.85rem] text-[#B3B3B3]">
                        {formatearTiempo((track.duration_ms || 0) / 1000)}
                    </span>
                    {track.preview_url && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                reproducirPreview(
                                    track.preview_url ?? '',
                                    track.name,
                                    track.artists?.[0]?.name ?? 'Desconocido',
                                    portada ?? undefined,
                                    track.id
                                );
                            }}
                            className="absolute left-[14px] flex h-7 w-7 scale-75 items-center justify-center rounded-full border-none bg-[#1DB954] text-[0.75rem] text-black opacity-0 transition-all hover:bg-[#1ed760] group-hover:scale-100 group-hover:opacity-100"
                        >
                            <i className="fa-solid fa-play"></i>
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
