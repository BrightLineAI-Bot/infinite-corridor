const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v107`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=107",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=107",
    "./src/proving-ground.js?v=107",
    "./src/proving-ground-fixtures.js?v=107",
    "./src/proving-ground-labs.js?v=107",
    "./src/dungeon-variation.js?v=107",
    "./src/dungeon-completion.js?v=107",
    "./src/enemy-patterns.js?v=107",
    "./src/monster-pack.js?v=107",
    "./src/monster-render.js?v=107",
    "./src/landscape.js?v=107",
    "./src/landscape-render.js?v=107",
    "./src/underlands.js?v=107",
    "./src/relay-network.js?v=107",
    "./src/glyphs.js?v=107",
    "./src/echoes.js?v=107",
    "./src/constellation.js?v=107",
    "./src/water-traversal.js?v=107",
    "./src/boats.js?v=107",
    "./src/sea-creatures.js?v=107",
    "./src/diving.js?v=107",
    "./src/combat-visuals.js?v=107",
    "./src/dungeon-framework.js?v=107",
    "./src/elites.js?v=107",
    "./src/random.js?v=107",
    "./src/types.js?v=107",
    "./src/story.js?v=107",
    "./src/foundry.js?v=107",
    "./src/world.js?v=107",
    "./src/deep-dungeons.js?v=107",
    "./src/scenes.js?v=107",
    "./src/arenas.js?v=107",
    "./src/items.js?v=107",
    "./src/combat.js?v=107",
    "./src/interactions.js?v=107",
    "./src/persistence.js?v=107",
    "./src/input.js?v=107",
    "./src/game.js?v=107",
    "./src/renderer.js?v=107",
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
