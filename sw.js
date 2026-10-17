const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v175`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=175",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=175",
    "./src/proving-ground.js?v=175",
    "./src/proving-ground-fixtures.js?v=175",
    "./src/proving-ground-labs.js?v=175",
    "./src/dungeon-variation.js?v=175",
    "./src/dungeon-completion.js?v=175",
    "./src/enemy-patterns.js?v=175",
    "./src/monster-pack.js?v=175",
    "./src/monster-render.js?v=175",
    "./src/landscape.js?v=175",
    "./src/landscape-render.js?v=175",
    "./src/underlands.js?v=175",
    "./src/pattern-dungeons.js?v=175",
    "./src/relay-network.js?v=175",
    "./src/glyphs.js?v=175",
    "./src/echoes.js?v=175",
    "./src/constellation.js?v=175",
    "./src/water-traversal.js?v=175",
    "./src/open-sea.js?v=175",
    "./src/boats.js?v=175",
    "./src/sea-creatures.js?v=175",
    "./src/diving.js?v=175",
    "./src/grottoes.js?v=175",
    "./src/spell-slots.js?v=175",
    "./src/settlements.js?v=175",
    "./src/skirmishes.js?v=175",
    "./src/travelers.js?v=175",
    "./src/diagnostic-probe.js?v=175",
    "./src/questing-beast.js?v=175",
    "./src/recitations.js?v=175",
    "./src/far-array.js?v=175",
    "./src/combat-visuals.js?v=175",
    "./src/dungeon-framework.js?v=175",
    "./src/elites.js?v=175",
    "./src/random.js?v=175",
    "./src/types.js?v=175",
    "./src/story.js?v=175",
    "./src/foundry.js?v=175",
    "./src/world.js?v=175",
    "./src/deep-dungeons.js?v=175",
    "./src/scenes.js?v=175",
    "./src/arenas.js?v=175",
    "./src/items.js?v=175",
    "./src/combat.js?v=175",
    "./src/interactions.js?v=175",
    "./src/persistence.js?v=175",
    "./src/input.js?v=175",
    "./src/game.js?v=175",
    "./src/renderer.js?v=175",
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
