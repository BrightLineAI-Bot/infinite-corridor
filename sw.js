const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v120`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=120",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=120",
    "./src/proving-ground.js?v=120",
    "./src/proving-ground-fixtures.js?v=120",
    "./src/proving-ground-labs.js?v=120",
    "./src/dungeon-variation.js?v=120",
    "./src/dungeon-completion.js?v=120",
    "./src/enemy-patterns.js?v=120",
    "./src/monster-pack.js?v=120",
    "./src/monster-render.js?v=120",
    "./src/landscape.js?v=120",
    "./src/landscape-render.js?v=120",
    "./src/underlands.js?v=120",
    "./src/relay-network.js?v=120",
    "./src/glyphs.js?v=120",
    "./src/echoes.js?v=120",
    "./src/constellation.js?v=120",
    "./src/water-traversal.js?v=120",
    "./src/boats.js?v=120",
    "./src/sea-creatures.js?v=120",
    "./src/diving.js?v=120",
    "./src/grottoes.js?v=120",
    "./src/spell-slots.js?v=120",
    "./src/settlements.js?v=120",
    "./src/skirmishes.js?v=120",
    "./src/travelers.js?v=120",
    "./src/questing-beast.js?v=120",
    "./src/recitations.js?v=120",
    "./src/combat-visuals.js?v=120",
    "./src/dungeon-framework.js?v=120",
    "./src/elites.js?v=120",
    "./src/random.js?v=120",
    "./src/types.js?v=120",
    "./src/story.js?v=120",
    "./src/foundry.js?v=120",
    "./src/world.js?v=120",
    "./src/deep-dungeons.js?v=120",
    "./src/scenes.js?v=120",
    "./src/arenas.js?v=120",
    "./src/items.js?v=120",
    "./src/combat.js?v=120",
    "./src/interactions.js?v=120",
    "./src/persistence.js?v=120",
    "./src/input.js?v=120",
    "./src/game.js?v=120",
    "./src/renderer.js?v=120",
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
