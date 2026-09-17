import { defineConfig } from 'vite'

export default defineConfig({
  // Relative base keeps the build portable to any static host / subpath.
  base: './',
  server: {
    host: true,
    port: 8080,
    open: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
  },
})
