const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v92`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=92",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=92",
    "./src/proving-ground.js?v=92",
    "./src/proving-ground-fixtures.js?v=92",
    "./src/proving-ground-labs.js?v=92",
    "./src/dungeon-variation.js?v=92",
    "./src/dungeon-completion.js?v=92",
    "./src/enemy-patterns.js?v=92",
    "./src/monster-pack.js?v=92",
    "./src/monster-render.js?v=92",
    "./src/combat-visuals.js?v=92",
    "./src/dungeon-framework.js?v=92",
    "./src/elites.js?v=92",
    "./src/random.js?v=92",
    "./src/types.js?v=92",
    "./src/story.js?v=92",
    "./src/foundry.js?v=92",
    "./src/world.js?v=92",
    "./src/deep-dungeons.js?v=92",
    "./src/scenes.js?v=92",
    "./src/arenas.js?v=92",
    "./src/items.js?v=92",
    "./src/combat.js?v=92",
    "./src/interactions.js?v=92",
    "./src/persistence.js?v=92",
    "./src/input.js?v=92",
    "./src/game.js?v=92",
    "./src/renderer.js?v=92",
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
