const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v157`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=157",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=157",
    "./src/proving-ground.js?v=157",
    "./src/proving-ground-fixtures.js?v=157",
    "./src/proving-ground-labs.js?v=157",
    "./src/dungeon-variation.js?v=157",
    "./src/dungeon-completion.js?v=157",
    "./src/enemy-patterns.js?v=157",
    "./src/monster-pack.js?v=157",
    "./src/monster-render.js?v=157",
    "./src/landscape.js?v=157",
    "./src/landscape-render.js?v=157",
    "./src/underlands.js?v=157",
    "./src/pattern-dungeons.js?v=157",
    "./src/relay-network.js?v=157",
    "./src/glyphs.js?v=157",
    "./src/echoes.js?v=157",
    "./src/constellation.js?v=157",
    "./src/water-traversal.js?v=157",
    "./src/open-sea.js?v=157",
    "./src/boats.js?v=157",
    "./src/sea-creatures.js?v=157",
    "./src/diving.js?v=157",
    "./src/grottoes.js?v=157",
    "./src/spell-slots.js?v=157",
    "./src/settlements.js?v=157",
    "./src/skirmishes.js?v=157",
    "./src/travelers.js?v=157",
    "./src/questing-beast.js?v=157",
    "./src/recitations.js?v=157",
    "./src/far-array.js?v=157",
    "./src/combat-visuals.js?v=157",
    "./src/dungeon-framework.js?v=157",
    "./src/elites.js?v=157",
    "./src/random.js?v=157",
    "./src/types.js?v=157",
    "./src/story.js?v=157",
    "./src/foundry.js?v=157",
    "./src/world.js?v=157",
    "./src/deep-dungeons.js?v=157",
    "./src/scenes.js?v=157",
    "./src/arenas.js?v=157",
    "./src/items.js?v=157",
    "./src/combat.js?v=157",
    "./src/interactions.js?v=157",
    "./src/persistence.js?v=157",
    "./src/input.js?v=157",
    "./src/game.js?v=157",
    "./src/renderer.js?v=157",
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
