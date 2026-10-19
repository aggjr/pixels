/* Service worker — PIXELS PWA */
const CACHE = "bichinho-v0.2.5";
const PRECACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./game.js",
  "./looks.js",
  "./catalog.js",
  "./wardrobe.js",
  "./assets/pets/lili-dressed-photo.png",
  "./assets/pets/lili-dressed-sleep.png",
  "./assets/pets/lili-dressed-sad.png",
  "./assets/pets/lili-dressed-eat.png",
  "./assets/pets/lili-dressed-chew.png",
  "./assets/accessories/toy-star-ball.png",
  "./player.js",
  "./telemetry.js",
  "./audio.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/accessories/kitty-glasses.png",
  "./assets/accessories/kitty-bow.png",
  "./assets/accessories/kitty-bag.png",
  "./assets/care/food-bowl-berry.png",
  "./assets/care/food-bowl-fish.png",
  "./assets/care/food-bowl-empty.png",
  "./assets/care/drink-water-bowl.png",
  "./assets/care/bath-foam-suit.png",
  "./assets/care/bath-foam-crown.png",
  "./assets/care/bath-sponge.png",
  "./assets/care/bath-showerhead.png",
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
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, clone));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
