const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v122`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=122",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=122",
    "./src/proving-ground.js?v=122",
    "./src/proving-ground-fixtures.js?v=122",
    "./src/proving-ground-labs.js?v=122",
    "./src/dungeon-variation.js?v=122",
    "./src/dungeon-completion.js?v=122",
    "./src/enemy-patterns.js?v=122",
    "./src/monster-pack.js?v=122",
    "./src/monster-render.js?v=122",
    "./src/landscape.js?v=122",
    "./src/landscape-render.js?v=122",
    "./src/underlands.js?v=122",
    "./src/relay-network.js?v=122",
    "./src/glyphs.js?v=122",
    "./src/echoes.js?v=122",
    "./src/constellation.js?v=122",
    "./src/water-traversal.js?v=122",
    "./src/boats.js?v=122",
    "./src/sea-creatures.js?v=122",
    "./src/diving.js?v=122",
    "./src/grottoes.js?v=122",
    "./src/spell-slots.js?v=122",
    "./src/settlements.js?v=122",
    "./src/skirmishes.js?v=122",
    "./src/travelers.js?v=122",
    "./src/questing-beast.js?v=122",
    "./src/recitations.js?v=122",
    "./src/combat-visuals.js?v=122",
    "./src/dungeon-framework.js?v=122",
    "./src/elites.js?v=122",
    "./src/random.js?v=122",
    "./src/types.js?v=122",
    "./src/story.js?v=122",
    "./src/foundry.js?v=122",
    "./src/world.js?v=122",
    "./src/deep-dungeons.js?v=122",
    "./src/scenes.js?v=122",
    "./src/arenas.js?v=122",
    "./src/items.js?v=122",
    "./src/combat.js?v=122",
    "./src/interactions.js?v=122",
    "./src/persistence.js?v=122",
    "./src/input.js?v=122",
    "./src/game.js?v=122",
    "./src/renderer.js?v=122",
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
