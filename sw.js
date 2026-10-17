/* Service worker — PIXELS PWA */
const CACHE = "bichinho-v0.1.59";
const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./game.js",
  "./player.js",
  "./telemetry.js",
  "./audio.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/accessories/kitty-glasses.png",
  "./assets/accessories/kitty-bow.png",
  "./assets/accessories/kitty-bag.png",
  "./assets/scene/bg_meadow.webp",
  "./assets/scene/bg_garage.webp",
  "./assets/scene/bg_marina.webp",
  "./assets/scene/bg_water.webp",
  "./assets/scene/bg_savanna.webp",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin")) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
