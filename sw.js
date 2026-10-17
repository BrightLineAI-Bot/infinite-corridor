const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v162`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=162",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=162",
    "./src/proving-ground.js?v=162",
    "./src/proving-ground-fixtures.js?v=162",
    "./src/proving-ground-labs.js?v=162",
    "./src/dungeon-variation.js?v=162",
    "./src/dungeon-completion.js?v=162",
    "./src/enemy-patterns.js?v=162",
    "./src/monster-pack.js?v=162",
    "./src/monster-render.js?v=162",
    "./src/landscape.js?v=162",
    "./src/landscape-render.js?v=162",
    "./src/underlands.js?v=162",
    "./src/pattern-dungeons.js?v=162",
    "./src/relay-network.js?v=162",
    "./src/glyphs.js?v=162",
    "./src/echoes.js?v=162",
    "./src/constellation.js?v=162",
    "./src/water-traversal.js?v=162",
    "./src/open-sea.js?v=162",
    "./src/boats.js?v=162",
    "./src/sea-creatures.js?v=162",
    "./src/diving.js?v=162",
    "./src/grottoes.js?v=162",
    "./src/spell-slots.js?v=162",
    "./src/settlements.js?v=162",
    "./src/skirmishes.js?v=162",
    "./src/travelers.js?v=162",
    "./src/questing-beast.js?v=162",
    "./src/recitations.js?v=162",
    "./src/far-array.js?v=162",
    "./src/combat-visuals.js?v=162",
    "./src/dungeon-framework.js?v=162",
    "./src/elites.js?v=162",
    "./src/random.js?v=162",
    "./src/types.js?v=162",
    "./src/story.js?v=162",
    "./src/foundry.js?v=162",
    "./src/world.js?v=162",
    "./src/deep-dungeons.js?v=162",
    "./src/scenes.js?v=162",
    "./src/arenas.js?v=162",
    "./src/items.js?v=162",
    "./src/combat.js?v=162",
    "./src/interactions.js?v=162",
    "./src/persistence.js?v=162",
    "./src/input.js?v=162",
    "./src/game.js?v=162",
    "./src/renderer.js?v=162",
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
