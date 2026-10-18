const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v181`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=181",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=181",
    "./src/proving-ground.js?v=181",
    "./src/proving-ground-fixtures.js?v=181",
    "./src/proving-ground-labs.js?v=181",
    "./src/dungeon-variation.js?v=181",
    "./src/dungeon-completion.js?v=181",
    "./src/enemy-patterns.js?v=181",
    "./src/monster-pack.js?v=181",
    "./src/monster-render.js?v=181",
    "./src/landscape.js?v=181",
    "./src/landscape-render.js?v=181",
    "./src/underlands.js?v=181",
    "./src/pattern-dungeons.js?v=181",
    "./src/relay-network.js?v=181",
    "./src/glyphs.js?v=181",
    "./src/echoes.js?v=181",
    "./src/constellation.js?v=181",
    "./src/water-traversal.js?v=181",
    "./src/open-sea.js?v=181",
    "./src/boats.js?v=181",
    "./src/sea-creatures.js?v=181",
    "./src/diving.js?v=181",
    "./src/grottoes.js?v=181",
    "./src/spell-slots.js?v=181",
    "./src/settlements.js?v=181",
    "./src/skirmishes.js?v=181",
    "./src/travelers.js?v=181",
    "./src/diagnostic-probe.js?v=181",
    "./src/questing-beast.js?v=181",
    "./src/recitations.js?v=181",
    "./src/far-array.js?v=181",
    "./src/combat-visuals.js?v=181",
    "./src/dungeon-framework.js?v=181",
    "./src/elites.js?v=181",
    "./src/random.js?v=181",
    "./src/types.js?v=181",
    "./src/story.js?v=181",
    "./src/foundry.js?v=181",
    "./src/world.js?v=181",
    "./src/deep-dungeons.js?v=181",
    "./src/scenes.js?v=181",
    "./src/arenas.js?v=181",
    "./src/items.js?v=181",
    "./src/combat.js?v=181",
    "./src/interactions.js?v=181",
    "./src/persistence.js?v=181",
    "./src/input.js?v=181",
    "./src/game.js?v=181",
    "./src/renderer.js?v=181",
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
