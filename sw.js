const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v115`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=115",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=115",
    "./src/proving-ground.js?v=115",
    "./src/proving-ground-fixtures.js?v=115",
    "./src/proving-ground-labs.js?v=115",
    "./src/dungeon-variation.js?v=115",
    "./src/dungeon-completion.js?v=115",
    "./src/enemy-patterns.js?v=115",
    "./src/monster-pack.js?v=115",
    "./src/monster-render.js?v=115",
    "./src/landscape.js?v=115",
    "./src/landscape-render.js?v=115",
    "./src/underlands.js?v=115",
    "./src/relay-network.js?v=115",
    "./src/glyphs.js?v=115",
    "./src/echoes.js?v=115",
    "./src/constellation.js?v=115",
    "./src/water-traversal.js?v=115",
    "./src/boats.js?v=115",
    "./src/sea-creatures.js?v=115",
    "./src/diving.js?v=115",
    "./src/grottoes.js?v=115",
    "./src/spell-slots.js?v=115",
    "./src/settlements.js?v=115",
    "./src/skirmishes.js?v=115",
    "./src/travelers.js?v=115",
    "./src/combat-visuals.js?v=115",
    "./src/dungeon-framework.js?v=115",
    "./src/elites.js?v=115",
    "./src/random.js?v=115",
    "./src/types.js?v=115",
    "./src/story.js?v=115",
    "./src/foundry.js?v=115",
    "./src/world.js?v=115",
    "./src/deep-dungeons.js?v=115",
    "./src/scenes.js?v=115",
    "./src/arenas.js?v=115",
    "./src/items.js?v=115",
    "./src/combat.js?v=115",
    "./src/interactions.js?v=115",
    "./src/persistence.js?v=115",
    "./src/input.js?v=115",
    "./src/game.js?v=115",
    "./src/renderer.js?v=115",
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
