const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v138`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=138",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=138",
    "./src/proving-ground.js?v=138",
    "./src/proving-ground-fixtures.js?v=138",
    "./src/proving-ground-labs.js?v=138",
    "./src/dungeon-variation.js?v=138",
    "./src/dungeon-completion.js?v=138",
    "./src/enemy-patterns.js?v=138",
    "./src/monster-pack.js?v=138",
    "./src/monster-render.js?v=138",
    "./src/landscape.js?v=138",
    "./src/landscape-render.js?v=138",
    "./src/underlands.js?v=138",
    "./src/relay-network.js?v=138",
    "./src/glyphs.js?v=138",
    "./src/echoes.js?v=138",
    "./src/constellation.js?v=138",
    "./src/water-traversal.js?v=138",
    "./src/boats.js?v=138",
    "./src/sea-creatures.js?v=138",
    "./src/diving.js?v=138",
    "./src/grottoes.js?v=138",
    "./src/spell-slots.js?v=138",
    "./src/settlements.js?v=138",
    "./src/skirmishes.js?v=138",
    "./src/travelers.js?v=138",
    "./src/questing-beast.js?v=138",
    "./src/recitations.js?v=138",
    "./src/far-array.js?v=138",
    "./src/combat-visuals.js?v=138",
    "./src/dungeon-framework.js?v=138",
    "./src/elites.js?v=138",
    "./src/random.js?v=138",
    "./src/types.js?v=138",
    "./src/story.js?v=138",
    "./src/foundry.js?v=138",
    "./src/world.js?v=138",
    "./src/deep-dungeons.js?v=138",
    "./src/scenes.js?v=138",
    "./src/arenas.js?v=138",
    "./src/items.js?v=138",
    "./src/combat.js?v=138",
    "./src/interactions.js?v=138",
    "./src/persistence.js?v=138",
    "./src/input.js?v=138",
    "./src/game.js?v=138",
    "./src/renderer.js?v=138",
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
