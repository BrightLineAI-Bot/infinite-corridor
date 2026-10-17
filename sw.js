const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v164`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=164",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=164",
    "./src/proving-ground.js?v=164",
    "./src/proving-ground-fixtures.js?v=164",
    "./src/proving-ground-labs.js?v=164",
    "./src/dungeon-variation.js?v=164",
    "./src/dungeon-completion.js?v=164",
    "./src/enemy-patterns.js?v=164",
    "./src/monster-pack.js?v=164",
    "./src/monster-render.js?v=164",
    "./src/landscape.js?v=164",
    "./src/landscape-render.js?v=164",
    "./src/underlands.js?v=164",
    "./src/pattern-dungeons.js?v=164",
    "./src/relay-network.js?v=164",
    "./src/glyphs.js?v=164",
    "./src/echoes.js?v=164",
    "./src/constellation.js?v=164",
    "./src/water-traversal.js?v=164",
    "./src/open-sea.js?v=164",
    "./src/boats.js?v=164",
    "./src/sea-creatures.js?v=164",
    "./src/diving.js?v=164",
    "./src/grottoes.js?v=164",
    "./src/spell-slots.js?v=164",
    "./src/settlements.js?v=164",
    "./src/skirmishes.js?v=164",
    "./src/travelers.js?v=164",
    "./src/questing-beast.js?v=164",
    "./src/recitations.js?v=164",
    "./src/far-array.js?v=164",
    "./src/combat-visuals.js?v=164",
    "./src/dungeon-framework.js?v=164",
    "./src/elites.js?v=164",
    "./src/random.js?v=164",
    "./src/types.js?v=164",
    "./src/story.js?v=164",
    "./src/foundry.js?v=164",
    "./src/world.js?v=164",
    "./src/deep-dungeons.js?v=164",
    "./src/scenes.js?v=164",
    "./src/arenas.js?v=164",
    "./src/items.js?v=164",
    "./src/combat.js?v=164",
    "./src/interactions.js?v=164",
    "./src/persistence.js?v=164",
    "./src/input.js?v=164",
    "./src/game.js?v=164",
    "./src/renderer.js?v=164",
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
