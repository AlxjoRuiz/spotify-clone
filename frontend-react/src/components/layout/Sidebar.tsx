import { NavLink } from 'react-router-dom';

const link = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white'}`;

// Sidebar equivalente a dashboard.html:21-46
export function Sidebar() {
    return (
        <aside className="w-60 shrink-0 bg-black p-4 text-white">
            <h2 className="mb-4 text-xl font-bold">Spotify</h2>
            <nav className="flex flex-col gap-1">
                <NavLink to="/" className={link}>Inicio</NavLink>
                <NavLink to="/explorar" className={link}>Explorar</NavLink>
                <NavLink to="/biblioteca" className={link}>Biblioteca</NavLink>
                <NavLink to="/perfil" className={link}>Perfil</NavLink>
            </nav>
            <a href="/auth/spotify" className="mt-6 block rounded-full bg-green-500 px-4 py-2 text-center font-bold text-black">
                Login con Spotify
            </a>
        </aside>
    );
}
