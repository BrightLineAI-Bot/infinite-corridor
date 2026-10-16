const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v113`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=113",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=113",
    "./src/proving-ground.js?v=113",
    "./src/proving-ground-fixtures.js?v=113",
    "./src/proving-ground-labs.js?v=113",
    "./src/dungeon-variation.js?v=113",
    "./src/dungeon-completion.js?v=113",
    "./src/enemy-patterns.js?v=113",
    "./src/monster-pack.js?v=113",
    "./src/monster-render.js?v=113",
    "./src/landscape.js?v=113",
    "./src/landscape-render.js?v=113",
    "./src/underlands.js?v=113",
    "./src/relay-network.js?v=113",
    "./src/glyphs.js?v=113",
    "./src/echoes.js?v=113",
    "./src/constellation.js?v=113",
    "./src/water-traversal.js?v=113",
    "./src/boats.js?v=113",
    "./src/sea-creatures.js?v=113",
    "./src/diving.js?v=113",
    "./src/grottoes.js?v=113",
    "./src/spell-slots.js?v=113",
    "./src/settlements.js?v=113",
    "./src/skirmishes.js?v=113",
    "./src/combat-visuals.js?v=113",
    "./src/dungeon-framework.js?v=113",
    "./src/elites.js?v=113",
    "./src/random.js?v=113",
    "./src/types.js?v=113",
    "./src/story.js?v=113",
    "./src/foundry.js?v=113",
    "./src/world.js?v=113",
    "./src/deep-dungeons.js?v=113",
    "./src/scenes.js?v=113",
    "./src/arenas.js?v=113",
    "./src/items.js?v=113",
    "./src/combat.js?v=113",
    "./src/interactions.js?v=113",
    "./src/persistence.js?v=113",
    "./src/input.js?v=113",
    "./src/game.js?v=113",
    "./src/renderer.js?v=113",
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
