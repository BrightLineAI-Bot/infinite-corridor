const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v102`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=102",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=102",
    "./src/proving-ground.js?v=102",
    "./src/proving-ground-fixtures.js?v=102",
    "./src/proving-ground-labs.js?v=102",
    "./src/dungeon-variation.js?v=102",
    "./src/dungeon-completion.js?v=102",
    "./src/enemy-patterns.js?v=102",
    "./src/monster-pack.js?v=102",
    "./src/monster-render.js?v=102",
    "./src/landscape.js?v=102",
    "./src/landscape-render.js?v=102",
    "./src/underlands.js?v=102",
    "./src/relay-network.js?v=102",
    "./src/glyphs.js?v=102",
    "./src/echoes.js?v=102",
    "./src/constellation.js?v=102",
    "./src/water-traversal.js?v=102",
    "./src/combat-visuals.js?v=102",
    "./src/dungeon-framework.js?v=102",
    "./src/elites.js?v=102",
    "./src/random.js?v=102",
    "./src/types.js?v=102",
    "./src/story.js?v=102",
    "./src/foundry.js?v=102",
    "./src/world.js?v=102",
    "./src/deep-dungeons.js?v=102",
    "./src/scenes.js?v=102",
    "./src/arenas.js?v=102",
    "./src/items.js?v=102",
    "./src/combat.js?v=102",
    "./src/interactions.js?v=102",
    "./src/persistence.js?v=102",
    "./src/input.js?v=102",
    "./src/game.js?v=102",
    "./src/renderer.js?v=102",
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
