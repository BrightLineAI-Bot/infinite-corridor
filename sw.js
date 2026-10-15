const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v103`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=103",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=103",
    "./src/proving-ground.js?v=103",
    "./src/proving-ground-fixtures.js?v=103",
    "./src/proving-ground-labs.js?v=103",
    "./src/dungeon-variation.js?v=103",
    "./src/dungeon-completion.js?v=103",
    "./src/enemy-patterns.js?v=103",
    "./src/monster-pack.js?v=103",
    "./src/monster-render.js?v=103",
    "./src/landscape.js?v=103",
    "./src/landscape-render.js?v=103",
    "./src/underlands.js?v=103",
    "./src/relay-network.js?v=103",
    "./src/glyphs.js?v=103",
    "./src/echoes.js?v=103",
    "./src/constellation.js?v=103",
    "./src/water-traversal.js?v=103",
    "./src/combat-visuals.js?v=103",
    "./src/dungeon-framework.js?v=103",
    "./src/elites.js?v=103",
    "./src/random.js?v=103",
    "./src/types.js?v=103",
    "./src/story.js?v=103",
    "./src/foundry.js?v=103",
    "./src/world.js?v=103",
    "./src/deep-dungeons.js?v=103",
    "./src/scenes.js?v=103",
    "./src/arenas.js?v=103",
    "./src/items.js?v=103",
    "./src/combat.js?v=103",
    "./src/interactions.js?v=103",
    "./src/persistence.js?v=103",
    "./src/input.js?v=103",
    "./src/game.js?v=103",
    "./src/renderer.js?v=103",
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
