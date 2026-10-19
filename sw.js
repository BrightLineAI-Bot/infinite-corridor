const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v195`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=195",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=195",
    "./src/proving-ground.js?v=195",
    "./src/proving-ground-fixtures.js?v=195",
    "./src/proving-ground-labs.js?v=195",
    "./src/dungeon-variation.js?v=195",
    "./src/dungeon-completion.js?v=195",
    "./src/enemy-patterns.js?v=195",
    "./src/monster-pack.js?v=195",
    "./src/monster-render.js?v=195",
    "./src/landscape.js?v=195",
    "./src/landscape-render.js?v=195",
    "./src/underlands.js?v=195",
    "./src/pattern-dungeons.js?v=195",
    "./src/relay-network.js?v=195",
    "./src/glyphs.js?v=195",
    "./src/echoes.js?v=195",
    "./src/constellation.js?v=195",
    "./src/water-traversal.js?v=195",
    "./src/open-sea.js?v=195",
    "./src/boats.js?v=195",
    "./src/sea-creatures.js?v=195",
    "./src/diving.js?v=195",
    "./src/grottoes.js?v=195",
    "./src/spell-slots.js?v=195",
    "./src/settlements.js?v=195",
    "./src/skirmishes.js?v=195",
    "./src/travelers.js?v=195",
    "./src/diagnostic-probe.js?v=195",
    "./src/questing-beast.js?v=195",
    "./src/recitations.js?v=195",
    "./src/lore.js?v=195",
    "./src/glimpses.js?v=195",
    "./src/glimpse-render.js?v=195",
    "./src/far-array.js?v=195",
    "./src/combat-visuals.js?v=195",
    "./src/dungeon-framework.js?v=195",
    "./src/elites.js?v=195",
    "./src/random.js?v=195",
    "./src/types.js?v=195",
    "./src/story.js?v=195",
    "./src/foundry.js?v=195",
    "./src/world.js?v=195",
    "./src/deep-dungeons.js?v=195",
    "./src/scenes.js?v=195",
    "./src/arenas.js?v=195",
    "./src/items.js?v=195",
    "./src/combat.js?v=195",
    "./src/interactions.js?v=195",
    "./src/persistence.js?v=195",
    "./src/input.js?v=195",
    "./src/game.js?v=195",
    "./src/renderer.js?v=195",
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
