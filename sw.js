const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v111`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=111",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=111",
    "./src/proving-ground.js?v=111",
    "./src/proving-ground-fixtures.js?v=111",
    "./src/proving-ground-labs.js?v=111",
    "./src/dungeon-variation.js?v=111",
    "./src/dungeon-completion.js?v=111",
    "./src/enemy-patterns.js?v=111",
    "./src/monster-pack.js?v=111",
    "./src/monster-render.js?v=111",
    "./src/landscape.js?v=111",
    "./src/landscape-render.js?v=111",
    "./src/underlands.js?v=111",
    "./src/relay-network.js?v=111",
    "./src/glyphs.js?v=111",
    "./src/echoes.js?v=111",
    "./src/constellation.js?v=111",
    "./src/water-traversal.js?v=111",
    "./src/boats.js?v=111",
    "./src/sea-creatures.js?v=111",
    "./src/diving.js?v=111",
    "./src/grottoes.js?v=111",
    "./src/spell-slots.js?v=111",
    "./src/combat-visuals.js?v=111",
    "./src/dungeon-framework.js?v=111",
    "./src/elites.js?v=111",
    "./src/random.js?v=111",
    "./src/types.js?v=111",
    "./src/story.js?v=111",
    "./src/foundry.js?v=111",
    "./src/world.js?v=111",
    "./src/deep-dungeons.js?v=111",
    "./src/scenes.js?v=111",
    "./src/arenas.js?v=111",
    "./src/items.js?v=111",
    "./src/combat.js?v=111",
    "./src/interactions.js?v=111",
    "./src/persistence.js?v=111",
    "./src/input.js?v=111",
    "./src/game.js?v=111",
    "./src/renderer.js?v=111",
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
