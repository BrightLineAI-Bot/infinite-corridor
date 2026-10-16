const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v104`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=104",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=104",
    "./src/proving-ground.js?v=104",
    "./src/proving-ground-fixtures.js?v=104",
    "./src/proving-ground-labs.js?v=104",
    "./src/dungeon-variation.js?v=104",
    "./src/dungeon-completion.js?v=104",
    "./src/enemy-patterns.js?v=104",
    "./src/monster-pack.js?v=104",
    "./src/monster-render.js?v=104",
    "./src/landscape.js?v=104",
    "./src/landscape-render.js?v=104",
    "./src/underlands.js?v=104",
    "./src/relay-network.js?v=104",
    "./src/glyphs.js?v=104",
    "./src/echoes.js?v=104",
    "./src/constellation.js?v=104",
    "./src/water-traversal.js?v=104",
    "./src/boats.js?v=104",
    "./src/combat-visuals.js?v=104",
    "./src/dungeon-framework.js?v=104",
    "./src/elites.js?v=104",
    "./src/random.js?v=104",
    "./src/types.js?v=104",
    "./src/story.js?v=104",
    "./src/foundry.js?v=104",
    "./src/world.js?v=104",
    "./src/deep-dungeons.js?v=104",
    "./src/scenes.js?v=104",
    "./src/arenas.js?v=104",
    "./src/items.js?v=104",
    "./src/combat.js?v=104",
    "./src/interactions.js?v=104",
    "./src/persistence.js?v=104",
    "./src/input.js?v=104",
    "./src/game.js?v=104",
    "./src/renderer.js?v=104",
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
