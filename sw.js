const CACHE = "infinite-corridor-v59",
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=59",
    "./assets/bestiary-atlas-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=59",
    "./src/random.js?v=59",
    "./src/types.js?v=59",
    "./src/world.js?v=59",
    "./src/items.js?v=59",
    "./src/combat.js?v=59",
    "./src/interactions.js?v=59",
    "./src/persistence.js?v=59",
    "./src/input.js?v=59",
    "./src/game.js?v=59",
    "./src/renderer.js?v=59",
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
