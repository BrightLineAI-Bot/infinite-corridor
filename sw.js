const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v110`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=110",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=110",
    "./src/proving-ground.js?v=110",
    "./src/proving-ground-fixtures.js?v=110",
    "./src/proving-ground-labs.js?v=110",
    "./src/dungeon-variation.js?v=110",
    "./src/dungeon-completion.js?v=110",
    "./src/enemy-patterns.js?v=110",
    "./src/monster-pack.js?v=110",
    "./src/monster-render.js?v=110",
    "./src/landscape.js?v=110",
    "./src/landscape-render.js?v=110",
    "./src/underlands.js?v=110",
    "./src/relay-network.js?v=110",
    "./src/glyphs.js?v=110",
    "./src/echoes.js?v=110",
    "./src/constellation.js?v=110",
    "./src/water-traversal.js?v=110",
    "./src/boats.js?v=110",
    "./src/sea-creatures.js?v=110",
    "./src/diving.js?v=110",
    "./src/grottoes.js?v=110",
    "./src/combat-visuals.js?v=110",
    "./src/dungeon-framework.js?v=110",
    "./src/elites.js?v=110",
    "./src/random.js?v=110",
    "./src/types.js?v=110",
    "./src/story.js?v=110",
    "./src/foundry.js?v=110",
    "./src/world.js?v=110",
    "./src/deep-dungeons.js?v=110",
    "./src/scenes.js?v=110",
    "./src/arenas.js?v=110",
    "./src/items.js?v=110",
    "./src/combat.js?v=110",
    "./src/interactions.js?v=110",
    "./src/persistence.js?v=110",
    "./src/input.js?v=110",
    "./src/game.js?v=110",
    "./src/renderer.js?v=110",
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
