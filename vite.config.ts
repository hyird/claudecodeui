import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  // viteSingleFile inlines JS + CSS into a single dist/index.html the Node server hosts.
  plugins: [react(), viteSingleFile()],
  build: {
    // Keep native logical assignment in xterm's published ESM. Downleveling its
    // mode-query parser with older esbuild releases can strand the write queue.
    target: 'es2022',
  },
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
