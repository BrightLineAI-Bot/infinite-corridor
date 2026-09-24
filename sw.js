const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v91`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=91",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=91",
    "./src/proving-ground.js?v=91",
    "./src/proving-ground-fixtures.js?v=91",
    "./src/proving-ground-labs.js?v=91",
    "./src/dungeon-framework.js?v=91",
    "./src/elites.js?v=91",
    "./src/random.js?v=91",
    "./src/types.js?v=91",
    "./src/story.js?v=91",
    "./src/foundry.js?v=91",
    "./src/world.js?v=91",
    "./src/deep-dungeons.js?v=91",
    "./src/scenes.js?v=91",
    "./src/arenas.js?v=91",
    "./src/items.js?v=91",
    "./src/combat.js?v=91",
    "./src/interactions.js?v=91",
    "./src/persistence.js?v=91",
    "./src/input.js?v=91",
    "./src/game.js?v=91",
    "./src/renderer.js?v=91",
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
