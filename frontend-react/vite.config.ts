import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Dev en :5173, proxy a Express :3000 (mismo /api y /auth del server JS).
// El frontend legacy en frontend/ sigue servido por Express sin cambios.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 5173,
        proxy: {
            '/api': 'http://127.0.0.1:3000',
            '/auth': 'http://127.0.0.1:3000',
        },
    },
});
