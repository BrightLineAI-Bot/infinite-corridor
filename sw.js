const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v215`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=215",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=215",
    "./src/proving-ground.js?v=215",
    "./src/proving-ground-fixtures.js?v=215",
    "./src/proving-ground-labs.js?v=215",
    "./src/dungeon-variation.js?v=215",
    "./src/dungeon-completion.js?v=215",
    "./src/enemy-patterns.js?v=215",
    "./src/monster-pack.js?v=215",
    "./src/monster-render.js?v=215",
    "./src/landscape.js?v=215",
    "./src/landscape-render.js?v=215",
    "./src/underlands.js?v=215",
    "./src/pattern-dungeons.js?v=215",
    "./src/relay-network.js?v=215",
    "./src/glyphs.js?v=215",
    "./src/echoes.js?v=215",
    "./src/constellation.js?v=215",
    "./src/water-traversal.js?v=215",
    "./src/open-sea.js?v=215",
    "./src/boats.js?v=215",
    "./src/sea-creatures.js?v=215",
    "./src/diving.js?v=215",
    "./src/grottoes.js?v=215",
    "./src/spell-slots.js?v=215",
    "./src/settlements.js?v=215",
    "./src/skirmishes.js?v=215",
    "./src/travelers.js?v=215",
    "./src/diagnostic-probe.js?v=215",
    "./src/questing-beast.js?v=215",
    "./src/recitations.js?v=215",
    "./src/lore.js?v=215",
    "./src/glimpses.js?v=215",
    "./src/glimpse-render.js?v=215",
    "./src/glimpse-paint.js?v=215",
    "./src/glimpse-scenes.js?v=215",
    "./src/glimpse-horror.js?v=215",
    "./src/atlas-view.js?v=215",
    "./src/strange.js?v=215",
    "./src/elders.js?v=215",
    "./src/far-array.js?v=215",
    "./src/combat-visuals.js?v=215",
    "./src/dungeon-framework.js?v=215",
    "./src/elites.js?v=215",
    "./src/random.js?v=215",
    "./src/types.js?v=215",
    "./src/story.js?v=215",
    "./src/foundry.js?v=215",
    "./src/world.js?v=215",
    "./src/deep-dungeons.js?v=215",
    "./src/scenes.js?v=215",
    "./src/arenas.js?v=215",
    "./src/items.js?v=215",
    "./src/combat.js?v=215",
    "./src/interactions.js?v=215",
    "./src/persistence.js?v=215",
    "./src/input.js?v=215",
    "./src/game.js?v=215",
    "./src/renderer.js?v=215",
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
