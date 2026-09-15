import { useEffect, useState } from 'react';
import { API } from '../lib/api';
import type { FavoritoRow } from '../lib/types';

export function Biblioteca() {
    const [favs, setFavs] = useState<FavoritoRow[]>([]);

    useEffect(() => {
        API.listarFavoritos()
            .then((r) => setFavs(r.favoritos ?? []))
            .catch(() => {});
    }, []);

    return (
        <section>
            <h2 className="mb-4 text-2xl font-bold text-white">Tus favoritas (Supabase)</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {favs.map((f) => (
                    <div key={f.id} className="rounded-xl bg-[#181818] p-4">
                        {f.track_imagen && <img src={f.track_imagen} alt={f.track_nombre} className="aspect-square rounded-lg object-cover" />}
                        <p className="mt-2 truncate font-semibold text-white">{f.track_nombre}</p>
                        <p className="truncate text-sm text-zinc-400">{f.track_artista}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}
