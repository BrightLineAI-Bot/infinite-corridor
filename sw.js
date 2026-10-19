const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v189`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=189",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=189",
    "./src/proving-ground.js?v=189",
    "./src/proving-ground-fixtures.js?v=189",
    "./src/proving-ground-labs.js?v=189",
    "./src/dungeon-variation.js?v=189",
    "./src/dungeon-completion.js?v=189",
    "./src/enemy-patterns.js?v=189",
    "./src/monster-pack.js?v=189",
    "./src/monster-render.js?v=189",
    "./src/landscape.js?v=189",
    "./src/landscape-render.js?v=189",
    "./src/underlands.js?v=189",
    "./src/pattern-dungeons.js?v=189",
    "./src/relay-network.js?v=189",
    "./src/glyphs.js?v=189",
    "./src/echoes.js?v=189",
    "./src/constellation.js?v=189",
    "./src/water-traversal.js?v=189",
    "./src/open-sea.js?v=189",
    "./src/boats.js?v=189",
    "./src/sea-creatures.js?v=189",
    "./src/diving.js?v=189",
    "./src/grottoes.js?v=189",
    "./src/spell-slots.js?v=189",
    "./src/settlements.js?v=189",
    "./src/skirmishes.js?v=189",
    "./src/travelers.js?v=189",
    "./src/diagnostic-probe.js?v=189",
    "./src/questing-beast.js?v=189",
    "./src/recitations.js?v=189",
    "./src/far-array.js?v=189",
    "./src/combat-visuals.js?v=189",
    "./src/dungeon-framework.js?v=189",
    "./src/elites.js?v=189",
    "./src/random.js?v=189",
    "./src/types.js?v=189",
    "./src/story.js?v=189",
    "./src/foundry.js?v=189",
    "./src/world.js?v=189",
    "./src/deep-dungeons.js?v=189",
    "./src/scenes.js?v=189",
    "./src/arenas.js?v=189",
    "./src/items.js?v=189",
    "./src/combat.js?v=189",
    "./src/interactions.js?v=189",
    "./src/persistence.js?v=189",
    "./src/input.js?v=189",
    "./src/game.js?v=189",
    "./src/renderer.js?v=189",
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
