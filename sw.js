const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v90`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=90",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=90",
    "./src/proving-ground.js?v=90",
    "./src/proving-ground-fixtures.js?v=90",
    "./src/proving-ground-labs.js?v=90",
    "./src/elites.js?v=90",
    "./src/random.js?v=90",
    "./src/types.js?v=90",
    "./src/story.js?v=90",
    "./src/foundry.js?v=90",
    "./src/world.js?v=90",
    "./src/deep-dungeons.js?v=90",
    "./src/scenes.js?v=90",
    "./src/arenas.js?v=90",
    "./src/items.js?v=90",
    "./src/combat.js?v=90",
    "./src/interactions.js?v=90",
    "./src/persistence.js?v=90",
    "./src/input.js?v=90",
    "./src/game.js?v=90",
    "./src/renderer.js?v=90",
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
