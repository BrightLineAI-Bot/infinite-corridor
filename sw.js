const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v155`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=155",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=155",
    "./src/proving-ground.js?v=155",
    "./src/proving-ground-fixtures.js?v=155",
    "./src/proving-ground-labs.js?v=155",
    "./src/dungeon-variation.js?v=155",
    "./src/dungeon-completion.js?v=155",
    "./src/enemy-patterns.js?v=155",
    "./src/monster-pack.js?v=155",
    "./src/monster-render.js?v=155",
    "./src/landscape.js?v=155",
    "./src/landscape-render.js?v=155",
    "./src/underlands.js?v=155",
    "./src/pattern-dungeons.js?v=155",
    "./src/relay-network.js?v=155",
    "./src/glyphs.js?v=155",
    "./src/echoes.js?v=155",
    "./src/constellation.js?v=155",
    "./src/water-traversal.js?v=155",
    "./src/open-sea.js?v=155",
    "./src/boats.js?v=155",
    "./src/sea-creatures.js?v=155",
    "./src/diving.js?v=155",
    "./src/grottoes.js?v=155",
    "./src/spell-slots.js?v=155",
    "./src/settlements.js?v=155",
    "./src/skirmishes.js?v=155",
    "./src/travelers.js?v=155",
    "./src/questing-beast.js?v=155",
    "./src/recitations.js?v=155",
    "./src/far-array.js?v=155",
    "./src/combat-visuals.js?v=155",
    "./src/dungeon-framework.js?v=155",
    "./src/elites.js?v=155",
    "./src/random.js?v=155",
    "./src/types.js?v=155",
    "./src/story.js?v=155",
    "./src/foundry.js?v=155",
    "./src/world.js?v=155",
    "./src/deep-dungeons.js?v=155",
    "./src/scenes.js?v=155",
    "./src/arenas.js?v=155",
    "./src/items.js?v=155",
    "./src/combat.js?v=155",
    "./src/interactions.js?v=155",
    "./src/persistence.js?v=155",
    "./src/input.js?v=155",
    "./src/game.js?v=155",
    "./src/renderer.js?v=155",
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
