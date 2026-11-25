import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
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
