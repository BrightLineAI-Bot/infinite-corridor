const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v201`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=201",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=201",
    "./src/proving-ground.js?v=201",
    "./src/proving-ground-fixtures.js?v=201",
    "./src/proving-ground-labs.js?v=201",
    "./src/dungeon-variation.js?v=201",
    "./src/dungeon-completion.js?v=201",
    "./src/enemy-patterns.js?v=201",
    "./src/monster-pack.js?v=201",
    "./src/monster-render.js?v=201",
    "./src/landscape.js?v=201",
    "./src/landscape-render.js?v=201",
    "./src/underlands.js?v=201",
    "./src/pattern-dungeons.js?v=201",
    "./src/relay-network.js?v=201",
    "./src/glyphs.js?v=201",
    "./src/echoes.js?v=201",
    "./src/constellation.js?v=201",
    "./src/water-traversal.js?v=201",
    "./src/open-sea.js?v=201",
    "./src/boats.js?v=201",
    "./src/sea-creatures.js?v=201",
    "./src/diving.js?v=201",
    "./src/grottoes.js?v=201",
    "./src/spell-slots.js?v=201",
    "./src/settlements.js?v=201",
    "./src/skirmishes.js?v=201",
    "./src/travelers.js?v=201",
    "./src/diagnostic-probe.js?v=201",
    "./src/questing-beast.js?v=201",
    "./src/recitations.js?v=201",
    "./src/lore.js?v=201",
    "./src/glimpses.js?v=201",
    "./src/glimpse-render.js?v=201",
    "./src/glimpse-paint.js?v=201",
    "./src/glimpse-scenes.js?v=201",
    "./src/elders.js?v=201",
    "./src/far-array.js?v=201",
    "./src/combat-visuals.js?v=201",
    "./src/dungeon-framework.js?v=201",
    "./src/elites.js?v=201",
    "./src/random.js?v=201",
    "./src/types.js?v=201",
    "./src/story.js?v=201",
    "./src/foundry.js?v=201",
    "./src/world.js?v=201",
    "./src/deep-dungeons.js?v=201",
    "./src/scenes.js?v=201",
    "./src/arenas.js?v=201",
    "./src/items.js?v=201",
    "./src/combat.js?v=201",
    "./src/interactions.js?v=201",
    "./src/persistence.js?v=201",
    "./src/input.js?v=201",
    "./src/game.js?v=201",
    "./src/renderer.js?v=201",
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
