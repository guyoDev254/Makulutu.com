// Browsers and extensions often request this at the site origin.
// Keep it static so Next does not treat "sw.js" as a creator slug.
self.addEventListener('install', () => {
  self.skipWaiting()
})
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration
      .unregister()
      .then(() => self.clients.matchAll())
      .then((clients) => {
        clients.forEach((client) => {
          if (client.url && 'navigate' in client) {
            client.navigate(client.url)
          }
        })
      }),
  )
})
