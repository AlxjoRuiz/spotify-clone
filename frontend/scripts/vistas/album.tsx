import { useEffect, useState } from 'react';
import { API } from '../api';
import { useNav } from '../navegacion';
import { PORTADA_DEFECTO, formatearDuracionTotal } from '../utils';
import { ErrorCarga, Spinner, TrackList } from '../componentes';
import type { AlbumDetalle } from '../tipos';

// Vista álbum — mismo archivo que vistas/album.js: encabezado + lista +
// "Volver a resultados" (usa volverAResultados del contexto).
export function DetalleAlbum({ id }: { id: string }) {
    const { volverAResultados } = useNav();
    const [estado, setEstado] = useState<
        { status: 'cargando' } | { status: 'ok'; data: AlbumDetalle } | { status: 'error' }
    >({ status: 'cargando' });

    useEffect(() => {
        let vivo = true;
        API.albumTracks(id)
            .then((data) => vivo && setEstado({ status: 'ok', data }))
            .catch((error) => {
                console.error('Error al cargar álbum:', error);
                if (vivo) setEstado({ status: 'error' });
            });
        return () => {
            vivo = false;
        };
    }, [id]);

    if (estado.status === 'cargando') return <Spinner texto="Cargando álbum..." />;
    if (estado.status === 'error') return <ErrorCarga texto="Error al cargar el álbum. Intentá de nuevo." />;

    const { album, tracks } = estado.data;
    const duracion = formatearDuracionTotal((tracks || []).reduce((acc, t) => acc + (t.duration_ms || 0), 0));

    return (
        <>
            <div className="col-span-full mb-6 flex items-end gap-6 border-b border-[#282828] pb-6">
                <img
                    src={album.portada || PORTADA_DEFECTO}
                    alt={album.nombre}
                    className="h-[200px] w-[200px] rounded-lg object-cover shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
                />
                <div className="flex flex-col gap-1">
                    <p className="m-0 text-[0.75rem] uppercase text-[#B3B3B3]">Álbum</p>
                    <h2 className="m-0 my-2 text-[2.5rem] font-black leading-[1.1]">{album.nombre}</h2>
                    <p className="m-0 text-[1rem] text-[#B3B3B3]">{album.artista}</p>
                    <p className="m-0 mt-1 text-[0.85rem] text-[#727272]">
                        {album.total_canciones ?? tracks.length} canciones · {album.fecha ?? ''} · {duracion}
                    </p>
                </div>
            </div>
            <button
                onClick={volverAResultados}
                className="col-span-full mb-3 cursor-pointer border-none bg-transparent px-0 py-2 font-['Poppins',sans-serif] text-[0.85rem] text-[#B3B3B3] transition-colors hover:text-white"
            >
                <i className="fa-solid fa-arrow-left mr-1.5"></i> Volver a resultados
            </button>
            <TrackList tracks={tracks} portada={album.portada} />
        </>
    );
}
