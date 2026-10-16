const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v134`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=134",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=134",
    "./src/proving-ground.js?v=134",
    "./src/proving-ground-fixtures.js?v=134",
    "./src/proving-ground-labs.js?v=134",
    "./src/dungeon-variation.js?v=134",
    "./src/dungeon-completion.js?v=134",
    "./src/enemy-patterns.js?v=134",
    "./src/monster-pack.js?v=134",
    "./src/monster-render.js?v=134",
    "./src/landscape.js?v=134",
    "./src/landscape-render.js?v=134",
    "./src/underlands.js?v=134",
    "./src/relay-network.js?v=134",
    "./src/glyphs.js?v=134",
    "./src/echoes.js?v=134",
    "./src/constellation.js?v=134",
    "./src/water-traversal.js?v=134",
    "./src/boats.js?v=134",
    "./src/sea-creatures.js?v=134",
    "./src/diving.js?v=134",
    "./src/grottoes.js?v=134",
    "./src/spell-slots.js?v=134",
    "./src/settlements.js?v=134",
    "./src/skirmishes.js?v=134",
    "./src/travelers.js?v=134",
    "./src/questing-beast.js?v=134",
    "./src/recitations.js?v=134",
    "./src/combat-visuals.js?v=134",
    "./src/dungeon-framework.js?v=134",
    "./src/elites.js?v=134",
    "./src/random.js?v=134",
    "./src/types.js?v=134",
    "./src/story.js?v=134",
    "./src/foundry.js?v=134",
    "./src/world.js?v=134",
    "./src/deep-dungeons.js?v=134",
    "./src/scenes.js?v=134",
    "./src/arenas.js?v=134",
    "./src/items.js?v=134",
    "./src/combat.js?v=134",
    "./src/interactions.js?v=134",
    "./src/persistence.js?v=134",
    "./src/input.js?v=134",
    "./src/game.js?v=134",
    "./src/renderer.js?v=134",
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
