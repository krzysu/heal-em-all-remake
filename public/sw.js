// Service worker for installability (browsers require a fetch handler) plus a
// cached offline fallback. Production only: `main.ts` registers it under
// `import.meta.env.PROD`, so Vite's dev server and HMR are never intercepted.
const CACHE = 'heal-em-all-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  // Only same-origin GETs; let fonts and anything cross-origin go to the network.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // Navigations: network first so a new deploy is picked up, caching the response
  // as the offline fallback. The HTML has no fingerprint, so it must not be
  // served cache-first.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          if (response.ok) {
            const cache = await caches.open(CACHE)
            cache.put(request, response.clone())
          }
          return response
        } catch {
          return (await caches.match(request)) || (await caches.match('./index.html'))
        }
      })(),
    )
    return
  }

  // Everything else (levels, atlases, audio, the hashed JS bundle) is immutable
  // or fingerprinted, so cache-first is safe and makes repeat play instant.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached

      const response = await fetch(request)
      if (response.ok && response.type === 'basic') cache.put(request, response.clone())
      return response
    }),
  )
})
