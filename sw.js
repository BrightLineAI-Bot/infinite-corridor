const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v117`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=117",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=117",
    "./src/proving-ground.js?v=117",
    "./src/proving-ground-fixtures.js?v=117",
    "./src/proving-ground-labs.js?v=117",
    "./src/dungeon-variation.js?v=117",
    "./src/dungeon-completion.js?v=117",
    "./src/enemy-patterns.js?v=117",
    "./src/monster-pack.js?v=117",
    "./src/monster-render.js?v=117",
    "./src/landscape.js?v=117",
    "./src/landscape-render.js?v=117",
    "./src/underlands.js?v=117",
    "./src/relay-network.js?v=117",
    "./src/glyphs.js?v=117",
    "./src/echoes.js?v=117",
    "./src/constellation.js?v=117",
    "./src/water-traversal.js?v=117",
    "./src/boats.js?v=117",
    "./src/sea-creatures.js?v=117",
    "./src/diving.js?v=117",
    "./src/grottoes.js?v=117",
    "./src/spell-slots.js?v=117",
    "./src/settlements.js?v=117",
    "./src/skirmishes.js?v=117",
    "./src/travelers.js?v=117",
    "./src/questing-beast.js?v=117",
    "./src/recitations.js?v=117",
    "./src/combat-visuals.js?v=117",
    "./src/dungeon-framework.js?v=117",
    "./src/elites.js?v=117",
    "./src/random.js?v=117",
    "./src/types.js?v=117",
    "./src/story.js?v=117",
    "./src/foundry.js?v=117",
    "./src/world.js?v=117",
    "./src/deep-dungeons.js?v=117",
    "./src/scenes.js?v=117",
    "./src/arenas.js?v=117",
    "./src/items.js?v=117",
    "./src/combat.js?v=117",
    "./src/interactions.js?v=117",
    "./src/persistence.js?v=117",
    "./src/input.js?v=117",
    "./src/game.js?v=117",
    "./src/renderer.js?v=117",
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
