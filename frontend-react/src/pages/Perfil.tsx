import { useEffect, useState } from 'react';
import { API } from '../lib/api';
import type { Perfil } from '../types/spotify';

export function PerfilPage() {
    const [perfil, setPerfil] = useState<Perfil | null>(null);

    useEffect(() => {
        API.perfil()
            .then(setPerfil)
            .catch(() => {});
    }, []);

    if (!perfil) return <p className="text-zinc-400">Inicia sesión para ver tu perfil.</p>;

    return (
        <section className="flex items-center gap-4">
            {perfil.imagen && <img src={perfil.imagen} alt={perfil.nombre} className="h-20 w-20 rounded-full object-cover" />}
            <div>
                <h2 className="text-2xl font-bold text-white">{perfil.nombre}</h2>
                <p className="text-sm text-zinc-400">{perfil.email} · {perfil.pais} · {perfil.seguidores} seguidores</p>
            </div>
        </section>
    );
}
