const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v124`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=124",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=124",
    "./src/proving-ground.js?v=124",
    "./src/proving-ground-fixtures.js?v=124",
    "./src/proving-ground-labs.js?v=124",
    "./src/dungeon-variation.js?v=124",
    "./src/dungeon-completion.js?v=124",
    "./src/enemy-patterns.js?v=124",
    "./src/monster-pack.js?v=124",
    "./src/monster-render.js?v=124",
    "./src/landscape.js?v=124",
    "./src/landscape-render.js?v=124",
    "./src/underlands.js?v=124",
    "./src/relay-network.js?v=124",
    "./src/glyphs.js?v=124",
    "./src/echoes.js?v=124",
    "./src/constellation.js?v=124",
    "./src/water-traversal.js?v=124",
    "./src/boats.js?v=124",
    "./src/sea-creatures.js?v=124",
    "./src/diving.js?v=124",
    "./src/grottoes.js?v=124",
    "./src/spell-slots.js?v=124",
    "./src/settlements.js?v=124",
    "./src/skirmishes.js?v=124",
    "./src/travelers.js?v=124",
    "./src/questing-beast.js?v=124",
    "./src/recitations.js?v=124",
    "./src/combat-visuals.js?v=124",
    "./src/dungeon-framework.js?v=124",
    "./src/elites.js?v=124",
    "./src/random.js?v=124",
    "./src/types.js?v=124",
    "./src/story.js?v=124",
    "./src/foundry.js?v=124",
    "./src/world.js?v=124",
    "./src/deep-dungeons.js?v=124",
    "./src/scenes.js?v=124",
    "./src/arenas.js?v=124",
    "./src/items.js?v=124",
    "./src/combat.js?v=124",
    "./src/interactions.js?v=124",
    "./src/persistence.js?v=124",
    "./src/input.js?v=124",
    "./src/game.js?v=124",
    "./src/renderer.js?v=124",
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
