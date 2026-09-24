import { useEffect, useState } from 'react';
import { API } from '../api';
import { ArtistCard, PlaylistCard, TrackCard } from '../componentes';
import { GridTarjetas, SinResultados } from '../componentes';
import { Spinner } from '../componentes';
import type { Artist, PlaylistRef, Track } from '../tipos';

// Vista Inicio: playlists populares + secciones "Hecho para ti".
// Carga una sola vez (cache de módulo).
type Estado<T> = { status: 'cargando' } | { status: 'ok'; datos: T } | { status: 'error' };

let cachePlaylists: PlaylistRef[] | null = null;
let cacheRecientes: Track[] | null = null;
let cacheArtistas: Artist[] | null = null;
let cacheTracks: Track[] | null = null;

export function Inicio() {
    const [playlists, setPlaylists] = useState<Estado<PlaylistRef[]>>(
        cachePlaylists ? { status: 'ok', datos: cachePlaylists } : { status: 'cargando' }
    );
    const [recientes, setRecientes] = useState<Track[] | null>(cacheRecientes);
    const [artistas, setArtistas] = useState<Artist[] | null>(cacheArtistas);
    const [tracks, setTracks] = useState<Track[] | null>(cacheTracks);

    useEffect(() => {
        if (!cachePlaylists) {
            API.playlistsPopulares()
                .then((data) => {
                    const lista = (data.playlists || []).filter((p) => p.images && p.images.length > 0);
                    cachePlaylists = lista;
                    setPlaylists({ status: 'ok', datos: lista });
                })
                .catch(() => setPlaylists({ status: 'error' }));
        }
        if (!cacheRecientes || !cacheArtistas || !cacheTracks) {
            void Promise.allSettled([API.cancionesRecientes(), API.topArtistas(), API.topTracks()]).then(
                ([rec, art, trk]) => {
                    if (rec.status === 'fulfilled') {
                        const lista = (rec.value?.items || []).map((i) => i?.track).filter((t) => t && t.id);
                        cacheRecientes = lista as Track[];
                        setRecientes(lista as Track[]);
                    } else {
                        console.error('Error al cargar recientes en el home:', rec.reason);
                    }
                    if (art.status === 'fulfilled') {
                        cacheArtistas = art.value?.items ?? [];
                        setArtistas(art.value?.items ?? []);
                    } else {
                        console.error('Error al cargar top artistas en el home:', art.reason);
                    }
                    if (trk.status === 'fulfilled') {
                        cacheTracks = trk.value?.items ?? [];
                        setTracks(trk.value?.items ?? []);
                    } else {
                        console.error('Error al cargar top tracks en el home:', trk.reason);
                    }
                }
            );
        }
    }, []);

    return (
        <>
            <h2 className="col-span-full my-[10px] text-[1.4rem] font-bold">Para empezar</h2>
            {playlists.status === 'cargando' && <Spinner texto="Cargando playlists..." />}
            {playlists.status === 'error' && <SinResultados texto="Error al cargar las playlists." />}
            {playlists.status === 'ok' && (
                <GridTarjetas>
                    {playlists.datos.length === 0 && <SinResultados texto="No se encontraron playlists." />}
                    {playlists.datos.map((p) => (
                        <PlaylistCard key={p.id} playlist={p} />
                    ))}
                </GridTarjetas>
            )}

            {recientes !== null && (
                <>
                    <h2 className="col-span-full my-[10px] text-[1.4rem] font-bold">Escuchado recientemente</h2>
                    <GridTarjetas>
                        {recientes.length === 0 && (
                            <SinResultados texto="Todavía no tenés reproducciones recientes en Spotify." />
                        )}
                        {recientes.map((t) => (
                            <TrackCard key={t.id} track={t} />
                        ))}
                    </GridTarjetas>
                </>
            )}
            {artistas !== null && (
                <>
                    <h2 className="col-span-full my-[10px] text-[1.4rem] font-bold">Tus artistas más escuchados</h2>
                    <GridTarjetas>
                        {artistas.length === 0 && (
                            <SinResultados texto="Todavía no tenés suficientes datos de escucha." />
                        )}
                        {artistas.map((a) => (
                            <ArtistCard key={a.id} artista={a} />
                        ))}
                    </GridTarjetas>
                </>
            )}
            {tracks !== null && (
                <>
                    <h2 className="col-span-full my-[10px] text-[1.4rem] font-bold">Tus canciones más escuchadas</h2>
                    <GridTarjetas>
                        {tracks.length === 0 && (
                            <SinResultados texto="Todavía no tenés suficientes datos de escucha." />
                        )}
                        {tracks.map((t) => (
                            <TrackCard key={t.id} track={t} />
                        ))}
                    </GridTarjetas>
                </>
            )}
        </>
    );
}
