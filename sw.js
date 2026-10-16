const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v109`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=109",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=109",
    "./src/proving-ground.js?v=109",
    "./src/proving-ground-fixtures.js?v=109",
    "./src/proving-ground-labs.js?v=109",
    "./src/dungeon-variation.js?v=109",
    "./src/dungeon-completion.js?v=109",
    "./src/enemy-patterns.js?v=109",
    "./src/monster-pack.js?v=109",
    "./src/monster-render.js?v=109",
    "./src/landscape.js?v=109",
    "./src/landscape-render.js?v=109",
    "./src/underlands.js?v=109",
    "./src/relay-network.js?v=109",
    "./src/glyphs.js?v=109",
    "./src/echoes.js?v=109",
    "./src/constellation.js?v=109",
    "./src/water-traversal.js?v=109",
    "./src/boats.js?v=109",
    "./src/sea-creatures.js?v=109",
    "./src/diving.js?v=109",
    "./src/grottoes.js?v=109",
    "./src/combat-visuals.js?v=109",
    "./src/dungeon-framework.js?v=109",
    "./src/elites.js?v=109",
    "./src/random.js?v=109",
    "./src/types.js?v=109",
    "./src/story.js?v=109",
    "./src/foundry.js?v=109",
    "./src/world.js?v=109",
    "./src/deep-dungeons.js?v=109",
    "./src/scenes.js?v=109",
    "./src/arenas.js?v=109",
    "./src/items.js?v=109",
    "./src/combat.js?v=109",
    "./src/interactions.js?v=109",
    "./src/persistence.js?v=109",
    "./src/input.js?v=109",
    "./src/game.js?v=109",
    "./src/renderer.js?v=109",
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
