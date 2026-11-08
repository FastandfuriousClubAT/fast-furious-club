const CACHE_NAME = "ffc-club-v46";
const APP_SHELL = [
  "/fast-furious-club/",
  "/fast-furious-club/index.html",
  "/fast-furious-club/manifest.webmanifest",
  "/fast-furious-club/pwa-icon-192.png",
  "/fast-furious-club/pwa-icon-512.png",
  "/fast-furious-club/app-icon-192.png",
  "/fast-furious-club/app-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        APP_SHELL.map(url => cache.add(url).catch(error => {
          console.warn("FFC optional cache entry failed:", url, error);
          return null;
        }))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith("ffc-club-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache =>
            cache.put("/fast-furious-club/index.html", copy)
          );
        }
        return response;
      }).catch(() => caches.match("/fast-furious-club/index.html"))
    );
    return;
  }
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
