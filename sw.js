const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v96`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=96",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=96",
    "./src/proving-ground.js?v=96",
    "./src/proving-ground-fixtures.js?v=96",
    "./src/proving-ground-labs.js?v=96",
    "./src/dungeon-variation.js?v=96",
    "./src/dungeon-completion.js?v=96",
    "./src/enemy-patterns.js?v=96",
    "./src/monster-pack.js?v=96",
    "./src/monster-render.js?v=96",
    "./src/landscape.js?v=96",
    "./src/landscape-render.js?v=96",
    "./src/underlands.js?v=96",
    "./src/relay-network.js?v=96",
    "./src/combat-visuals.js?v=96",
    "./src/dungeon-framework.js?v=96",
    "./src/elites.js?v=96",
    "./src/random.js?v=96",
    "./src/types.js?v=96",
    "./src/story.js?v=96",
    "./src/foundry.js?v=96",
    "./src/world.js?v=96",
    "./src/deep-dungeons.js?v=96",
    "./src/scenes.js?v=96",
    "./src/arenas.js?v=96",
    "./src/items.js?v=96",
    "./src/combat.js?v=96",
    "./src/interactions.js?v=96",
    "./src/persistence.js?v=96",
    "./src/input.js?v=96",
    "./src/game.js?v=96",
    "./src/renderer.js?v=96",
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
