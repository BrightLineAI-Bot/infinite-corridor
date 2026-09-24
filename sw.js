const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v89`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=89",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=89",
    "./src/proving-ground.js?v=89",
    "./src/proving-ground-fixtures.js?v=89",
    "./src/elites.js?v=89",
    "./src/random.js?v=89",
    "./src/types.js?v=89",
    "./src/story.js?v=89",
    "./src/foundry.js?v=89",
    "./src/world.js?v=89",
    "./src/deep-dungeons.js?v=89",
    "./src/scenes.js?v=89",
    "./src/arenas.js?v=89",
    "./src/items.js?v=89",
    "./src/combat.js?v=89",
    "./src/interactions.js?v=89",
    "./src/persistence.js?v=89",
    "./src/input.js?v=89",
    "./src/game.js?v=89",
    "./src/renderer.js?v=89",
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
        Promise.all(
          ks.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k)),
        ),
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
