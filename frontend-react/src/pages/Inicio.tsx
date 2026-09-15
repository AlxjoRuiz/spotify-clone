import { useEffect, useState } from 'react';
import { API } from '../lib/api';
import type { PlaylistSimple } from '../types/spotify';

export function Inicio() {
    const [playlists, setPlaylists] = useState<PlaylistSimple[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        API.playlistsPopulares()
            .then((r) => setPlaylists(r.playlists ?? []))
            .catch(() => setError('Inicia sesión en :3000 para ver datos reales de Spotify'));
    }, []);

    return (
        <section>
            <h2 className="mb-4 text-2xl font-bold text-white">Para empezar</h2>
            {error && <p className="mb-4 text-sm text-amber-400">{error}</p>}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {playlists.map((p) => (
                    <div key={p.id} className="rounded-xl bg-[#181818] p-4 hover:bg-[#282828]">
                        {p.images?.[0]?.url && (
                            <img src={p.images[0].url} alt={p.name} className="aspect-square rounded-lg object-cover" loading="lazy" />
                        )}
                        <p className="mt-2 truncate font-semibold text-white">{p.name}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
