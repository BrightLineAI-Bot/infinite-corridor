const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v146`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=146",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=146",
    "./src/proving-ground.js?v=146",
    "./src/proving-ground-fixtures.js?v=146",
    "./src/proving-ground-labs.js?v=146",
    "./src/dungeon-variation.js?v=146",
    "./src/dungeon-completion.js?v=146",
    "./src/enemy-patterns.js?v=146",
    "./src/monster-pack.js?v=146",
    "./src/monster-render.js?v=146",
    "./src/landscape.js?v=146",
    "./src/landscape-render.js?v=146",
    "./src/underlands.js?v=146",
    "./src/relay-network.js?v=146",
    "./src/glyphs.js?v=146",
    "./src/echoes.js?v=146",
    "./src/constellation.js?v=146",
    "./src/water-traversal.js?v=146",
    "./src/boats.js?v=146",
    "./src/sea-creatures.js?v=146",
    "./src/diving.js?v=146",
    "./src/grottoes.js?v=146",
    "./src/spell-slots.js?v=146",
    "./src/settlements.js?v=146",
    "./src/skirmishes.js?v=146",
    "./src/travelers.js?v=146",
    "./src/questing-beast.js?v=146",
    "./src/recitations.js?v=146",
    "./src/far-array.js?v=146",
    "./src/combat-visuals.js?v=146",
    "./src/dungeon-framework.js?v=146",
    "./src/elites.js?v=146",
    "./src/random.js?v=146",
    "./src/types.js?v=146",
    "./src/story.js?v=146",
    "./src/foundry.js?v=146",
    "./src/world.js?v=146",
    "./src/deep-dungeons.js?v=146",
    "./src/scenes.js?v=146",
    "./src/arenas.js?v=146",
    "./src/items.js?v=146",
    "./src/combat.js?v=146",
    "./src/interactions.js?v=146",
    "./src/persistence.js?v=146",
    "./src/input.js?v=146",
    "./src/game.js?v=146",
    "./src/renderer.js?v=146",
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
