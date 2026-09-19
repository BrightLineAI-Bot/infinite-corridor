const CACHE = "infinite-corridor-v66",
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=66",
    "./assets/bestiary-atlas-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=66",
    "./src/random.js?v=66",
    "./src/types.js?v=66",
    "./src/world.js?v=66",
    "./src/items.js?v=66",
    "./src/combat.js?v=66",
    "./src/interactions.js?v=66",
    "./src/persistence.js?v=66",
    "./src/input.js?v=66",
    "./src/game.js?v=66",
    "./src/renderer.js?v=66",
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
