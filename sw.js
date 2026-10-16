const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v128`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=128",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=128",
    "./src/proving-ground.js?v=128",
    "./src/proving-ground-fixtures.js?v=128",
    "./src/proving-ground-labs.js?v=128",
    "./src/dungeon-variation.js?v=128",
    "./src/dungeon-completion.js?v=128",
    "./src/enemy-patterns.js?v=128",
    "./src/monster-pack.js?v=128",
    "./src/monster-render.js?v=128",
    "./src/landscape.js?v=128",
    "./src/landscape-render.js?v=128",
    "./src/underlands.js?v=128",
    "./src/relay-network.js?v=128",
    "./src/glyphs.js?v=128",
    "./src/echoes.js?v=128",
    "./src/constellation.js?v=128",
    "./src/water-traversal.js?v=128",
    "./src/boats.js?v=128",
    "./src/sea-creatures.js?v=128",
    "./src/diving.js?v=128",
    "./src/grottoes.js?v=128",
    "./src/spell-slots.js?v=128",
    "./src/settlements.js?v=128",
    "./src/skirmishes.js?v=128",
    "./src/travelers.js?v=128",
    "./src/questing-beast.js?v=128",
    "./src/recitations.js?v=128",
    "./src/combat-visuals.js?v=128",
    "./src/dungeon-framework.js?v=128",
    "./src/elites.js?v=128",
    "./src/random.js?v=128",
    "./src/types.js?v=128",
    "./src/story.js?v=128",
    "./src/foundry.js?v=128",
    "./src/world.js?v=128",
    "./src/deep-dungeons.js?v=128",
    "./src/scenes.js?v=128",
    "./src/arenas.js?v=128",
    "./src/items.js?v=128",
    "./src/combat.js?v=128",
    "./src/interactions.js?v=128",
    "./src/persistence.js?v=128",
    "./src/input.js?v=128",
    "./src/game.js?v=128",
    "./src/renderer.js?v=128",
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
