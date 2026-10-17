const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v158`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=158",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=158",
    "./src/proving-ground.js?v=158",
    "./src/proving-ground-fixtures.js?v=158",
    "./src/proving-ground-labs.js?v=158",
    "./src/dungeon-variation.js?v=158",
    "./src/dungeon-completion.js?v=158",
    "./src/enemy-patterns.js?v=158",
    "./src/monster-pack.js?v=158",
    "./src/monster-render.js?v=158",
    "./src/landscape.js?v=158",
    "./src/landscape-render.js?v=158",
    "./src/underlands.js?v=158",
    "./src/pattern-dungeons.js?v=158",
    "./src/relay-network.js?v=158",
    "./src/glyphs.js?v=158",
    "./src/echoes.js?v=158",
    "./src/constellation.js?v=158",
    "./src/water-traversal.js?v=158",
    "./src/open-sea.js?v=158",
    "./src/boats.js?v=158",
    "./src/sea-creatures.js?v=158",
    "./src/diving.js?v=158",
    "./src/grottoes.js?v=158",
    "./src/spell-slots.js?v=158",
    "./src/settlements.js?v=158",
    "./src/skirmishes.js?v=158",
    "./src/travelers.js?v=158",
    "./src/questing-beast.js?v=158",
    "./src/recitations.js?v=158",
    "./src/far-array.js?v=158",
    "./src/combat-visuals.js?v=158",
    "./src/dungeon-framework.js?v=158",
    "./src/elites.js?v=158",
    "./src/random.js?v=158",
    "./src/types.js?v=158",
    "./src/story.js?v=158",
    "./src/foundry.js?v=158",
    "./src/world.js?v=158",
    "./src/deep-dungeons.js?v=158",
    "./src/scenes.js?v=158",
    "./src/arenas.js?v=158",
    "./src/items.js?v=158",
    "./src/combat.js?v=158",
    "./src/interactions.js?v=158",
    "./src/persistence.js?v=158",
    "./src/input.js?v=158",
    "./src/game.js?v=158",
    "./src/renderer.js?v=158",
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
