const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v125`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=125",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=125",
    "./src/proving-ground.js?v=125",
    "./src/proving-ground-fixtures.js?v=125",
    "./src/proving-ground-labs.js?v=125",
    "./src/dungeon-variation.js?v=125",
    "./src/dungeon-completion.js?v=125",
    "./src/enemy-patterns.js?v=125",
    "./src/monster-pack.js?v=125",
    "./src/monster-render.js?v=125",
    "./src/landscape.js?v=125",
    "./src/landscape-render.js?v=125",
    "./src/underlands.js?v=125",
    "./src/relay-network.js?v=125",
    "./src/glyphs.js?v=125",
    "./src/echoes.js?v=125",
    "./src/constellation.js?v=125",
    "./src/water-traversal.js?v=125",
    "./src/boats.js?v=125",
    "./src/sea-creatures.js?v=125",
    "./src/diving.js?v=125",
    "./src/grottoes.js?v=125",
    "./src/spell-slots.js?v=125",
    "./src/settlements.js?v=125",
    "./src/skirmishes.js?v=125",
    "./src/travelers.js?v=125",
    "./src/questing-beast.js?v=125",
    "./src/recitations.js?v=125",
    "./src/combat-visuals.js?v=125",
    "./src/dungeon-framework.js?v=125",
    "./src/elites.js?v=125",
    "./src/random.js?v=125",
    "./src/types.js?v=125",
    "./src/story.js?v=125",
    "./src/foundry.js?v=125",
    "./src/world.js?v=125",
    "./src/deep-dungeons.js?v=125",
    "./src/scenes.js?v=125",
    "./src/arenas.js?v=125",
    "./src/items.js?v=125",
    "./src/combat.js?v=125",
    "./src/interactions.js?v=125",
    "./src/persistence.js?v=125",
    "./src/input.js?v=125",
    "./src/game.js?v=125",
    "./src/renderer.js?v=125",
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
