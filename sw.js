const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v93`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=93",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=93",
    "./src/proving-ground.js?v=93",
    "./src/proving-ground-fixtures.js?v=93",
    "./src/proving-ground-labs.js?v=93",
    "./src/dungeon-variation.js?v=93",
    "./src/dungeon-completion.js?v=93",
    "./src/enemy-patterns.js?v=93",
    "./src/monster-pack.js?v=93",
    "./src/monster-render.js?v=93",
    "./src/combat-visuals.js?v=93",
    "./src/dungeon-framework.js?v=93",
    "./src/elites.js?v=93",
    "./src/random.js?v=93",
    "./src/types.js?v=93",
    "./src/story.js?v=93",
    "./src/foundry.js?v=93",
    "./src/world.js?v=93",
    "./src/deep-dungeons.js?v=93",
    "./src/scenes.js?v=93",
    "./src/arenas.js?v=93",
    "./src/items.js?v=93",
    "./src/combat.js?v=93",
    "./src/interactions.js?v=93",
    "./src/persistence.js?v=93",
    "./src/input.js?v=93",
    "./src/game.js?v=93",
    "./src/renderer.js?v=93",
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
