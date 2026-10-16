const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v136`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=136",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=136",
    "./src/proving-ground.js?v=136",
    "./src/proving-ground-fixtures.js?v=136",
    "./src/proving-ground-labs.js?v=136",
    "./src/dungeon-variation.js?v=136",
    "./src/dungeon-completion.js?v=136",
    "./src/enemy-patterns.js?v=136",
    "./src/monster-pack.js?v=136",
    "./src/monster-render.js?v=136",
    "./src/landscape.js?v=136",
    "./src/landscape-render.js?v=136",
    "./src/underlands.js?v=136",
    "./src/relay-network.js?v=136",
    "./src/glyphs.js?v=136",
    "./src/echoes.js?v=136",
    "./src/constellation.js?v=136",
    "./src/water-traversal.js?v=136",
    "./src/boats.js?v=136",
    "./src/sea-creatures.js?v=136",
    "./src/diving.js?v=136",
    "./src/grottoes.js?v=136",
    "./src/spell-slots.js?v=136",
    "./src/settlements.js?v=136",
    "./src/skirmishes.js?v=136",
    "./src/travelers.js?v=136",
    "./src/questing-beast.js?v=136",
    "./src/recitations.js?v=136",
    "./src/combat-visuals.js?v=136",
    "./src/dungeon-framework.js?v=136",
    "./src/elites.js?v=136",
    "./src/random.js?v=136",
    "./src/types.js?v=136",
    "./src/story.js?v=136",
    "./src/foundry.js?v=136",
    "./src/world.js?v=136",
    "./src/deep-dungeons.js?v=136",
    "./src/scenes.js?v=136",
    "./src/arenas.js?v=136",
    "./src/items.js?v=136",
    "./src/combat.js?v=136",
    "./src/interactions.js?v=136",
    "./src/persistence.js?v=136",
    "./src/input.js?v=136",
    "./src/game.js?v=136",
    "./src/renderer.js?v=136",
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
