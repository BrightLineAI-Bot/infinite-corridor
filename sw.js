const CACHE = "infinite-corridor-v50",
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=50",
    "./assets/bestiary-atlas-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=50",
    "./src/random.js?v=50",
    "./src/types.js?v=50",
    "./src/world.js?v=50",
    "./src/items.js?v=50",
    "./src/combat.js?v=50",
    "./src/interactions.js?v=50",
    "./src/persistence.js?v=50",
    "./src/input.js?v=50",
    "./src/game.js?v=50",
    "./src/renderer.js?v=50",
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
