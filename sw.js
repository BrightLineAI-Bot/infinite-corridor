const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v152`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=152",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=152",
    "./src/proving-ground.js?v=152",
    "./src/proving-ground-fixtures.js?v=152",
    "./src/proving-ground-labs.js?v=152",
    "./src/dungeon-variation.js?v=152",
    "./src/dungeon-completion.js?v=152",
    "./src/enemy-patterns.js?v=152",
    "./src/monster-pack.js?v=152",
    "./src/monster-render.js?v=152",
    "./src/landscape.js?v=152",
    "./src/landscape-render.js?v=152",
    "./src/underlands.js?v=152",
    "./src/pattern-dungeons.js?v=152",
    "./src/relay-network.js?v=152",
    "./src/glyphs.js?v=152",
    "./src/echoes.js?v=152",
    "./src/constellation.js?v=152",
    "./src/water-traversal.js?v=152",
    "./src/open-sea.js?v=152",
    "./src/boats.js?v=152",
    "./src/sea-creatures.js?v=152",
    "./src/diving.js?v=152",
    "./src/grottoes.js?v=152",
    "./src/spell-slots.js?v=152",
    "./src/settlements.js?v=152",
    "./src/skirmishes.js?v=152",
    "./src/travelers.js?v=152",
    "./src/questing-beast.js?v=152",
    "./src/recitations.js?v=152",
    "./src/far-array.js?v=152",
    "./src/combat-visuals.js?v=152",
    "./src/dungeon-framework.js?v=152",
    "./src/elites.js?v=152",
    "./src/random.js?v=152",
    "./src/types.js?v=152",
    "./src/story.js?v=152",
    "./src/foundry.js?v=152",
    "./src/world.js?v=152",
    "./src/deep-dungeons.js?v=152",
    "./src/scenes.js?v=152",
    "./src/arenas.js?v=152",
    "./src/items.js?v=152",
    "./src/combat.js?v=152",
    "./src/interactions.js?v=152",
    "./src/persistence.js?v=152",
    "./src/input.js?v=152",
    "./src/game.js?v=152",
    "./src/renderer.js?v=152",
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
