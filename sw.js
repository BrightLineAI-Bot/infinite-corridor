const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v153`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=153",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=153",
    "./src/proving-ground.js?v=153",
    "./src/proving-ground-fixtures.js?v=153",
    "./src/proving-ground-labs.js?v=153",
    "./src/dungeon-variation.js?v=153",
    "./src/dungeon-completion.js?v=153",
    "./src/enemy-patterns.js?v=153",
    "./src/monster-pack.js?v=153",
    "./src/monster-render.js?v=153",
    "./src/landscape.js?v=153",
    "./src/landscape-render.js?v=153",
    "./src/underlands.js?v=153",
    "./src/pattern-dungeons.js?v=153",
    "./src/relay-network.js?v=153",
    "./src/glyphs.js?v=153",
    "./src/echoes.js?v=153",
    "./src/constellation.js?v=153",
    "./src/water-traversal.js?v=153",
    "./src/boats.js?v=153",
    "./src/sea-creatures.js?v=153",
    "./src/diving.js?v=153",
    "./src/grottoes.js?v=153",
    "./src/spell-slots.js?v=153",
    "./src/settlements.js?v=153",
    "./src/skirmishes.js?v=153",
    "./src/travelers.js?v=153",
    "./src/questing-beast.js?v=153",
    "./src/recitations.js?v=153",
    "./src/far-array.js?v=153",
    "./src/combat-visuals.js?v=153",
    "./src/dungeon-framework.js?v=153",
    "./src/elites.js?v=153",
    "./src/random.js?v=153",
    "./src/types.js?v=153",
    "./src/story.js?v=153",
    "./src/foundry.js?v=153",
    "./src/world.js?v=153",
    "./src/deep-dungeons.js?v=153",
    "./src/scenes.js?v=153",
    "./src/arenas.js?v=153",
    "./src/items.js?v=153",
    "./src/combat.js?v=153",
    "./src/interactions.js?v=153",
    "./src/persistence.js?v=153",
    "./src/input.js?v=153",
    "./src/game.js?v=153",
    "./src/renderer.js?v=153",
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
