import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  // viteSingleFile inlines JS + CSS into a single dist/index.html the Bun server hosts.
  plugins: [react(), viteSingleFile()],
  server: {
    port: 5173,
    proxy: {
      '/terminal': {
        target: 'ws://localhost:3001',
        ws: true,
      },
      '/auth': {
        target: 'ws://localhost:3001',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:3001',
      },
    },
  },
});
