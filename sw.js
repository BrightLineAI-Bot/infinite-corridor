const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v112`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=112",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=112",
    "./src/proving-ground.js?v=112",
    "./src/proving-ground-fixtures.js?v=112",
    "./src/proving-ground-labs.js?v=112",
    "./src/dungeon-variation.js?v=112",
    "./src/dungeon-completion.js?v=112",
    "./src/enemy-patterns.js?v=112",
    "./src/monster-pack.js?v=112",
    "./src/monster-render.js?v=112",
    "./src/landscape.js?v=112",
    "./src/landscape-render.js?v=112",
    "./src/underlands.js?v=112",
    "./src/relay-network.js?v=112",
    "./src/glyphs.js?v=112",
    "./src/echoes.js?v=112",
    "./src/constellation.js?v=112",
    "./src/water-traversal.js?v=112",
    "./src/boats.js?v=112",
    "./src/sea-creatures.js?v=112",
    "./src/diving.js?v=112",
    "./src/grottoes.js?v=112",
    "./src/settlements.js?v=112",
    "./src/skirmishes.js?v=112",
    "./src/combat-visuals.js?v=112",
    "./src/dungeon-framework.js?v=112",
    "./src/elites.js?v=112",
    "./src/random.js?v=112",
    "./src/types.js?v=112",
    "./src/story.js?v=112",
    "./src/foundry.js?v=112",
    "./src/world.js?v=112",
    "./src/deep-dungeons.js?v=112",
    "./src/scenes.js?v=112",
    "./src/arenas.js?v=112",
    "./src/items.js?v=112",
    "./src/combat.js?v=112",
    "./src/interactions.js?v=112",
    "./src/persistence.js?v=112",
    "./src/input.js?v=112",
    "./src/game.js?v=112",
    "./src/renderer.js?v=112",
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
