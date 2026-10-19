const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v229`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=229",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=229",
    "./src/proving-ground.js?v=229",
    "./src/proving-ground-fixtures.js?v=229",
    "./src/proving-ground-labs.js?v=229",
    "./src/dungeon-variation.js?v=229",
    "./src/dungeon-completion.js?v=229",
    "./src/enemy-patterns.js?v=229",
    "./src/monster-pack.js?v=229",
    "./src/monster-render.js?v=229",
    "./src/landscape.js?v=229",
    "./src/landscape-render.js?v=229",
    "./src/underlands.js?v=229",
    "./src/pattern-dungeons.js?v=229",
    "./src/relay-network.js?v=229",
    "./src/glyphs.js?v=229",
    "./src/echoes.js?v=229",
    "./src/constellation.js?v=229",
    "./src/water-traversal.js?v=229",
    "./src/open-sea.js?v=229",
    "./src/boats.js?v=229",
    "./src/sea-creatures.js?v=229",
    "./src/diving.js?v=229",
    "./src/grottoes.js?v=229",
    "./src/spell-slots.js?v=229",
    "./src/settlements.js?v=229",
    "./src/skirmishes.js?v=229",
    "./src/travelers.js?v=229",
    "./src/diagnostic-probe.js?v=229",
    "./src/questing-beast.js?v=229",
    "./src/recitations.js?v=229",
    "./src/lore.js?v=229",
    "./src/glimpses.js?v=229",
    "./src/glimpse-render.js?v=229",
    "./src/glimpse-paint.js?v=229",
    "./src/glimpse-scenes.js?v=229",
    "./src/glimpse-horror.js?v=229",
    "./src/glimpse-legend.js?v=229",
    "./src/glimpse-hand.js?v=229",
    "./src/atlas-view.js?v=229",
    "./src/strange.js?v=229",
    "./src/linked-dungeons.js?v=229",
    "./src/digging.js?v=229",
    "./src/elders.js?v=229",
    "./src/far-array.js?v=229",
    "./src/combat-visuals.js?v=229",
    "./src/dungeon-framework.js?v=229",
    "./src/elites.js?v=229",
    "./src/random.js?v=229",
    "./src/types.js?v=229",
    "./src/story.js?v=229",
    "./src/foundry.js?v=229",
    "./src/world.js?v=229",
    "./src/deep-dungeons.js?v=229",
    "./src/scenes.js?v=229",
    "./src/arenas.js?v=229",
    "./src/items.js?v=229",
    "./src/combat.js?v=229",
    "./src/interactions.js?v=229",
    "./src/persistence.js?v=229",
    "./src/input.js?v=229",
    "./src/game.js?v=229",
    "./src/renderer.js?v=229",
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
