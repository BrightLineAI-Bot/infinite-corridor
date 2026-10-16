const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v144`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=144",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=144",
    "./src/proving-ground.js?v=144",
    "./src/proving-ground-fixtures.js?v=144",
    "./src/proving-ground-labs.js?v=144",
    "./src/dungeon-variation.js?v=144",
    "./src/dungeon-completion.js?v=144",
    "./src/enemy-patterns.js?v=144",
    "./src/monster-pack.js?v=144",
    "./src/monster-render.js?v=144",
    "./src/landscape.js?v=144",
    "./src/landscape-render.js?v=144",
    "./src/underlands.js?v=144",
    "./src/relay-network.js?v=144",
    "./src/glyphs.js?v=144",
    "./src/echoes.js?v=144",
    "./src/constellation.js?v=144",
    "./src/water-traversal.js?v=144",
    "./src/boats.js?v=144",
    "./src/sea-creatures.js?v=144",
    "./src/diving.js?v=144",
    "./src/grottoes.js?v=144",
    "./src/spell-slots.js?v=144",
    "./src/settlements.js?v=144",
    "./src/skirmishes.js?v=144",
    "./src/travelers.js?v=144",
    "./src/questing-beast.js?v=144",
    "./src/recitations.js?v=144",
    "./src/far-array.js?v=144",
    "./src/combat-visuals.js?v=144",
    "./src/dungeon-framework.js?v=144",
    "./src/elites.js?v=144",
    "./src/random.js?v=144",
    "./src/types.js?v=144",
    "./src/story.js?v=144",
    "./src/foundry.js?v=144",
    "./src/world.js?v=144",
    "./src/deep-dungeons.js?v=144",
    "./src/scenes.js?v=144",
    "./src/arenas.js?v=144",
    "./src/items.js?v=144",
    "./src/combat.js?v=144",
    "./src/interactions.js?v=144",
    "./src/persistence.js?v=144",
    "./src/input.js?v=144",
    "./src/game.js?v=144",
    "./src/renderer.js?v=144",
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
