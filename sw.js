const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v119`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=119",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=119",
    "./src/proving-ground.js?v=119",
    "./src/proving-ground-fixtures.js?v=119",
    "./src/proving-ground-labs.js?v=119",
    "./src/dungeon-variation.js?v=119",
    "./src/dungeon-completion.js?v=119",
    "./src/enemy-patterns.js?v=119",
    "./src/monster-pack.js?v=119",
    "./src/monster-render.js?v=119",
    "./src/landscape.js?v=119",
    "./src/landscape-render.js?v=119",
    "./src/underlands.js?v=119",
    "./src/relay-network.js?v=119",
    "./src/glyphs.js?v=119",
    "./src/echoes.js?v=119",
    "./src/constellation.js?v=119",
    "./src/water-traversal.js?v=119",
    "./src/boats.js?v=119",
    "./src/sea-creatures.js?v=119",
    "./src/diving.js?v=119",
    "./src/grottoes.js?v=119",
    "./src/spell-slots.js?v=119",
    "./src/settlements.js?v=119",
    "./src/skirmishes.js?v=119",
    "./src/travelers.js?v=119",
    "./src/questing-beast.js?v=119",
    "./src/recitations.js?v=119",
    "./src/combat-visuals.js?v=119",
    "./src/dungeon-framework.js?v=119",
    "./src/elites.js?v=119",
    "./src/random.js?v=119",
    "./src/types.js?v=119",
    "./src/story.js?v=119",
    "./src/foundry.js?v=119",
    "./src/world.js?v=119",
    "./src/deep-dungeons.js?v=119",
    "./src/scenes.js?v=119",
    "./src/arenas.js?v=119",
    "./src/items.js?v=119",
    "./src/combat.js?v=119",
    "./src/interactions.js?v=119",
    "./src/persistence.js?v=119",
    "./src/input.js?v=119",
    "./src/game.js?v=119",
    "./src/renderer.js?v=119",
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
