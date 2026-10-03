// Phase 1: minimal service worker so the app is installable as a PWA.
// Real offline asset caching / sync arrives in Phase 3.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Presence of a fetch handler is required for installability.
// No respondWith() -> requests fall through to the network unchanged.
self.addEventListener('fetch', () => {})
