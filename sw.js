const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v121`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=121",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=121",
    "./src/proving-ground.js?v=121",
    "./src/proving-ground-fixtures.js?v=121",
    "./src/proving-ground-labs.js?v=121",
    "./src/dungeon-variation.js?v=121",
    "./src/dungeon-completion.js?v=121",
    "./src/enemy-patterns.js?v=121",
    "./src/monster-pack.js?v=121",
    "./src/monster-render.js?v=121",
    "./src/landscape.js?v=121",
    "./src/landscape-render.js?v=121",
    "./src/underlands.js?v=121",
    "./src/relay-network.js?v=121",
    "./src/glyphs.js?v=121",
    "./src/echoes.js?v=121",
    "./src/constellation.js?v=121",
    "./src/water-traversal.js?v=121",
    "./src/boats.js?v=121",
    "./src/sea-creatures.js?v=121",
    "./src/diving.js?v=121",
    "./src/grottoes.js?v=121",
    "./src/spell-slots.js?v=121",
    "./src/settlements.js?v=121",
    "./src/skirmishes.js?v=121",
    "./src/travelers.js?v=121",
    "./src/questing-beast.js?v=121",
    "./src/recitations.js?v=121",
    "./src/combat-visuals.js?v=121",
    "./src/dungeon-framework.js?v=121",
    "./src/elites.js?v=121",
    "./src/random.js?v=121",
    "./src/types.js?v=121",
    "./src/story.js?v=121",
    "./src/foundry.js?v=121",
    "./src/world.js?v=121",
    "./src/deep-dungeons.js?v=121",
    "./src/scenes.js?v=121",
    "./src/arenas.js?v=121",
    "./src/items.js?v=121",
    "./src/combat.js?v=121",
    "./src/interactions.js?v=121",
    "./src/persistence.js?v=121",
    "./src/input.js?v=121",
    "./src/game.js?v=121",
    "./src/renderer.js?v=121",
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
