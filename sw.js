const CACHE = "infinite-corridor-v85",
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=85",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=85",
    "./src/elites.js?v=85",
    "./src/random.js?v=85",
    "./src/types.js?v=85",
    "./src/story.js?v=85",
    "./src/foundry.js?v=85",
    "./src/world.js?v=85",
    "./src/deep-dungeons.js?v=85",
    "./src/items.js?v=85",
    "./src/combat.js?v=85",
    "./src/interactions.js?v=85",
    "./src/persistence.js?v=85",
    "./src/input.js?v=85",
    "./src/game.js?v=85",
    "./src/renderer.js?v=85",
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
