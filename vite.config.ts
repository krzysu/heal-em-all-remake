import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const { version } = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }

export default defineConfig({
  // Relative base keeps the build portable to any static host / subpath.
  base: './',
  // Exposed to the app so the service worker cache is keyed by the release
  // version (see `main.ts` and `public/sw.js`).
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  server: {
    host: true,
    port: 8080,
    // Fixed port: the documented URL must not silently move.
    strictPort: true,
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
