const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v149`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=149",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=149",
    "./src/proving-ground.js?v=149",
    "./src/proving-ground-fixtures.js?v=149",
    "./src/proving-ground-labs.js?v=149",
    "./src/dungeon-variation.js?v=149",
    "./src/dungeon-completion.js?v=149",
    "./src/enemy-patterns.js?v=149",
    "./src/monster-pack.js?v=149",
    "./src/monster-render.js?v=149",
    "./src/landscape.js?v=149",
    "./src/landscape-render.js?v=149",
    "./src/underlands.js?v=149",
    "./src/pattern-dungeons.js?v=149",
    "./src/relay-network.js?v=149",
    "./src/glyphs.js?v=149",
    "./src/echoes.js?v=149",
    "./src/constellation.js?v=149",
    "./src/water-traversal.js?v=149",
    "./src/boats.js?v=149",
    "./src/sea-creatures.js?v=149",
    "./src/diving.js?v=149",
    "./src/grottoes.js?v=149",
    "./src/spell-slots.js?v=149",
    "./src/settlements.js?v=149",
    "./src/skirmishes.js?v=149",
    "./src/travelers.js?v=149",
    "./src/questing-beast.js?v=149",
    "./src/recitations.js?v=149",
    "./src/far-array.js?v=149",
    "./src/combat-visuals.js?v=149",
    "./src/dungeon-framework.js?v=149",
    "./src/elites.js?v=149",
    "./src/random.js?v=149",
    "./src/types.js?v=149",
    "./src/story.js?v=149",
    "./src/foundry.js?v=149",
    "./src/world.js?v=149",
    "./src/deep-dungeons.js?v=149",
    "./src/scenes.js?v=149",
    "./src/arenas.js?v=149",
    "./src/items.js?v=149",
    "./src/combat.js?v=149",
    "./src/interactions.js?v=149",
    "./src/persistence.js?v=149",
    "./src/input.js?v=149",
    "./src/game.js?v=149",
    "./src/renderer.js?v=149",
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
