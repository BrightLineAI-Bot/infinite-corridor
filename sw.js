const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v225`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=225",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=225",
    "./src/proving-ground.js?v=225",
    "./src/proving-ground-fixtures.js?v=225",
    "./src/proving-ground-labs.js?v=225",
    "./src/dungeon-variation.js?v=225",
    "./src/dungeon-completion.js?v=225",
    "./src/enemy-patterns.js?v=225",
    "./src/monster-pack.js?v=225",
    "./src/monster-render.js?v=225",
    "./src/landscape.js?v=225",
    "./src/landscape-render.js?v=225",
    "./src/underlands.js?v=225",
    "./src/pattern-dungeons.js?v=225",
    "./src/relay-network.js?v=225",
    "./src/glyphs.js?v=225",
    "./src/echoes.js?v=225",
    "./src/constellation.js?v=225",
    "./src/water-traversal.js?v=225",
    "./src/open-sea.js?v=225",
    "./src/boats.js?v=225",
    "./src/sea-creatures.js?v=225",
    "./src/diving.js?v=225",
    "./src/grottoes.js?v=225",
    "./src/spell-slots.js?v=225",
    "./src/settlements.js?v=225",
    "./src/skirmishes.js?v=225",
    "./src/travelers.js?v=225",
    "./src/diagnostic-probe.js?v=225",
    "./src/questing-beast.js?v=225",
    "./src/recitations.js?v=225",
    "./src/lore.js?v=225",
    "./src/glimpses.js?v=225",
    "./src/glimpse-render.js?v=225",
    "./src/glimpse-paint.js?v=225",
    "./src/glimpse-scenes.js?v=225",
    "./src/glimpse-horror.js?v=225",
    "./src/glimpse-legend.js?v=225",
    "./src/glimpse-hand.js?v=225",
    "./src/atlas-view.js?v=225",
    "./src/strange.js?v=225",
    "./src/linked-dungeons.js?v=225",
    "./src/digging.js?v=225",
    "./src/elders.js?v=225",
    "./src/far-array.js?v=225",
    "./src/combat-visuals.js?v=225",
    "./src/dungeon-framework.js?v=225",
    "./src/elites.js?v=225",
    "./src/random.js?v=225",
    "./src/types.js?v=225",
    "./src/story.js?v=225",
    "./src/foundry.js?v=225",
    "./src/world.js?v=225",
    "./src/deep-dungeons.js?v=225",
    "./src/scenes.js?v=225",
    "./src/arenas.js?v=225",
    "./src/items.js?v=225",
    "./src/combat.js?v=225",
    "./src/interactions.js?v=225",
    "./src/persistence.js?v=225",
    "./src/input.js?v=225",
    "./src/game.js?v=225",
    "./src/renderer.js?v=225",
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
