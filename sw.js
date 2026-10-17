const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v167`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=167",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=167",
    "./src/proving-ground.js?v=167",
    "./src/proving-ground-fixtures.js?v=167",
    "./src/proving-ground-labs.js?v=167",
    "./src/dungeon-variation.js?v=167",
    "./src/dungeon-completion.js?v=167",
    "./src/enemy-patterns.js?v=167",
    "./src/monster-pack.js?v=167",
    "./src/monster-render.js?v=167",
    "./src/landscape.js?v=167",
    "./src/landscape-render.js?v=167",
    "./src/underlands.js?v=167",
    "./src/pattern-dungeons.js?v=167",
    "./src/relay-network.js?v=167",
    "./src/glyphs.js?v=167",
    "./src/echoes.js?v=167",
    "./src/constellation.js?v=167",
    "./src/water-traversal.js?v=167",
    "./src/open-sea.js?v=167",
    "./src/boats.js?v=167",
    "./src/sea-creatures.js?v=167",
    "./src/diving.js?v=167",
    "./src/grottoes.js?v=167",
    "./src/spell-slots.js?v=167",
    "./src/settlements.js?v=167",
    "./src/skirmishes.js?v=167",
    "./src/travelers.js?v=167",
    "./src/diagnostic-probe.js?v=167",
    "./src/questing-beast.js?v=167",
    "./src/recitations.js?v=167",
    "./src/far-array.js?v=167",
    "./src/combat-visuals.js?v=167",
    "./src/dungeon-framework.js?v=167",
    "./src/elites.js?v=167",
    "./src/random.js?v=167",
    "./src/types.js?v=167",
    "./src/story.js?v=167",
    "./src/foundry.js?v=167",
    "./src/world.js?v=167",
    "./src/deep-dungeons.js?v=167",
    "./src/scenes.js?v=167",
    "./src/arenas.js?v=167",
    "./src/items.js?v=167",
    "./src/combat.js?v=167",
    "./src/interactions.js?v=167",
    "./src/persistence.js?v=167",
    "./src/input.js?v=167",
    "./src/game.js?v=167",
    "./src/renderer.js?v=167",
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
