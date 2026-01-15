import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import devtools from 'solid-devtools/vite';

export default defineConfig({
  plugins: [devtools(), solidPlugin()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://air.sebastianboyd.com',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'esnext',
  },
});
