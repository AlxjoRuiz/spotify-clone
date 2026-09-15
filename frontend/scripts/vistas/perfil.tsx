import { useEffect, useState } from 'react';
import { API } from '../api';
import { nombreUsuario } from '../sesion';
import { ArtistCard, ErrorCarga, GridTarjetas, SinResultados, Spinner, TrackCard } from '../componentes';
import type { Artist, Perfil, TimeRange, Track } from '../tipos';

// Vista Perfil — mismo archivo que vistas/perfil.js: datos del usuario,
// top artistas y top tracks con tabs de rango (4 semanas / 6 meses / todo).
// Cache de módulo como perfilCargado/topArtistasCargado/topTracksCargado.
const RANGOS: { id: TimeRange; label: string }[] = [
    { id: 'short_term', label: '4 semanas' },
    { id: 'medium_term', label: '6 meses' },
    { id: 'long_term', label: 'Todo el tiempo' },
];

let cachePerfil: Perfil | null = null;
let cacheTops: Partial<Record<TimeRange, { artistas: Artist[]; tracks: Track[] }>> = {};

export function Perfil() {
    const [perfil, setPerfil] = useState<Perfil | null>(cachePerfil);
    const [perfilError, setPerfilError] = useState(false);
    const [rango, setRango] = useState<TimeRange>('medium_term');
    const [tops, setTops] = useState<{ artistas: Artist[]; tracks: Track[] } | null>(
        cacheTops['medium_term'] ?? null
    );
    const [topsError, setTopsError] = useState(false);

    useEffect(() => {
        if (cachePerfil) return;
        API.perfil()
            .then((p) => {
                cachePerfil = p;
                setPerfil(p);
            })
            .catch((error) => {
                console.error('Error al cargar perfil:', error);
                setPerfilError(true);
            });
    }, []);

    useEffect(() => {
        const hit = cacheTops[rango];
        if (hit) {
            setTops(hit);
            return;
        }
        setTops(null);
        setTopsError(false);
        let vivo = true;
        void Promise.all([API.topArtistas(rango), API.topTracks(rango)])
            .then(([artistas, tracks]) => {
                if (!vivo) return;
                const val = { artistas: artistas.items ?? [], tracks: tracks.items ?? [] };
                cacheTops[rango] = val;
                setTops(val);
            })
            .catch((error) => {
                console.error('Error al cargar tops:', error);
                if (vivo) setTopsError(true);
            });
        return () => {
            vivo = false;
        };
    }, [rango]);

    return (
        <>
            <h2 className="col-span-full my-[10px] text-[1.4rem] font-bold">Tu perfil</h2>
            <div className="col-span-full max-w-[500px] rounded-lg bg-[#181818] p-8 max-md:max-w-full max-md:p-5">
                {!perfil && !perfilError && <Spinner texto="Cargando perfil..." />}
                {!perfil && perfilError && (
                    <>
                        <div className="mb-6 flex h-[100px] w-[100px] items-center justify-center rounded-full bg-[#282828] text-[2.5rem] text-[#B3B3B3]">
                            <i className="fa-solid fa-user"></i>
                        </div>
                        <div className="mb-5 border-b border-[#282828] pb-4">
                            <p className="m-0 mb-1 text-[0.75rem] uppercase tracking-[1px] text-[#B3B3B3]">
                                Nombre de usuario
                            </p>
                            <p className="m-0 text-[1rem] font-semibold">{nombreUsuario}</p>
                        </div>
                        <SinResultados texto="No se pudieron cargar los datos del perfil." />
                    </>
                )}
                {perfil && (
                    <>
                        <div className="mb-6 flex h-[100px] w-[100px] items-center justify-center rounded-full bg-[#282828] text-[2.5rem] text-[#B3B3B3]">
                            {perfil.imagen ? (
                                <img src={perfil.imagen} alt="Foto de perfil" className="h-full w-full rounded-full object-cover" />
                            ) : (
                                <i className="fa-solid fa-user"></i>
                            )}
                        </div>
                        <Dato label="Nombre de usuario" valor={perfil.nombre} />
                        <Dato label="Email" valor={perfil.email} />
                        <Dato
                            label="Tipo de cuenta"
                            valor={perfil.tipo_cuenta === 'premium' ? 'Premium' : 'Free'}
                            premium={perfil.tipo_cuenta === 'premium'}
                        />
                        <Dato label="País" valor={perfil.pais} />
                        <Dato label="Seguidores" valor={perfil.seguidores.toLocaleString()} />
                        <Dato label="Conectado con" valor="Spotify" ultimo />
                    </>
                )}
            </div>

            <h2 className="col-span-full my-[10px] text-[1.4rem] font-bold">Tus estadísticas</h2>
            <div className="col-span-full -my-1.5 mb-2.5 flex flex-wrap gap-2">
                {RANGOS.map((r) => (
                    <button
                        key={r.id}
                        onClick={() => setRango(r.id)}
                        className={`cursor-pointer rounded-[20px] border-none px-3.5 py-1.5 font-['Poppins',sans-serif] text-[0.8rem] font-semibold text-white transition-colors ${
                            rango === r.id ? 'bg-[#1DB954] text-black' : 'bg-[rgba(29,185,84,0.15)] hover:bg-[rgba(29,185,84,0.3)]'
                        }`}
                    >
                        {r.label}
                    </button>
                ))}
            </div>

            <h2 className="col-span-full my-[10px] text-[1.4rem] font-bold">Tus artistas favoritos</h2>
            {!tops && !topsError && <Spinner />}
            {topsError && <ErrorCarga texto="Error al cargar los artistas." />}
            {tops && (
                <GridTarjetas>
                    {tops.artistas.length === 0 && (
                        <SinResultados texto="Todavía no tenés suficientes datos de escucha." />
                    )}
                    {tops.artistas.map((a) => (
                        <ArtistCard key={a.id} artista={a} sublabel={a.genres?.slice(0, 2).join(', ') || 'Artista'} />
                    ))}
                </GridTarjetas>
            )}

            <h2 className="col-span-full my-[10px] text-[1.4rem] font-bold">Tus canciones más escuchadas</h2>
            {!tops && !topsError && <Spinner />}
            {topsError && <ErrorCarga texto="Error al cargar las canciones." />}
            {tops && (
                <GridTarjetas>
                    {tops.tracks.length === 0 && (
                        <SinResultados texto="Todavía no tenés suficientes datos de escucha." />
                    )}
                    {tops.tracks.map((t, i) => (
                        <TrackCard key={t.id} track={t} numeroTop={i + 1} />
                    ))}
                </GridTarjetas>
            )}
        </>
    );
}

function Dato({ label, valor, premium, ultimo }: { label: string; valor: string; premium?: boolean; ultimo?: boolean }) {
    return (
        <div className={`mb-5 border-b border-[#282828] pb-4 ${ultimo ? '!border-b-0' : ''}`}>
            <p className="m-0 mb-1 text-[0.75rem] uppercase tracking-[1px] text-[#B3B3B3]">{label}</p>
            <p className={`m-0 text-[1rem] font-semibold ${premium ? 'font-bold text-[#1DB954]' : ''}`}>
                {valor}
            </p>
        </div>
    );
}
