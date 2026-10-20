const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v237`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=237",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=237",
    "./src/proving-ground.js?v=237",
    "./src/proving-ground-fixtures.js?v=237",
    "./src/proving-ground-labs.js?v=237",
    "./src/dungeon-variation.js?v=237",
    "./src/dungeon-completion.js?v=237",
    "./src/enemy-patterns.js?v=237",
    "./src/monster-pack.js?v=237",
    "./src/monster-render.js?v=237",
    "./src/landscape.js?v=237",
    "./src/landscape-render.js?v=237",
    "./src/underlands.js?v=237",
    "./src/pattern-dungeons.js?v=237",
    "./src/relay-network.js?v=237",
    "./src/glyphs.js?v=237",
    "./src/echoes.js?v=237",
    "./src/constellation.js?v=237",
    "./src/water-traversal.js?v=237",
    "./src/open-sea.js?v=237",
    "./src/boats.js?v=237",
    "./src/sea-creatures.js?v=237",
    "./src/diving.js?v=237",
    "./src/grottoes.js?v=237",
    "./src/spell-slots.js?v=237",
    "./src/settlements.js?v=237",
    "./src/skirmishes.js?v=237",
    "./src/travelers.js?v=237",
    "./src/diagnostic-probe.js?v=237",
    "./src/questing-beast.js?v=237",
    "./src/recitations.js?v=237",
    "./src/lore.js?v=237",
    "./src/glimpses.js?v=237",
    "./src/glimpse-render.js?v=237",
    "./src/glimpse-paint.js?v=237",
    "./src/glimpse-scenes.js?v=237",
    "./src/glimpse-horror.js?v=237",
    "./src/glimpse-legend.js?v=237",
    "./src/glimpse-hand.js?v=237",
    "./src/atlas-view.js?v=237",
    "./src/strange.js?v=237",
    "./src/linked-dungeons.js?v=237",
    "./src/digging.js?v=237",
    "./src/tyrant-hunt.js?v=237",
    "./src/world-beasts.js?v=237",
    "./src/elders.js?v=237",
    "./src/far-array.js?v=237",
    "./src/combat-visuals.js?v=237",
    "./src/dungeon-framework.js?v=237",
    "./src/elites.js?v=237",
    "./src/random.js?v=237",
    "./src/types.js?v=237",
    "./src/story.js?v=237",
    "./src/foundry.js?v=237",
    "./src/world.js?v=237",
    "./src/deep-dungeons.js?v=237",
    "./src/scenes.js?v=237",
    "./src/arenas.js?v=237",
    "./src/items.js?v=237",
    "./src/combat.js?v=237",
    "./src/interactions.js?v=237",
    "./src/persistence.js?v=237",
    "./src/input.js?v=237",
    "./src/game.js?v=237",
    "./src/renderer.js?v=237",
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
