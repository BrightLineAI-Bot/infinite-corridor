const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v183`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=183",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=183",
    "./src/proving-ground.js?v=183",
    "./src/proving-ground-fixtures.js?v=183",
    "./src/proving-ground-labs.js?v=183",
    "./src/dungeon-variation.js?v=183",
    "./src/dungeon-completion.js?v=183",
    "./src/enemy-patterns.js?v=183",
    "./src/monster-pack.js?v=183",
    "./src/monster-render.js?v=183",
    "./src/landscape.js?v=183",
    "./src/landscape-render.js?v=183",
    "./src/underlands.js?v=183",
    "./src/pattern-dungeons.js?v=183",
    "./src/relay-network.js?v=183",
    "./src/glyphs.js?v=183",
    "./src/echoes.js?v=183",
    "./src/constellation.js?v=183",
    "./src/water-traversal.js?v=183",
    "./src/open-sea.js?v=183",
    "./src/boats.js?v=183",
    "./src/sea-creatures.js?v=183",
    "./src/diving.js?v=183",
    "./src/grottoes.js?v=183",
    "./src/spell-slots.js?v=183",
    "./src/settlements.js?v=183",
    "./src/skirmishes.js?v=183",
    "./src/travelers.js?v=183",
    "./src/diagnostic-probe.js?v=183",
    "./src/questing-beast.js?v=183",
    "./src/recitations.js?v=183",
    "./src/far-array.js?v=183",
    "./src/combat-visuals.js?v=183",
    "./src/dungeon-framework.js?v=183",
    "./src/elites.js?v=183",
    "./src/random.js?v=183",
    "./src/types.js?v=183",
    "./src/story.js?v=183",
    "./src/foundry.js?v=183",
    "./src/world.js?v=183",
    "./src/deep-dungeons.js?v=183",
    "./src/scenes.js?v=183",
    "./src/arenas.js?v=183",
    "./src/items.js?v=183",
    "./src/combat.js?v=183",
    "./src/interactions.js?v=183",
    "./src/persistence.js?v=183",
    "./src/input.js?v=183",
    "./src/game.js?v=183",
    "./src/renderer.js?v=183",
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
