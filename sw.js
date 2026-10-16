const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v145`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=145",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=145",
    "./src/proving-ground.js?v=145",
    "./src/proving-ground-fixtures.js?v=145",
    "./src/proving-ground-labs.js?v=145",
    "./src/dungeon-variation.js?v=145",
    "./src/dungeon-completion.js?v=145",
    "./src/enemy-patterns.js?v=145",
    "./src/monster-pack.js?v=145",
    "./src/monster-render.js?v=145",
    "./src/landscape.js?v=145",
    "./src/landscape-render.js?v=145",
    "./src/underlands.js?v=145",
    "./src/relay-network.js?v=145",
    "./src/glyphs.js?v=145",
    "./src/echoes.js?v=145",
    "./src/constellation.js?v=145",
    "./src/water-traversal.js?v=145",
    "./src/boats.js?v=145",
    "./src/sea-creatures.js?v=145",
    "./src/diving.js?v=145",
    "./src/grottoes.js?v=145",
    "./src/spell-slots.js?v=145",
    "./src/settlements.js?v=145",
    "./src/skirmishes.js?v=145",
    "./src/travelers.js?v=145",
    "./src/questing-beast.js?v=145",
    "./src/recitations.js?v=145",
    "./src/far-array.js?v=145",
    "./src/combat-visuals.js?v=145",
    "./src/dungeon-framework.js?v=145",
    "./src/elites.js?v=145",
    "./src/random.js?v=145",
    "./src/types.js?v=145",
    "./src/story.js?v=145",
    "./src/foundry.js?v=145",
    "./src/world.js?v=145",
    "./src/deep-dungeons.js?v=145",
    "./src/scenes.js?v=145",
    "./src/arenas.js?v=145",
    "./src/items.js?v=145",
    "./src/combat.js?v=145",
    "./src/interactions.js?v=145",
    "./src/persistence.js?v=145",
    "./src/input.js?v=145",
    "./src/game.js?v=145",
    "./src/renderer.js?v=145",
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
