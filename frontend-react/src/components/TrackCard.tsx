import type { Track } from '../lib/types';
import { usePlayer } from '../hooks/usePlayer';

// Equivalente React+Tailwind de crearTarjetaCancion() en frontend/scripts/componentes.js
export function TrackCard({ track }: { track: Track }) {
    const play = usePlayer((s) => s.play);
    const portada = track.album?.images[0]?.url;

    return (
        <div className="group rounded-xl bg-[#181818] p-4 transition hover:bg-[#282828]">
            {portada ? (
                <img src={portada} alt={track.name} className="aspect-square rounded-lg object-cover" loading="lazy" />
            ) : (
                <div className="aspect-square rounded-lg bg-[#282828]" />
            )}
            <button
                onClick={() => play(track)}
                className="mt-3 rounded-full bg-green-500 px-4 py-2 text-sm font-bold text-black opacity-0 transition group-hover:opacity-100"
            >
                ▶ Play
            </button>
            <p className="mt-2 truncate font-semibold text-white">{track.name}</p>
            <p className="truncate text-sm text-zinc-400">
                {track.artists.map((a) => a.name).join(', ')}
            </p>
            {!track.preview_url && (
                <p className="text-xs text-zinc-500">Sin preview</p>
            )}
        </div>
    );
}
