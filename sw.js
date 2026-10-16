const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v141`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=141",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=141",
    "./src/proving-ground.js?v=141",
    "./src/proving-ground-fixtures.js?v=141",
    "./src/proving-ground-labs.js?v=141",
    "./src/dungeon-variation.js?v=141",
    "./src/dungeon-completion.js?v=141",
    "./src/enemy-patterns.js?v=141",
    "./src/monster-pack.js?v=141",
    "./src/monster-render.js?v=141",
    "./src/landscape.js?v=141",
    "./src/landscape-render.js?v=141",
    "./src/underlands.js?v=141",
    "./src/relay-network.js?v=141",
    "./src/glyphs.js?v=141",
    "./src/echoes.js?v=141",
    "./src/constellation.js?v=141",
    "./src/water-traversal.js?v=141",
    "./src/boats.js?v=141",
    "./src/sea-creatures.js?v=141",
    "./src/diving.js?v=141",
    "./src/grottoes.js?v=141",
    "./src/spell-slots.js?v=141",
    "./src/settlements.js?v=141",
    "./src/skirmishes.js?v=141",
    "./src/travelers.js?v=141",
    "./src/questing-beast.js?v=141",
    "./src/recitations.js?v=141",
    "./src/far-array.js?v=141",
    "./src/combat-visuals.js?v=141",
    "./src/dungeon-framework.js?v=141",
    "./src/elites.js?v=141",
    "./src/random.js?v=141",
    "./src/types.js?v=141",
    "./src/story.js?v=141",
    "./src/foundry.js?v=141",
    "./src/world.js?v=141",
    "./src/deep-dungeons.js?v=141",
    "./src/scenes.js?v=141",
    "./src/arenas.js?v=141",
    "./src/items.js?v=141",
    "./src/combat.js?v=141",
    "./src/interactions.js?v=141",
    "./src/persistence.js?v=141",
    "./src/input.js?v=141",
    "./src/game.js?v=141",
    "./src/renderer.js?v=141",
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
