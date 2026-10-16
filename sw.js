const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v143`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=143",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=143",
    "./src/proving-ground.js?v=143",
    "./src/proving-ground-fixtures.js?v=143",
    "./src/proving-ground-labs.js?v=143",
    "./src/dungeon-variation.js?v=143",
    "./src/dungeon-completion.js?v=143",
    "./src/enemy-patterns.js?v=143",
    "./src/monster-pack.js?v=143",
    "./src/monster-render.js?v=143",
    "./src/landscape.js?v=143",
    "./src/landscape-render.js?v=143",
    "./src/underlands.js?v=143",
    "./src/relay-network.js?v=143",
    "./src/glyphs.js?v=143",
    "./src/echoes.js?v=143",
    "./src/constellation.js?v=143",
    "./src/water-traversal.js?v=143",
    "./src/boats.js?v=143",
    "./src/sea-creatures.js?v=143",
    "./src/diving.js?v=143",
    "./src/grottoes.js?v=143",
    "./src/spell-slots.js?v=143",
    "./src/settlements.js?v=143",
    "./src/skirmishes.js?v=143",
    "./src/travelers.js?v=143",
    "./src/questing-beast.js?v=143",
    "./src/recitations.js?v=143",
    "./src/far-array.js?v=143",
    "./src/combat-visuals.js?v=143",
    "./src/dungeon-framework.js?v=143",
    "./src/elites.js?v=143",
    "./src/random.js?v=143",
    "./src/types.js?v=143",
    "./src/story.js?v=143",
    "./src/foundry.js?v=143",
    "./src/world.js?v=143",
    "./src/deep-dungeons.js?v=143",
    "./src/scenes.js?v=143",
    "./src/arenas.js?v=143",
    "./src/items.js?v=143",
    "./src/combat.js?v=143",
    "./src/interactions.js?v=143",
    "./src/persistence.js?v=143",
    "./src/input.js?v=143",
    "./src/game.js?v=143",
    "./src/renderer.js?v=143",
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
