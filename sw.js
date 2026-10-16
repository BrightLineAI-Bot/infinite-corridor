const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v114`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=114",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=114",
    "./src/proving-ground.js?v=114",
    "./src/proving-ground-fixtures.js?v=114",
    "./src/proving-ground-labs.js?v=114",
    "./src/dungeon-variation.js?v=114",
    "./src/dungeon-completion.js?v=114",
    "./src/enemy-patterns.js?v=114",
    "./src/monster-pack.js?v=114",
    "./src/monster-render.js?v=114",
    "./src/landscape.js?v=114",
    "./src/landscape-render.js?v=114",
    "./src/underlands.js?v=114",
    "./src/relay-network.js?v=114",
    "./src/glyphs.js?v=114",
    "./src/echoes.js?v=114",
    "./src/constellation.js?v=114",
    "./src/water-traversal.js?v=114",
    "./src/boats.js?v=114",
    "./src/sea-creatures.js?v=114",
    "./src/diving.js?v=114",
    "./src/grottoes.js?v=114",
    "./src/spell-slots.js?v=114",
    "./src/settlements.js?v=114",
    "./src/skirmishes.js?v=114",
    "./src/travelers.js?v=114",
    "./src/combat-visuals.js?v=114",
    "./src/dungeon-framework.js?v=114",
    "./src/elites.js?v=114",
    "./src/random.js?v=114",
    "./src/types.js?v=114",
    "./src/story.js?v=114",
    "./src/foundry.js?v=114",
    "./src/world.js?v=114",
    "./src/deep-dungeons.js?v=114",
    "./src/scenes.js?v=114",
    "./src/arenas.js?v=114",
    "./src/items.js?v=114",
    "./src/combat.js?v=114",
    "./src/interactions.js?v=114",
    "./src/persistence.js?v=114",
    "./src/input.js?v=114",
    "./src/game.js?v=114",
    "./src/renderer.js?v=114",
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
