import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Configuración de Vite: compila React/Tailwind y conserva las URLs HTML que
// consume Express. El proxy solo facilita llamadas locales durante desarrollo.
// Migración in-place del frontend legacy:
// - Vite root = la raíz del repo (sin proyecto aparte).
// - Entries = las mismas URLs que sirve el backend (/pages/login.html,
//   /pages/dashboard.html) para no tocar OAuth, redirects ni verificarLogin.
// - dist conserva la estructura pages/ por el mismo motivo.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                login: 'pages/login.html',
                dashboard: 'pages/dashboard.html',
            },
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': 'http://127.0.0.1',
            '/auth': 'http://127.0.0.1',
        },
    },
});
