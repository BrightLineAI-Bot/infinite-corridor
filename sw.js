const CACHE = "infinite-corridor-v57",
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=57",
    "./assets/bestiary-atlas-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=57",
    "./src/random.js?v=57",
    "./src/types.js?v=57",
    "./src/world.js?v=57",
    "./src/items.js?v=57",
    "./src/combat.js?v=57",
    "./src/interactions.js?v=57",
    "./src/persistence.js?v=57",
    "./src/input.js?v=57",
    "./src/game.js?v=57",
    "./src/renderer.js?v=57",
  ];
self.addEventListener("install", (e) =>
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((ks) =>
        Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  if (e.request.method === "GET")
    e.respondWith(
      caches.match(e.request).then(
        (r) =>
          r ||
          fetch(e.request)
            .then((n) => {
              const c = n.clone();
              caches.open(CACHE).then((x) => x.put(e.request, c));
              return n;
            })
            .catch(() => caches.match("./index.html")),
      ),
    );
});
