const CACHE = "infinite-corridor-v84",
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=84",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=84",
    "./src/elites.js?v=84",
    "./src/random.js?v=84",
    "./src/types.js?v=84",
    "./src/story.js?v=84",
    "./src/foundry.js?v=84",
    "./src/world.js?v=84",
    "./src/deep-dungeons.js?v=84",
    "./src/items.js?v=84",
    "./src/combat.js?v=84",
    "./src/interactions.js?v=84",
    "./src/persistence.js?v=84",
    "./src/input.js?v=84",
    "./src/game.js?v=84",
    "./src/renderer.js?v=84",
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
