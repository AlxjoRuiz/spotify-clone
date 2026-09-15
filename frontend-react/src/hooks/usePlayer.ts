import { create } from 'zustand';
import type { Track } from '../lib/types';

interface PlayerState {
    cola: Track[];
    indice: number;
    reproduciendo: boolean;
    play: (track: Track) => void;
    siguiente: () => void;
    anterior: () => void;
}

// Reemplazo del estado suelto de frontend/scripts/reproductor.js
// (colaCanciones, indiceActual, aleatorio...). Empieza simple: cola + índice.
export const usePlayer = create<PlayerState>((set, get) => ({
    cola: [],
    indice: -1,
    reproduciendo: false,
    play: (track) => {
        const { cola } = get();
        const idx = cola.findIndex((t) => t.id === track.id);
        if (idx !== -1) return set({ indice: idx, reproduciendo: true });
        set({ cola: [...cola, track], indice: cola.length, reproduciendo: true });
    },
    siguiente: () => {
        const { cola, indice } = get();
        if (indice < cola.length - 1) set({ indice: indice + 1, reproduciendo: true });
    },
    anterior: () => {
        const { indice } = get();
        if (indice > 0) set({ indice: indice - 1, reproduciendo: true });
    },
}));
