const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v118`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=118",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=118",
    "./src/proving-ground.js?v=118",
    "./src/proving-ground-fixtures.js?v=118",
    "./src/proving-ground-labs.js?v=118",
    "./src/dungeon-variation.js?v=118",
    "./src/dungeon-completion.js?v=118",
    "./src/enemy-patterns.js?v=118",
    "./src/monster-pack.js?v=118",
    "./src/monster-render.js?v=118",
    "./src/landscape.js?v=118",
    "./src/landscape-render.js?v=118",
    "./src/underlands.js?v=118",
    "./src/relay-network.js?v=118",
    "./src/glyphs.js?v=118",
    "./src/echoes.js?v=118",
    "./src/constellation.js?v=118",
    "./src/water-traversal.js?v=118",
    "./src/boats.js?v=118",
    "./src/sea-creatures.js?v=118",
    "./src/diving.js?v=118",
    "./src/grottoes.js?v=118",
    "./src/spell-slots.js?v=118",
    "./src/settlements.js?v=118",
    "./src/skirmishes.js?v=118",
    "./src/travelers.js?v=118",
    "./src/questing-beast.js?v=118",
    "./src/recitations.js?v=118",
    "./src/combat-visuals.js?v=118",
    "./src/dungeon-framework.js?v=118",
    "./src/elites.js?v=118",
    "./src/random.js?v=118",
    "./src/types.js?v=118",
    "./src/story.js?v=118",
    "./src/foundry.js?v=118",
    "./src/world.js?v=118",
    "./src/deep-dungeons.js?v=118",
    "./src/scenes.js?v=118",
    "./src/arenas.js?v=118",
    "./src/items.js?v=118",
    "./src/combat.js?v=118",
    "./src/interactions.js?v=118",
    "./src/persistence.js?v=118",
    "./src/input.js?v=118",
    "./src/game.js?v=118",
    "./src/renderer.js?v=118",
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
