import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Sidebar } from './components/layout/Sidebar';
import { Player } from './components/player/Player';
import { Inicio } from './pages/Inicio';
import { Explorar } from './pages/Explorar';
import { Biblioteca } from './pages/Biblioteca';
import { PerfilPage } from './pages/Perfil';

export function App() {
    return (
        <BrowserRouter>
            <div className="flex min-h-screen bg-[#121212]">
                <Sidebar />
                <div className="flex flex-1 flex-col">
                    <main className="flex-1 p-6">
                        <Routes>
                            <Route path="/" element={<Inicio />} />
                            <Route path="/explorar" element={<Explorar />} />
                            <Route path="/biblioteca" element={<Biblioteca />} />
                            <Route path="/perfil" element={<PerfilPage />} />
                        </Routes>
                    </main>
                    <Player />
                </div>
            </div>
        </BrowserRouter>
    );
}
