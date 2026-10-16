const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v139`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=139",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=139",
    "./src/proving-ground.js?v=139",
    "./src/proving-ground-fixtures.js?v=139",
    "./src/proving-ground-labs.js?v=139",
    "./src/dungeon-variation.js?v=139",
    "./src/dungeon-completion.js?v=139",
    "./src/enemy-patterns.js?v=139",
    "./src/monster-pack.js?v=139",
    "./src/monster-render.js?v=139",
    "./src/landscape.js?v=139",
    "./src/landscape-render.js?v=139",
    "./src/underlands.js?v=139",
    "./src/relay-network.js?v=139",
    "./src/glyphs.js?v=139",
    "./src/echoes.js?v=139",
    "./src/constellation.js?v=139",
    "./src/water-traversal.js?v=139",
    "./src/boats.js?v=139",
    "./src/sea-creatures.js?v=139",
    "./src/diving.js?v=139",
    "./src/grottoes.js?v=139",
    "./src/spell-slots.js?v=139",
    "./src/settlements.js?v=139",
    "./src/skirmishes.js?v=139",
    "./src/travelers.js?v=139",
    "./src/questing-beast.js?v=139",
    "./src/recitations.js?v=139",
    "./src/far-array.js?v=139",
    "./src/combat-visuals.js?v=139",
    "./src/dungeon-framework.js?v=139",
    "./src/elites.js?v=139",
    "./src/random.js?v=139",
    "./src/types.js?v=139",
    "./src/story.js?v=139",
    "./src/foundry.js?v=139",
    "./src/world.js?v=139",
    "./src/deep-dungeons.js?v=139",
    "./src/scenes.js?v=139",
    "./src/arenas.js?v=139",
    "./src/items.js?v=139",
    "./src/combat.js?v=139",
    "./src/interactions.js?v=139",
    "./src/persistence.js?v=139",
    "./src/input.js?v=139",
    "./src/game.js?v=139",
    "./src/renderer.js?v=139",
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
