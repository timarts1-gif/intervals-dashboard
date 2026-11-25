import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      // Twee aparte apps: het eigen dashboard en de gedeelde coachpagina.
      input: { main: resolve(__dirname, 'index.html'), share: resolve(__dirname, 'share/index.html') },
      output: { manualChunks: { charts: ['recharts'], vendor: ['react', 'react-dom', 'react-router-dom', 'date-fns'] } },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // In development stuurt Vite /api door naar de lokale Node-backend.
      '/api': 'http://localhost:4000',
    },
  },
});
