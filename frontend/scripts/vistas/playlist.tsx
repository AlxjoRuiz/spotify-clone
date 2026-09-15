import { useEffect, useState } from 'react';
import { API } from '../api';
import { useNav } from '../navegacion';
import { PORTADA_DEFECTO, formatearDuracionTotal } from '../utils';
import { ErrorCarga, Spinner, TrackList } from '../componentes';
import type { PlaylistDetalle } from '../tipos';

// Vista playlist — mismo archivo que vistas/playlist.js: encabezado + lista +
// "Volver a Biblioteca" (se muestra dentro de Explorar, como el legacy).
export function DetallePlaylist({ id }: { id: string }) {
    const { navegar } = useNav();
    const [estado, setEstado] = useState<
        { status: 'cargando' } | { status: 'ok'; data: PlaylistDetalle } | { status: 'error' }
    >({ status: 'cargando' });

    useEffect(() => {
        let vivo = true;
        API.playlistTracks(id)
            .then((data) => vivo && setEstado({ status: 'ok', data }))
            .catch((error) => {
                console.error('Error al cargar playlist:', error);
                if (vivo) setEstado({ status: 'error' });
            });
        return () => {
            vivo = false;
        };
    }, [id]);

    if (estado.status === 'cargando') return <Spinner texto="Cargando playlist..." />;
    if (estado.status === 'error') return <ErrorCarga texto="Error al cargar la playlist. Intentá de nuevo." />;

    const { playlist, tracks } = estado.data;
    const duracion = formatearDuracionTotal((tracks || []).reduce((acc, t) => acc + (t.duration_ms || 0), 0));

    return (
        <>
            <div className="col-span-full mb-6 flex items-end gap-6 border-b border-[#282828] pb-6">
                <img
                    src={playlist.portada || PORTADA_DEFECTO}
                    alt={playlist.nombre}
                    className="h-[200px] w-[200px] rounded-lg object-cover shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                />
                <div className="flex flex-col gap-1">
                    <p className="m-0 text-[0.75rem] uppercase text-[#B3B3B3]">Playlist</p>
                    <h2 className="m-0 my-2 text-[2.5rem] font-black leading-[1.1]">{playlist.nombre}</h2>
                    <p className="m-0 text-[1rem] text-[#B3B3B3]">{playlist.dueno}</p>
                    <p className="m-0 mt-1 text-[0.85rem] text-[#727272]">
                        {playlist.total_canciones} canciones · {duracion}
                    </p>
                </div>
            </div>
            <button
                onClick={() => navegar('Biblioteca')}
                className="col-span-full mb-3 cursor-pointer border-none bg-transparent px-0 py-2 font-['Poppins',sans-serif] text-[0.85rem] text-[#B3B3B3] transition-colors hover:text-white"
            >
                <i className="fa-solid fa-arrow-left mr-1.5"></i> Volver a Biblioteca
            </button>
            <TrackList tracks={tracks} portada={playlist.portada} />
        </>
    );
}
