import { useEffect, useState } from 'react';
import { API } from '../api';
import { useNav } from '../navegacion';
import { AlbumCard, ArtistCard, PlaylistCard, TrackCard } from '../componentes';
import { GridTarjetas, SinResultados } from '../componentes';
import { Spinner } from '../componentes';
import type { Artist, PlaylistRef, Track } from '../tipos';

// Vista Inicio — mismo archivo que vistas/inicio.js: hero de accesos
// rápidos + playlists populares + secciones "Hecho para ti".
// Carga una sola vez (cache de módulo, como seccionesCargadas).
const HERO_TILES = [
    { icono: 'fa-solid fa-bolt', texto: 'Lanzamientos', color: '#a020f0', vista: 'Explorar' },
    { icono: 'fa-solid fa-list-ul', texto: 'Tus playlists', color: '#0ea5e9', vista: 'Biblioteca' },
    { icono: 'fa-solid fa-heart', texto: 'Canciones favoritas', color: '#e0245e', vista: 'Biblioteca' },
    { icono: 'fa-solid fa-user', texto: 'Tu perfil', color: '#1db954', vista: 'Perfil' },
    { icono: 'fa-solid fa-magnifying-glass', texto: 'Buscar', color: '#f59e0b', vista: 'Explorar' },
    { icono: 'fa-solid fa-compact-disc', texto: 'Descubrir', color: '#2563eb', vista: 'Explorar' },
] as const;

type Estado<T> = { status: 'cargando' } | { status: 'ok'; datos: T } | { status: 'error' };

let cachePlaylists: PlaylistRef[] | null = null;
let cacheRecientes: Track[] | null = null;
let cacheArtistas: Artist[] | null = null;
let cacheTracks: Track[] | null = null;

export function Inicio() {
    const { navegar } = useNav();
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
            <div className="col-span-full mb-3 grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 max-[480px]:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] max-[480px]:gap-2">
                {HERO_TILES.map((tile) => (
                    <button
                        key={tile.texto}
                        onClick={() => navegar(tile.vista)}
                        style={{ background: tile.color }}
                        className="relative flex cursor-pointer items-center gap-3.5 overflow-hidden rounded-md border-none p-2 text-left text-base font-bold text-white transition-all hover:scale-[1.01] hover:brightness-[1.12] active:scale-[0.99] max-[480px]:gap-2 max-[480px]:p-1.5 max-[480px]:text-[0.8rem]"
                    >
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-black/25 text-[1.5rem] max-[480px]:h-10 max-[480px]:w-10 max-[480px]:text-[1.1rem]">
                            <i className={tile.icono}></i>
                        </span>
                        <span className="truncate">{tile.texto}</span>
                    </button>
                ))}
            </div>

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
