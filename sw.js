const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v142`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=142",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=142",
    "./src/proving-ground.js?v=142",
    "./src/proving-ground-fixtures.js?v=142",
    "./src/proving-ground-labs.js?v=142",
    "./src/dungeon-variation.js?v=142",
    "./src/dungeon-completion.js?v=142",
    "./src/enemy-patterns.js?v=142",
    "./src/monster-pack.js?v=142",
    "./src/monster-render.js?v=142",
    "./src/landscape.js?v=142",
    "./src/landscape-render.js?v=142",
    "./src/underlands.js?v=142",
    "./src/relay-network.js?v=142",
    "./src/glyphs.js?v=142",
    "./src/echoes.js?v=142",
    "./src/constellation.js?v=142",
    "./src/water-traversal.js?v=142",
    "./src/boats.js?v=142",
    "./src/sea-creatures.js?v=142",
    "./src/diving.js?v=142",
    "./src/grottoes.js?v=142",
    "./src/spell-slots.js?v=142",
    "./src/settlements.js?v=142",
    "./src/skirmishes.js?v=142",
    "./src/travelers.js?v=142",
    "./src/questing-beast.js?v=142",
    "./src/recitations.js?v=142",
    "./src/far-array.js?v=142",
    "./src/combat-visuals.js?v=142",
    "./src/dungeon-framework.js?v=142",
    "./src/elites.js?v=142",
    "./src/random.js?v=142",
    "./src/types.js?v=142",
    "./src/story.js?v=142",
    "./src/foundry.js?v=142",
    "./src/world.js?v=142",
    "./src/deep-dungeons.js?v=142",
    "./src/scenes.js?v=142",
    "./src/arenas.js?v=142",
    "./src/items.js?v=142",
    "./src/combat.js?v=142",
    "./src/interactions.js?v=142",
    "./src/persistence.js?v=142",
    "./src/input.js?v=142",
    "./src/game.js?v=142",
    "./src/renderer.js?v=142",
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
