const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v108`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=108",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=108",
    "./src/proving-ground.js?v=108",
    "./src/proving-ground-fixtures.js?v=108",
    "./src/proving-ground-labs.js?v=108",
    "./src/dungeon-variation.js?v=108",
    "./src/dungeon-completion.js?v=108",
    "./src/enemy-patterns.js?v=108",
    "./src/monster-pack.js?v=108",
    "./src/monster-render.js?v=108",
    "./src/landscape.js?v=108",
    "./src/landscape-render.js?v=108",
    "./src/underlands.js?v=108",
    "./src/relay-network.js?v=108",
    "./src/glyphs.js?v=108",
    "./src/echoes.js?v=108",
    "./src/constellation.js?v=108",
    "./src/water-traversal.js?v=108",
    "./src/boats.js?v=108",
    "./src/sea-creatures.js?v=108",
    "./src/diving.js?v=108",
    "./src/grottoes.js?v=108",
    "./src/combat-visuals.js?v=108",
    "./src/dungeon-framework.js?v=108",
    "./src/elites.js?v=108",
    "./src/random.js?v=108",
    "./src/types.js?v=108",
    "./src/story.js?v=108",
    "./src/foundry.js?v=108",
    "./src/world.js?v=108",
    "./src/deep-dungeons.js?v=108",
    "./src/scenes.js?v=108",
    "./src/arenas.js?v=108",
    "./src/items.js?v=108",
    "./src/combat.js?v=108",
    "./src/interactions.js?v=108",
    "./src/persistence.js?v=108",
    "./src/input.js?v=108",
    "./src/game.js?v=108",
    "./src/renderer.js?v=108",
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
