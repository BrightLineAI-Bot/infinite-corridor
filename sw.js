const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v207`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=207",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=207",
    "./src/proving-ground.js?v=207",
    "./src/proving-ground-fixtures.js?v=207",
    "./src/proving-ground-labs.js?v=207",
    "./src/dungeon-variation.js?v=207",
    "./src/dungeon-completion.js?v=207",
    "./src/enemy-patterns.js?v=207",
    "./src/monster-pack.js?v=207",
    "./src/monster-render.js?v=207",
    "./src/landscape.js?v=207",
    "./src/landscape-render.js?v=207",
    "./src/underlands.js?v=207",
    "./src/pattern-dungeons.js?v=207",
    "./src/relay-network.js?v=207",
    "./src/glyphs.js?v=207",
    "./src/echoes.js?v=207",
    "./src/constellation.js?v=207",
    "./src/water-traversal.js?v=207",
    "./src/open-sea.js?v=207",
    "./src/boats.js?v=207",
    "./src/sea-creatures.js?v=207",
    "./src/diving.js?v=207",
    "./src/grottoes.js?v=207",
    "./src/spell-slots.js?v=207",
    "./src/settlements.js?v=207",
    "./src/skirmishes.js?v=207",
    "./src/travelers.js?v=207",
    "./src/diagnostic-probe.js?v=207",
    "./src/questing-beast.js?v=207",
    "./src/recitations.js?v=207",
    "./src/lore.js?v=207",
    "./src/glimpses.js?v=207",
    "./src/glimpse-render.js?v=207",
    "./src/glimpse-paint.js?v=207",
    "./src/glimpse-scenes.js?v=207",
    "./src/glimpse-horror.js?v=207",
    "./src/atlas-view.js?v=207",
    "./src/elders.js?v=207",
    "./src/far-array.js?v=207",
    "./src/combat-visuals.js?v=207",
    "./src/dungeon-framework.js?v=207",
    "./src/elites.js?v=207",
    "./src/random.js?v=207",
    "./src/types.js?v=207",
    "./src/story.js?v=207",
    "./src/foundry.js?v=207",
    "./src/world.js?v=207",
    "./src/deep-dungeons.js?v=207",
    "./src/scenes.js?v=207",
    "./src/arenas.js?v=207",
    "./src/items.js?v=207",
    "./src/combat.js?v=207",
    "./src/interactions.js?v=207",
    "./src/persistence.js?v=207",
    "./src/input.js?v=207",
    "./src/game.js?v=207",
    "./src/renderer.js?v=207",
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
