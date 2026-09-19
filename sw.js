const CACHE = "infinite-corridor-v67",
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=67",
    "./assets/bestiary-atlas-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=67",
    "./src/random.js?v=67",
    "./src/types.js?v=67",
    "./src/world.js?v=67",
    "./src/items.js?v=67",
    "./src/combat.js?v=67",
    "./src/interactions.js?v=67",
    "./src/persistence.js?v=67",
    "./src/input.js?v=67",
    "./src/game.js?v=67",
    "./src/renderer.js?v=67",
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
