const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v148`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=148",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=148",
    "./src/proving-ground.js?v=148",
    "./src/proving-ground-fixtures.js?v=148",
    "./src/proving-ground-labs.js?v=148",
    "./src/dungeon-variation.js?v=148",
    "./src/dungeon-completion.js?v=148",
    "./src/enemy-patterns.js?v=148",
    "./src/monster-pack.js?v=148",
    "./src/monster-render.js?v=148",
    "./src/landscape.js?v=148",
    "./src/landscape-render.js?v=148",
    "./src/underlands.js?v=148",
    "./src/pattern-dungeons.js?v=148",
    "./src/relay-network.js?v=148",
    "./src/glyphs.js?v=148",
    "./src/echoes.js?v=148",
    "./src/constellation.js?v=148",
    "./src/water-traversal.js?v=148",
    "./src/boats.js?v=148",
    "./src/sea-creatures.js?v=148",
    "./src/diving.js?v=148",
    "./src/grottoes.js?v=148",
    "./src/spell-slots.js?v=148",
    "./src/settlements.js?v=148",
    "./src/skirmishes.js?v=148",
    "./src/travelers.js?v=148",
    "./src/questing-beast.js?v=148",
    "./src/recitations.js?v=148",
    "./src/far-array.js?v=148",
    "./src/combat-visuals.js?v=148",
    "./src/dungeon-framework.js?v=148",
    "./src/elites.js?v=148",
    "./src/random.js?v=148",
    "./src/types.js?v=148",
    "./src/story.js?v=148",
    "./src/foundry.js?v=148",
    "./src/world.js?v=148",
    "./src/deep-dungeons.js?v=148",
    "./src/scenes.js?v=148",
    "./src/arenas.js?v=148",
    "./src/items.js?v=148",
    "./src/combat.js?v=148",
    "./src/interactions.js?v=148",
    "./src/persistence.js?v=148",
    "./src/input.js?v=148",
    "./src/game.js?v=148",
    "./src/renderer.js?v=148",
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
