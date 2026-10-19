const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v191`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=191",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=191",
    "./src/proving-ground.js?v=191",
    "./src/proving-ground-fixtures.js?v=191",
    "./src/proving-ground-labs.js?v=191",
    "./src/dungeon-variation.js?v=191",
    "./src/dungeon-completion.js?v=191",
    "./src/enemy-patterns.js?v=191",
    "./src/monster-pack.js?v=191",
    "./src/monster-render.js?v=191",
    "./src/landscape.js?v=191",
    "./src/landscape-render.js?v=191",
    "./src/underlands.js?v=191",
    "./src/pattern-dungeons.js?v=191",
    "./src/relay-network.js?v=191",
    "./src/glyphs.js?v=191",
    "./src/echoes.js?v=191",
    "./src/constellation.js?v=191",
    "./src/water-traversal.js?v=191",
    "./src/open-sea.js?v=191",
    "./src/boats.js?v=191",
    "./src/sea-creatures.js?v=191",
    "./src/diving.js?v=191",
    "./src/grottoes.js?v=191",
    "./src/spell-slots.js?v=191",
    "./src/settlements.js?v=191",
    "./src/skirmishes.js?v=191",
    "./src/travelers.js?v=191",
    "./src/diagnostic-probe.js?v=191",
    "./src/questing-beast.js?v=191",
    "./src/recitations.js?v=191",
    "./src/lore.js?v=191",
    "./src/far-array.js?v=191",
    "./src/combat-visuals.js?v=191",
    "./src/dungeon-framework.js?v=191",
    "./src/elites.js?v=191",
    "./src/random.js?v=191",
    "./src/types.js?v=191",
    "./src/story.js?v=191",
    "./src/foundry.js?v=191",
    "./src/world.js?v=191",
    "./src/deep-dungeons.js?v=191",
    "./src/scenes.js?v=191",
    "./src/arenas.js?v=191",
    "./src/items.js?v=191",
    "./src/combat.js?v=191",
    "./src/interactions.js?v=191",
    "./src/persistence.js?v=191",
    "./src/input.js?v=191",
    "./src/game.js?v=191",
    "./src/renderer.js?v=191",
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
