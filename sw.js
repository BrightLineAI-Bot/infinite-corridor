const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v140`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=140",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=140",
    "./src/proving-ground.js?v=140",
    "./src/proving-ground-fixtures.js?v=140",
    "./src/proving-ground-labs.js?v=140",
    "./src/dungeon-variation.js?v=140",
    "./src/dungeon-completion.js?v=140",
    "./src/enemy-patterns.js?v=140",
    "./src/monster-pack.js?v=140",
    "./src/monster-render.js?v=140",
    "./src/landscape.js?v=140",
    "./src/landscape-render.js?v=140",
    "./src/underlands.js?v=140",
    "./src/relay-network.js?v=140",
    "./src/glyphs.js?v=140",
    "./src/echoes.js?v=140",
    "./src/constellation.js?v=140",
    "./src/water-traversal.js?v=140",
    "./src/boats.js?v=140",
    "./src/sea-creatures.js?v=140",
    "./src/diving.js?v=140",
    "./src/grottoes.js?v=140",
    "./src/spell-slots.js?v=140",
    "./src/settlements.js?v=140",
    "./src/skirmishes.js?v=140",
    "./src/travelers.js?v=140",
    "./src/questing-beast.js?v=140",
    "./src/recitations.js?v=140",
    "./src/far-array.js?v=140",
    "./src/combat-visuals.js?v=140",
    "./src/dungeon-framework.js?v=140",
    "./src/elites.js?v=140",
    "./src/random.js?v=140",
    "./src/types.js?v=140",
    "./src/story.js?v=140",
    "./src/foundry.js?v=140",
    "./src/world.js?v=140",
    "./src/deep-dungeons.js?v=140",
    "./src/scenes.js?v=140",
    "./src/arenas.js?v=140",
    "./src/items.js?v=140",
    "./src/combat.js?v=140",
    "./src/interactions.js?v=140",
    "./src/persistence.js?v=140",
    "./src/input.js?v=140",
    "./src/game.js?v=140",
    "./src/renderer.js?v=140",
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
