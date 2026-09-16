import { useEffect, useState } from 'react';
import { API } from '../api';
import { useNav, type Vista } from '../navegacion';
import { usePlayer, type ColaItem } from '../reproductor';
import { PORTADA_DEFECTO } from '../utils';
import { AlbumCard, ErrorCarga, GridTarjetas, Seccion, Spinner, TrackList } from '../componentes';
import type { ArtistaDetalle } from '../tipos';

// Vista artista: foto, seguidores, géneros, top tracks y álbumes.
// Se abre desde cualquier ArtistCard (antes abría Spotify externo).
export function DetalleArtista({ id, desde }: { id: string; desde: Vista }) {
    const { navegar, volverAResultados } = useNav();
    const { reproducirCola } = usePlayer();
    const [estado, setEstado] = useState<
        { status: 'cargando' } | { status: 'ok'; data: ArtistaDetalle } | { status: 'error' }
    >({ status: 'cargando' });

    useEffect(() => {
        let vivo = true;
        API.artistaDetalle(id)
            .then((data) => vivo && setEstado({ status: 'ok', data }))
            .catch((error) => {
                console.error('Error al cargar artista:', error);
                if (vivo) setEstado({ status: 'error' });
            });
        return () => {
            vivo = false;
        };
    }, [id]);

    if (estado.status === 'cargando') return <Spinner texto="Cargando artista..." />;
    if (estado.status === 'error') return <ErrorCarga texto="Error al cargar el artista. Intentá de nuevo." />;

    const { artista, top, albums } = estado.data;
    const etiquetaVolver = desde === 'Explorar' ? 'Volver a resultados' : `Volver a ${desde}`;
    const volver = () => {
        if (desde === 'Explorar') volverAResultados();
        else navegar(desde);
    };
    // Play principal: encola los top tracks y arranca desde el primero
    const reproducirTop = () => {
        const items: ColaItem[] = top
            .filter((t) => t.preview_url)
            .map((t) => ({
                previewUrl: t.preview_url ?? '',
                nombre: t.name,
                artista: t.artists?.map((a) => a.name).join(', ') || artista.nombre,
                portada: t.album?.images?.[0]?.url ?? artista.imagen ?? undefined,
                trackId: t.id,
            }));
        reproducirCola(items, 0);
    };

    return (
        <>
            <div className="col-span-full mb-6 flex items-end gap-6 border-b border-[#282828] pb-6 max-md:flex-col max-md:items-start">
                <img
                    src={artista.imagen || PORTADA_DEFECTO}
                    alt={artista.nombre}
                    className="h-[200px] w-[200px] rounded-full object-cover shadow-[0_8px_24px_rgba(0,0,0,0.5)] max-md:h-[140px] max-md:w-[140px]"
                />
                <div className="flex flex-col gap-1">
                    <p className="m-0 text-[0.75rem] uppercase text-[#B3B3B3]">Artista</p>
                    <h2 className="m-0 my-2 text-[2.5rem] font-black leading-[1.1] max-md:text-[1.8rem]">
                        {artista.nombre}
                    </h2>
                    <p className="m-0 text-[1rem] text-[#B3B3B3]">
                        {artista.seguidores.toLocaleString()} seguidores
                        {artista.generos.length > 0 && ` · ${artista.generos.slice(0, 3).join(', ')}`}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                        <button
                            onClick={reproducirTop}
                            title="Reproducir"
                            className="flex h-12 w-12 items-center justify-center rounded-full border-none bg-[#1DB954] text-[1.1rem] text-black transition-transform hover:scale-105 hover:bg-[#1ed760]"
                        >
                            <i className="fa-solid fa-play"></i>
                        </button>
                        {artista.spotify_url && (
                            <a
                                href={artista.spotify_url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-[#727272] px-4 py-2 text-[0.8rem] font-semibold text-white no-underline transition-colors hover:border-white"
                            >
                                Abrir en Spotify
                            </a>
                        )}
                    </div>
                </div>
            </div>
            <button
                onClick={volver}
                className="col-span-full mb-3 cursor-pointer border-none bg-transparent px-0 py-2 font-['Poppins',sans-serif] text-[0.85rem] text-[#B3B3B3] transition-colors hover:text-white"
            >
                <i className="fa-solid fa-arrow-left mr-1.5"></i> {etiquetaVolver}
            </button>
            <Seccion titulo="Populares">
                <TrackList tracks={top.slice(0, 10)} portada={artista.imagen} />
            </Seccion>
            {albums.length > 0 && (
                <Seccion titulo="Álbumes">
                    <GridTarjetas>
                        {albums.map((a) => (
                            <AlbumCard key={a.id} album={a} />
                        ))}
                    </GridTarjetas>
                </Seccion>
            )}
        </>
    );
}
