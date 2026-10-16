const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v151`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=151",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=151",
    "./src/proving-ground.js?v=151",
    "./src/proving-ground-fixtures.js?v=151",
    "./src/proving-ground-labs.js?v=151",
    "./src/dungeon-variation.js?v=151",
    "./src/dungeon-completion.js?v=151",
    "./src/enemy-patterns.js?v=151",
    "./src/monster-pack.js?v=151",
    "./src/monster-render.js?v=151",
    "./src/landscape.js?v=151",
    "./src/landscape-render.js?v=151",
    "./src/underlands.js?v=151",
    "./src/pattern-dungeons.js?v=151",
    "./src/relay-network.js?v=151",
    "./src/glyphs.js?v=151",
    "./src/echoes.js?v=151",
    "./src/constellation.js?v=151",
    "./src/water-traversal.js?v=151",
    "./src/boats.js?v=151",
    "./src/sea-creatures.js?v=151",
    "./src/diving.js?v=151",
    "./src/grottoes.js?v=151",
    "./src/spell-slots.js?v=151",
    "./src/settlements.js?v=151",
    "./src/skirmishes.js?v=151",
    "./src/travelers.js?v=151",
    "./src/questing-beast.js?v=151",
    "./src/recitations.js?v=151",
    "./src/far-array.js?v=151",
    "./src/combat-visuals.js?v=151",
    "./src/dungeon-framework.js?v=151",
    "./src/elites.js?v=151",
    "./src/random.js?v=151",
    "./src/types.js?v=151",
    "./src/story.js?v=151",
    "./src/foundry.js?v=151",
    "./src/world.js?v=151",
    "./src/deep-dungeons.js?v=151",
    "./src/scenes.js?v=151",
    "./src/arenas.js?v=151",
    "./src/items.js?v=151",
    "./src/combat.js?v=151",
    "./src/interactions.js?v=151",
    "./src/persistence.js?v=151",
    "./src/input.js?v=151",
    "./src/game.js?v=151",
    "./src/renderer.js?v=151",
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
