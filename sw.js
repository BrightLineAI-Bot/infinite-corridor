const CACHE = "infinite-corridor-v81",
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=81",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=81",
    "./src/elites.js?v=81",
    "./src/random.js?v=81",
    "./src/types.js?v=81",
    "./src/world.js?v=81",
    "./src/items.js?v=81",
    "./src/combat.js?v=81",
    "./src/interactions.js?v=81",
    "./src/persistence.js?v=81",
    "./src/input.js?v=81",
    "./src/game.js?v=81",
    "./src/renderer.js?v=81",
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
