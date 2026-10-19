const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v199`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=199",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=199",
    "./src/proving-ground.js?v=199",
    "./src/proving-ground-fixtures.js?v=199",
    "./src/proving-ground-labs.js?v=199",
    "./src/dungeon-variation.js?v=199",
    "./src/dungeon-completion.js?v=199",
    "./src/enemy-patterns.js?v=199",
    "./src/monster-pack.js?v=199",
    "./src/monster-render.js?v=199",
    "./src/landscape.js?v=199",
    "./src/landscape-render.js?v=199",
    "./src/underlands.js?v=199",
    "./src/pattern-dungeons.js?v=199",
    "./src/relay-network.js?v=199",
    "./src/glyphs.js?v=199",
    "./src/echoes.js?v=199",
    "./src/constellation.js?v=199",
    "./src/water-traversal.js?v=199",
    "./src/open-sea.js?v=199",
    "./src/boats.js?v=199",
    "./src/sea-creatures.js?v=199",
    "./src/diving.js?v=199",
    "./src/grottoes.js?v=199",
    "./src/spell-slots.js?v=199",
    "./src/settlements.js?v=199",
    "./src/skirmishes.js?v=199",
    "./src/travelers.js?v=199",
    "./src/diagnostic-probe.js?v=199",
    "./src/questing-beast.js?v=199",
    "./src/recitations.js?v=199",
    "./src/lore.js?v=199",
    "./src/glimpses.js?v=199",
    "./src/glimpse-render.js?v=199",
    "./src/elders.js?v=199",
    "./src/far-array.js?v=199",
    "./src/combat-visuals.js?v=199",
    "./src/dungeon-framework.js?v=199",
    "./src/elites.js?v=199",
    "./src/random.js?v=199",
    "./src/types.js?v=199",
    "./src/story.js?v=199",
    "./src/foundry.js?v=199",
    "./src/world.js?v=199",
    "./src/deep-dungeons.js?v=199",
    "./src/scenes.js?v=199",
    "./src/arenas.js?v=199",
    "./src/items.js?v=199",
    "./src/combat.js?v=199",
    "./src/interactions.js?v=199",
    "./src/persistence.js?v=199",
    "./src/input.js?v=199",
    "./src/game.js?v=199",
    "./src/renderer.js?v=199",
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
