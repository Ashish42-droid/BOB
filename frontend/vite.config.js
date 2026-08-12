import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'bob-production-4e27.up.railway.app',
        changeOrigin: true
      },
      '/signal': {
        target: 'ws://localhost:5001',
        ws: true,
        changeOrigin: true
      }
    }
  }
});
