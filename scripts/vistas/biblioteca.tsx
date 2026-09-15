import { useEffect, useState } from 'react';
import { API } from '../api';
import { tiempoRelativo } from '../utils';
import { useFavoritos } from '../estado';
import { ErrorCarga, GridTarjetas, PlaylistCard, SinResultados, Spinner, TrackCard } from '../componentes';
import type { PlaylistRef, RecentItem, Track } from '../tipos';

// Vista Biblioteca — mismo archivo que vistas/biblioteca.js: recientes
// (con "hace X"), favoritos (desde el estado global) y mis playlists.
// Se recarga en cada visita (carga perezosa de navegacion.js).
export function Biblioteca() {
    return (
        <>
            <Recientes />
            <Favoritos />
            <MisPlaylists />
        </>
    );
}

function Recientes() {
    const [estado, setEstado] = useState<
        { status: 'cargando' } | { status: 'ok'; items: RecentItem[] } | { status: 'error' }
    >({ status: 'cargando' });

    useEffect(() => {
        let vivo = true;
        API.cancionesRecientes()
            .then((data) => vivo && setEstado({ status: 'ok', items: data.items || [] }))
            .catch((error) => {
                console.error('Error al cargar canciones recientes:', error);
                if (vivo) setEstado({ status: 'error' });
            });
        return () => {
            vivo = false;
        };
    }, []);

    return (
        <>
            <h2 className="col-span-full my-[10px] text-[1.4rem] font-bold">Escuchado recientemente</h2>
            {estado.status === 'cargando' && <Spinner texto="Cargando tus canciones recientes..." />}
            {estado.status === 'error' && (
                <SinResultados texto="Error al cargar tu biblioteca. Probá de nuevo." />
            )}
            {estado.status === 'ok' && (
                <GridTarjetas>
                    {estado.items.length === 0 && (
                        <SinResultados texto="No tenés canciones recientes. Escuchá algo en Spotify primero." />
                    )}
                    {estado.items.map((item, i) =>
                        item?.track ? (
                            <TrackCard
                                key={`${item.track.id}-${i}`}
                                track={item.track}
                                lineaExtra={item.played_at ? tiempoRelativo(item.played_at) : undefined}
                            />
                        ) : null
                    )}
                </GridTarjetas>
            )}
        </>
    );
}

function trackDesdeFavorito(f: {
    track_id: string;
    track_nombre: string;
    track_artista: string;
    track_imagen: string | null;
    track_preview: string | null;
}): Track {
    return {
        id: f.track_id,
        name: f.track_nombre,
        artists: [{ name: f.track_artista }],
        album: { images: f.track_imagen ? [{ url: f.track_imagen }] : [] },
        preview_url: f.track_preview,
    };
}

function Favoritos() {
    const { favoritos, recargar } = useFavoritos();
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let vivo = true;
        setCargando(true);
        void recargar().finally(() => vivo && setCargando(false));
        return () => {
            vivo = false;
        };
    }, [recargar]);

    return (
        <>
            <h2 className="col-span-full my-[10px] text-[1.4rem] font-bold">Tus canciones favoritas</h2>
            {cargando && <Spinner />}
            {!cargando && (
                <GridTarjetas>
                    {favoritos.length === 0 && (
                        <SinResultados texto="Aún no guardaste canciones favoritas." />
                    )}
                    {favoritos.map((f) => (
                        <TrackCard key={f.track_id} track={trackDesdeFavorito(f)} />
                    ))}
                </GridTarjetas>
            )}
        </>
    );
}

function MisPlaylists() {
    const [estado, setEstado] = useState<
        { status: 'cargando' } | { status: 'ok'; playlists: PlaylistRef[] } | { status: 'error' }
    >({ status: 'cargando' });

    useEffect(() => {
        let vivo = true;
        API.misPlaylists()
            .then((data) => vivo && setEstado({ status: 'ok', playlists: data.playlists || [] }))
            .catch((error) => {
                console.error('Error al cargar tus playlists:', error);
                if (vivo) setEstado({ status: 'error' });
            });
        return () => {
            vivo = false;
        };
    }, []);

    return (
        <>
            <h2 className="col-span-full my-[10px] text-[1.4rem] font-bold">Tus playlists</h2>
            {estado.status === 'cargando' && <Spinner texto="Cargando tus playlists..." />}
            {estado.status === 'error' && <ErrorCarga texto="Error al cargar tus playlists. Probá de nuevo." />}
            {estado.status === 'ok' && (
                <GridTarjetas>
                    {estado.playlists.length === 0 && (
                        <SinResultados texto="No tenés playlists todavía. Creá una en Spotify y volvé a entrar." />
                    )}
                    {estado.playlists.map((p) => (
                        <PlaylistCard key={p.id} playlist={p} abrirDetalle />
                    ))}
                </GridTarjetas>
            )}
        </>
    );
}
