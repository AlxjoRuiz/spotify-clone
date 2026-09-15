import { useEffect, useRef } from 'react';
import { usePlayer } from '../../hooks/usePlayer';

// Barra inferior. Usa el preview_url de Spotify (30s) como el reproductor legacy.
export function Player() {
    const cola = usePlayer((s) => s.cola);
    const indice = usePlayer((s) => s.indice);
    const siguiente = usePlayer((s) => s.siguiente);
    const anterior = usePlayer((s) => s.anterior);
    const audioRef = useRef<HTMLAudioElement>(null);

    const actual = indice >= 0 ? cola[indice] : null;

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (actual?.preview_url) {
            audio.src = actual.preview_url;
            void audio.play().catch(() => {});
        } else {
            audio.pause();
        }
    }, [actual]);

    return (
        <footer className="flex items-center justify-between gap-4 border-t border-zinc-800 bg-black px-4 py-3 text-white">
            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{actual?.name ?? 'Sin reproducir'}</p>
                <p className="truncate text-sm text-zinc-400">
                    {actual ? actual.artists.map((a) => a.name).join(', ') : '-'}
                </p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={anterior} className="rounded-full bg-zinc-800 px-3 py-2">⏮</button>
                <button onClick={siguiente} className="rounded-full bg-zinc-800 px-3 py-2">⏭</button>
            </div>
            <audio ref={audioRef} onEnded={siguiente} />
        </footer>
    );
}
