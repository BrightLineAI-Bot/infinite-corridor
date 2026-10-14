const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v100`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=100",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=100",
    "./src/proving-ground.js?v=100",
    "./src/proving-ground-fixtures.js?v=100",
    "./src/proving-ground-labs.js?v=100",
    "./src/dungeon-variation.js?v=100",
    "./src/dungeon-completion.js?v=100",
    "./src/enemy-patterns.js?v=100",
    "./src/monster-pack.js?v=100",
    "./src/monster-render.js?v=100",
    "./src/landscape.js?v=100",
    "./src/landscape-render.js?v=100",
    "./src/underlands.js?v=100",
    "./src/relay-network.js?v=100",
    "./src/glyphs.js?v=100",
    "./src/echoes.js?v=100",
    "./src/constellation.js?v=100",
    "./src/combat-visuals.js?v=100",
    "./src/dungeon-framework.js?v=100",
    "./src/elites.js?v=100",
    "./src/random.js?v=100",
    "./src/types.js?v=100",
    "./src/story.js?v=100",
    "./src/foundry.js?v=100",
    "./src/world.js?v=100",
    "./src/deep-dungeons.js?v=100",
    "./src/scenes.js?v=100",
    "./src/arenas.js?v=100",
    "./src/items.js?v=100",
    "./src/combat.js?v=100",
    "./src/interactions.js?v=100",
    "./src/persistence.js?v=100",
    "./src/input.js?v=100",
    "./src/game.js?v=100",
    "./src/renderer.js?v=100",
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
