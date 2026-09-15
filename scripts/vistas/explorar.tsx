import { useEffect, useState } from 'react';
import { API, type BuscarResultado } from '../api';
import { useNav } from '../navegacion';
import { AlbumCard, ArtistCard, ErrorCarga, GridTarjetas, PlaylistCard, Seccion, SinResultados, Spinner, TrackCard } from '../componentes';
import { DetalleAlbum } from './album';
import { DetallePlaylist } from './playlist';
import type { Artist, PlaylistRef } from '../tipos';

// Vista Explorar — mismo archivo que vistas/explorar.js: contenido inicial
// (destacadas + lanzamientos) y resultados de búsqueda (antes en busqueda.js).
// Los detalles de álbum/playlist viven en vistas/album.tsx y playlist.tsx.
export function Explorar() {
    const { explorar } = useNav();

    if (explorar.kind === 'album') return <DetalleAlbum id={explorar.id} />;
    if (explorar.kind === 'playlist') return <DetallePlaylist id={explorar.id} />;
    if (explorar.kind === 'busqueda') return <ResultadosBusqueda texto={explorar.texto} busquedaId={explorar.busquedaId} />;
    return <ExplorarInicial nonce={explorar.nonce} />;
}

function ExplorarInicial({ nonce }: { nonce: number }) {
    const [estado, setEstado] = useState<
        { status: 'cargando' } | { status: 'ok'; playlists: PlaylistRef[]; nuevos: Artist[] } | { status: 'error' }
    >({ status: 'cargando' });

    useEffect(() => {
        let vivo = true;
        setEstado({ status: 'cargando' });
        API.explorar()
            .then((data) => {
                if (vivo) setEstado({ status: 'ok', playlists: data.playlists || [], nuevos: data.nuevos || [] });
            })
            .catch((error) => {
                console.error('Error al cargar Explorar:', error);
                if (vivo) setEstado({ status: 'error' });
            });
        return () => {
            vivo = false;
        };
    }, [nonce]);

    if (estado.status === 'cargando') return <Spinner texto="Cargando sugerencias para vos..." />;
    if (estado.status === 'error') return <ErrorCarga texto="Error al cargar Explorar. Intentá de nuevo." />;

    return (
        <>
            <h2 className="col-span-full my-[10px] text-[1.4rem] font-bold">Descubrí música nueva</h2>
            {estado.playlists.length > 0 && (
                <Seccion titulo="Playlists destacadas">
                    <GridTarjetas>
                        {estado.playlists.map((p) => (
                            <PlaylistCard key={p.id} playlist={p} />
                        ))}
                    </GridTarjetas>
                </Seccion>
            )}
            {estado.nuevos.length > 0 && (
                <Seccion titulo="Lanzamientos recientes">
                    <GridTarjetas>
                        {estado.nuevos.map((a) => (
                            <AlbumCard key={a.id} album={a} />
                        ))}
                    </GridTarjetas>
                </Seccion>
            )}
            {estado.playlists.length === 0 && estado.nuevos.length === 0 && (
                <SinResultados texto="No hay contenido para mostrar por ahora. Buscá tu música en el buscador." />
            )}
        </>
    );
}

function ResultadosBusqueda({ texto, busquedaId }: { texto: string; busquedaId: number }) {
    const [estado, setEstado] = useState<
        { status: 'cargando' } | { status: 'ok'; data: BuscarResultado } | { status: 'error' }
    >({ status: 'cargando' });

    useEffect(() => {
        let vivo = true;
        setEstado({ status: 'cargando' });
        API.buscar(texto)
            .then((data) => {
                if (vivo) setEstado({ status: 'ok', data });
            })
            .catch((error) => {
                console.error('Error al buscar:', error);
                if (vivo) setEstado({ status: 'error' });
            });
        // Si el usuario ya buscó otra cosa, esta respuesta quedó vieja:
        // el efecto nuevo pone 'cargando' y este vivo=false la descarta.
        return () => {
            vivo = false;
        };
    }, [texto, busquedaId]);

    if (estado.status === 'cargando') return <Spinner texto={`Buscando "${texto}"...`} />;
    if (estado.status === 'error') return <ErrorCarga texto="Error al buscar. Intentá de nuevo." />;

    const { data } = estado;
    const hayResultados =
        (data.tracks?.items?.length || 0) +
            (data.artists?.items?.length || 0) +
            (data.albums?.items?.length || 0) +
            (data.playlists?.items?.length || 0) >
        0;

    return (
        <>
            <h2 className="col-span-full my-[10px] text-[1.4rem] font-bold">Resultados para: &quot;{texto}&quot;</h2>
            {data.tracks && data.tracks.items.length > 0 && (
                <Seccion titulo="Canciones">
                    <GridTarjetas>
                        {data.tracks.items.map((t) => (
                            <TrackCard key={t.id} track={t} />
                        ))}
                    </GridTarjetas>
                </Seccion>
            )}
            {data.artists && data.artists.items.length > 0 && (
                <Seccion titulo="Artistas">
                    <GridTarjetas>
                        {data.artists.items.map((a) => (
                            <ArtistCard key={a.id} artista={a} />
                        ))}
                    </GridTarjetas>
                </Seccion>
            )}
            {data.albums && data.albums.items.length > 0 && (
                <Seccion titulo="Álbumes">
                    <GridTarjetas>
                        {data.albums.items.map((a) => (
                            <AlbumCard key={a.id} album={a} />
                        ))}
                    </GridTarjetas>
                </Seccion>
            )}
            {data.playlists && data.playlists.items.length > 0 && (
                <Seccion titulo="Playlists">
                    <GridTarjetas>
                        {data.playlists.items.map((p) => (
                            <PlaylistCard key={p.id} playlist={p} />
                        ))}
                    </GridTarjetas>
                </Seccion>
            )}
            {!hayResultados && <SinResultados texto={`No se encontraron resultados para "${texto}".`} />}
        </>
    );
}
