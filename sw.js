const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r229-67bd013e8d1e`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r229-67bd013e8d1e",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r229-67bd013e8d1e",
    "./src/proving-ground.js?v=r229-67bd013e8d1e",
    "./src/proving-ground-fixtures.js?v=r229-67bd013e8d1e",
    "./src/proving-ground-labs.js?v=r229-67bd013e8d1e",
    "./src/dungeon-variation.js?v=r229-67bd013e8d1e",
    "./src/dungeon-completion.js?v=r229-67bd013e8d1e",
    "./src/enemy-patterns.js?v=r229-67bd013e8d1e",
    "./src/monster-pack.js?v=r229-67bd013e8d1e",
    "./src/monster-render.js?v=r229-67bd013e8d1e",
    "./src/landscape.js?v=r229-67bd013e8d1e",
    "./src/landscape-render.js?v=r229-67bd013e8d1e",
    "./src/underlands.js?v=r229-67bd013e8d1e",
    "./src/pattern-dungeons.js?v=r229-67bd013e8d1e",
    "./src/relay-network.js?v=r229-67bd013e8d1e",
    "./src/glyphs.js?v=r229-67bd013e8d1e",
    "./src/echoes.js?v=r229-67bd013e8d1e",
    "./src/constellation.js?v=r229-67bd013e8d1e",
    "./src/water-traversal.js?v=r229-67bd013e8d1e",
    "./src/open-sea.js?v=r229-67bd013e8d1e",
    "./src/boats.js?v=r229-67bd013e8d1e",
    "./src/sea-creatures.js?v=r229-67bd013e8d1e",
    "./src/diving.js?v=r229-67bd013e8d1e",
    "./src/grottoes.js?v=r229-67bd013e8d1e",
    "./src/spell-slots.js?v=r229-67bd013e8d1e",
    "./src/settlements.js?v=r229-67bd013e8d1e",
    "./src/skirmishes.js?v=r229-67bd013e8d1e",
    "./src/travelers.js?v=r229-67bd013e8d1e",
    "./src/diagnostic-probe.js?v=r229-67bd013e8d1e",
    "./src/questing-beast.js?v=r229-67bd013e8d1e",
    "./src/recitations.js?v=r229-67bd013e8d1e",
    "./src/lore.js?v=r229-67bd013e8d1e",
    "./src/glimpses.js?v=r229-67bd013e8d1e",
    "./src/glimpse-render.js?v=r229-67bd013e8d1e",
    "./src/glimpse-paint.js?v=r229-67bd013e8d1e",
    "./src/glimpse-scenes.js?v=r229-67bd013e8d1e",
    "./src/glimpse-horror.js?v=r229-67bd013e8d1e",
    "./src/glimpse-legend.js?v=r229-67bd013e8d1e",
    "./src/glimpse-hand.js?v=r229-67bd013e8d1e",
    "./src/atlas-view.js?v=r229-67bd013e8d1e",
    "./src/strange.js?v=r229-67bd013e8d1e",
    "./src/linked-dungeons.js?v=r229-67bd013e8d1e",
    "./src/digging.js?v=r229-67bd013e8d1e",
    "./src/elders.js?v=r229-67bd013e8d1e",
    "./src/far-array.js?v=r229-67bd013e8d1e",
    "./src/combat-visuals.js?v=r229-67bd013e8d1e",
    "./src/dungeon-framework.js?v=r229-67bd013e8d1e",
    "./src/elites.js?v=r229-67bd013e8d1e",
    "./src/random.js?v=r229-67bd013e8d1e",
    "./src/types.js?v=r229-67bd013e8d1e",
    "./src/story.js?v=r229-67bd013e8d1e",
    "./src/foundry.js?v=r229-67bd013e8d1e",
    "./src/world.js?v=r229-67bd013e8d1e",
    "./src/deep-dungeons.js?v=r229-67bd013e8d1e",
    "./src/scenes.js?v=r229-67bd013e8d1e",
    "./src/arenas.js?v=r229-67bd013e8d1e",
    "./src/items.js?v=r229-67bd013e8d1e",
    "./src/combat.js?v=r229-67bd013e8d1e",
    "./src/interactions.js?v=r229-67bd013e8d1e",
    "./src/persistence.js?v=r229-67bd013e8d1e",
    "./src/input.js?v=r229-67bd013e8d1e",
    "./src/game.js?v=r229-67bd013e8d1e",
    "./src/renderer.js?v=r229-67bd013e8d1e",
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
