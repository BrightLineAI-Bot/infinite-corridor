const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v116`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=116",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=116",
    "./src/proving-ground.js?v=116",
    "./src/proving-ground-fixtures.js?v=116",
    "./src/proving-ground-labs.js?v=116",
    "./src/dungeon-variation.js?v=116",
    "./src/dungeon-completion.js?v=116",
    "./src/enemy-patterns.js?v=116",
    "./src/monster-pack.js?v=116",
    "./src/monster-render.js?v=116",
    "./src/landscape.js?v=116",
    "./src/landscape-render.js?v=116",
    "./src/underlands.js?v=116",
    "./src/relay-network.js?v=116",
    "./src/glyphs.js?v=116",
    "./src/echoes.js?v=116",
    "./src/constellation.js?v=116",
    "./src/water-traversal.js?v=116",
    "./src/boats.js?v=116",
    "./src/sea-creatures.js?v=116",
    "./src/diving.js?v=116",
    "./src/grottoes.js?v=116",
    "./src/spell-slots.js?v=116",
    "./src/settlements.js?v=116",
    "./src/skirmishes.js?v=116",
    "./src/travelers.js?v=116",
    "./src/questing-beast.js?v=116",
    "./src/combat-visuals.js?v=116",
    "./src/dungeon-framework.js?v=116",
    "./src/elites.js?v=116",
    "./src/random.js?v=116",
    "./src/types.js?v=116",
    "./src/story.js?v=116",
    "./src/foundry.js?v=116",
    "./src/world.js?v=116",
    "./src/deep-dungeons.js?v=116",
    "./src/scenes.js?v=116",
    "./src/arenas.js?v=116",
    "./src/items.js?v=116",
    "./src/combat.js?v=116",
    "./src/interactions.js?v=116",
    "./src/persistence.js?v=116",
    "./src/input.js?v=116",
    "./src/game.js?v=116",
    "./src/renderer.js?v=116",
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
