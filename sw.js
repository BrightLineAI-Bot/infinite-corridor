const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v161`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=161",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=161",
    "./src/proving-ground.js?v=161",
    "./src/proving-ground-fixtures.js?v=161",
    "./src/proving-ground-labs.js?v=161",
    "./src/dungeon-variation.js?v=161",
    "./src/dungeon-completion.js?v=161",
    "./src/enemy-patterns.js?v=161",
    "./src/monster-pack.js?v=161",
    "./src/monster-render.js?v=161",
    "./src/landscape.js?v=161",
    "./src/landscape-render.js?v=161",
    "./src/underlands.js?v=161",
    "./src/pattern-dungeons.js?v=161",
    "./src/relay-network.js?v=161",
    "./src/glyphs.js?v=161",
    "./src/echoes.js?v=161",
    "./src/constellation.js?v=161",
    "./src/water-traversal.js?v=161",
    "./src/open-sea.js?v=161",
    "./src/boats.js?v=161",
    "./src/sea-creatures.js?v=161",
    "./src/diving.js?v=161",
    "./src/grottoes.js?v=161",
    "./src/spell-slots.js?v=161",
    "./src/settlements.js?v=161",
    "./src/skirmishes.js?v=161",
    "./src/travelers.js?v=161",
    "./src/questing-beast.js?v=161",
    "./src/recitations.js?v=161",
    "./src/far-array.js?v=161",
    "./src/combat-visuals.js?v=161",
    "./src/dungeon-framework.js?v=161",
    "./src/elites.js?v=161",
    "./src/random.js?v=161",
    "./src/types.js?v=161",
    "./src/story.js?v=161",
    "./src/foundry.js?v=161",
    "./src/world.js?v=161",
    "./src/deep-dungeons.js?v=161",
    "./src/scenes.js?v=161",
    "./src/arenas.js?v=161",
    "./src/items.js?v=161",
    "./src/combat.js?v=161",
    "./src/interactions.js?v=161",
    "./src/persistence.js?v=161",
    "./src/input.js?v=161",
    "./src/game.js?v=161",
    "./src/renderer.js?v=161",
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
