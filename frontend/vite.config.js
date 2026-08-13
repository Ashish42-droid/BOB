import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://bob-production-4e27.up.railway.app',
        changeOrigin: true
      },
      '/signal': {
        target: 'wss://bob-production-4e27.up.railway.app',
        ws: true,
        changeOrigin: true
      }
    }
  }
});
