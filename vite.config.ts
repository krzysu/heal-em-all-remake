import { defineConfig } from 'vitest/config'

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
  test: {
    // Map parsing needs DOMParser and the state store needs localStorage.
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
  },
})
