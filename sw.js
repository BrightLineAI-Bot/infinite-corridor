const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v179`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=179",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=179",
    "./src/proving-ground.js?v=179",
    "./src/proving-ground-fixtures.js?v=179",
    "./src/proving-ground-labs.js?v=179",
    "./src/dungeon-variation.js?v=179",
    "./src/dungeon-completion.js?v=179",
    "./src/enemy-patterns.js?v=179",
    "./src/monster-pack.js?v=179",
    "./src/monster-render.js?v=179",
    "./src/landscape.js?v=179",
    "./src/landscape-render.js?v=179",
    "./src/underlands.js?v=179",
    "./src/pattern-dungeons.js?v=179",
    "./src/relay-network.js?v=179",
    "./src/glyphs.js?v=179",
    "./src/echoes.js?v=179",
    "./src/constellation.js?v=179",
    "./src/water-traversal.js?v=179",
    "./src/open-sea.js?v=179",
    "./src/boats.js?v=179",
    "./src/sea-creatures.js?v=179",
    "./src/diving.js?v=179",
    "./src/grottoes.js?v=179",
    "./src/spell-slots.js?v=179",
    "./src/settlements.js?v=179",
    "./src/skirmishes.js?v=179",
    "./src/travelers.js?v=179",
    "./src/diagnostic-probe.js?v=179",
    "./src/questing-beast.js?v=179",
    "./src/recitations.js?v=179",
    "./src/far-array.js?v=179",
    "./src/combat-visuals.js?v=179",
    "./src/dungeon-framework.js?v=179",
    "./src/elites.js?v=179",
    "./src/random.js?v=179",
    "./src/types.js?v=179",
    "./src/story.js?v=179",
    "./src/foundry.js?v=179",
    "./src/world.js?v=179",
    "./src/deep-dungeons.js?v=179",
    "./src/scenes.js?v=179",
    "./src/arenas.js?v=179",
    "./src/items.js?v=179",
    "./src/combat.js?v=179",
    "./src/interactions.js?v=179",
    "./src/persistence.js?v=179",
    "./src/input.js?v=179",
    "./src/game.js?v=179",
    "./src/renderer.js?v=179",
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
