const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v169`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=169",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=169",
    "./src/proving-ground.js?v=169",
    "./src/proving-ground-fixtures.js?v=169",
    "./src/proving-ground-labs.js?v=169",
    "./src/dungeon-variation.js?v=169",
    "./src/dungeon-completion.js?v=169",
    "./src/enemy-patterns.js?v=169",
    "./src/monster-pack.js?v=169",
    "./src/monster-render.js?v=169",
    "./src/landscape.js?v=169",
    "./src/landscape-render.js?v=169",
    "./src/underlands.js?v=169",
    "./src/pattern-dungeons.js?v=169",
    "./src/relay-network.js?v=169",
    "./src/glyphs.js?v=169",
    "./src/echoes.js?v=169",
    "./src/constellation.js?v=169",
    "./src/water-traversal.js?v=169",
    "./src/open-sea.js?v=169",
    "./src/boats.js?v=169",
    "./src/sea-creatures.js?v=169",
    "./src/diving.js?v=169",
    "./src/grottoes.js?v=169",
    "./src/spell-slots.js?v=169",
    "./src/settlements.js?v=169",
    "./src/skirmishes.js?v=169",
    "./src/travelers.js?v=169",
    "./src/diagnostic-probe.js?v=169",
    "./src/questing-beast.js?v=169",
    "./src/recitations.js?v=169",
    "./src/far-array.js?v=169",
    "./src/combat-visuals.js?v=169",
    "./src/dungeon-framework.js?v=169",
    "./src/elites.js?v=169",
    "./src/random.js?v=169",
    "./src/types.js?v=169",
    "./src/story.js?v=169",
    "./src/foundry.js?v=169",
    "./src/world.js?v=169",
    "./src/deep-dungeons.js?v=169",
    "./src/scenes.js?v=169",
    "./src/arenas.js?v=169",
    "./src/items.js?v=169",
    "./src/combat.js?v=169",
    "./src/interactions.js?v=169",
    "./src/persistence.js?v=169",
    "./src/input.js?v=169",
    "./src/game.js?v=169",
    "./src/renderer.js?v=169",
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
