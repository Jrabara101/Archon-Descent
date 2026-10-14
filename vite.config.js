import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the same build works on GitHub Pages (sub-path) and inside Capacitor.
export default defineConfig({
    base: './',
    plugins: [react()],
    build: {
        outDir: 'dist',
        target: 'es2020',
        chunkSizeWarningLimit: 700,
    },
    server: { port: 5173 },
});
