const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v159`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=159",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=159",
    "./src/proving-ground.js?v=159",
    "./src/proving-ground-fixtures.js?v=159",
    "./src/proving-ground-labs.js?v=159",
    "./src/dungeon-variation.js?v=159",
    "./src/dungeon-completion.js?v=159",
    "./src/enemy-patterns.js?v=159",
    "./src/monster-pack.js?v=159",
    "./src/monster-render.js?v=159",
    "./src/landscape.js?v=159",
    "./src/landscape-render.js?v=159",
    "./src/underlands.js?v=159",
    "./src/pattern-dungeons.js?v=159",
    "./src/relay-network.js?v=159",
    "./src/glyphs.js?v=159",
    "./src/echoes.js?v=159",
    "./src/constellation.js?v=159",
    "./src/water-traversal.js?v=159",
    "./src/open-sea.js?v=159",
    "./src/boats.js?v=159",
    "./src/sea-creatures.js?v=159",
    "./src/diving.js?v=159",
    "./src/grottoes.js?v=159",
    "./src/spell-slots.js?v=159",
    "./src/settlements.js?v=159",
    "./src/skirmishes.js?v=159",
    "./src/travelers.js?v=159",
    "./src/questing-beast.js?v=159",
    "./src/recitations.js?v=159",
    "./src/far-array.js?v=159",
    "./src/combat-visuals.js?v=159",
    "./src/dungeon-framework.js?v=159",
    "./src/elites.js?v=159",
    "./src/random.js?v=159",
    "./src/types.js?v=159",
    "./src/story.js?v=159",
    "./src/foundry.js?v=159",
    "./src/world.js?v=159",
    "./src/deep-dungeons.js?v=159",
    "./src/scenes.js?v=159",
    "./src/arenas.js?v=159",
    "./src/items.js?v=159",
    "./src/combat.js?v=159",
    "./src/interactions.js?v=159",
    "./src/persistence.js?v=159",
    "./src/input.js?v=159",
    "./src/game.js?v=159",
    "./src/renderer.js?v=159",
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
