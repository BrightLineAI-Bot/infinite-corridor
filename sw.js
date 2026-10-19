const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r221-62b2f668c170`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r221-62b2f668c170",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r221-62b2f668c170",
    "./src/proving-ground.js?v=r221-62b2f668c170",
    "./src/proving-ground-fixtures.js?v=r221-62b2f668c170",
    "./src/proving-ground-labs.js?v=r221-62b2f668c170",
    "./src/dungeon-variation.js?v=r221-62b2f668c170",
    "./src/dungeon-completion.js?v=r221-62b2f668c170",
    "./src/enemy-patterns.js?v=r221-62b2f668c170",
    "./src/monster-pack.js?v=r221-62b2f668c170",
    "./src/monster-render.js?v=r221-62b2f668c170",
    "./src/landscape.js?v=r221-62b2f668c170",
    "./src/landscape-render.js?v=r221-62b2f668c170",
    "./src/underlands.js?v=r221-62b2f668c170",
    "./src/pattern-dungeons.js?v=r221-62b2f668c170",
    "./src/relay-network.js?v=r221-62b2f668c170",
    "./src/glyphs.js?v=r221-62b2f668c170",
    "./src/echoes.js?v=r221-62b2f668c170",
    "./src/constellation.js?v=r221-62b2f668c170",
    "./src/water-traversal.js?v=r221-62b2f668c170",
    "./src/open-sea.js?v=r221-62b2f668c170",
    "./src/boats.js?v=r221-62b2f668c170",
    "./src/sea-creatures.js?v=r221-62b2f668c170",
    "./src/diving.js?v=r221-62b2f668c170",
    "./src/grottoes.js?v=r221-62b2f668c170",
    "./src/spell-slots.js?v=r221-62b2f668c170",
    "./src/settlements.js?v=r221-62b2f668c170",
    "./src/skirmishes.js?v=r221-62b2f668c170",
    "./src/travelers.js?v=r221-62b2f668c170",
    "./src/diagnostic-probe.js?v=r221-62b2f668c170",
    "./src/questing-beast.js?v=r221-62b2f668c170",
    "./src/recitations.js?v=r221-62b2f668c170",
    "./src/lore.js?v=r221-62b2f668c170",
    "./src/glimpses.js?v=r221-62b2f668c170",
    "./src/glimpse-render.js?v=r221-62b2f668c170",
    "./src/glimpse-paint.js?v=r221-62b2f668c170",
    "./src/glimpse-scenes.js?v=r221-62b2f668c170",
    "./src/glimpse-horror.js?v=r221-62b2f668c170",
    "./src/glimpse-legend.js?v=r221-62b2f668c170",
    "./src/glimpse-hand.js?v=r221-62b2f668c170",
    "./src/atlas-view.js?v=r221-62b2f668c170",
    "./src/strange.js?v=r221-62b2f668c170",
    "./src/linked-dungeons.js?v=r221-62b2f668c170",
    "./src/elders.js?v=r221-62b2f668c170",
    "./src/far-array.js?v=r221-62b2f668c170",
    "./src/combat-visuals.js?v=r221-62b2f668c170",
    "./src/dungeon-framework.js?v=r221-62b2f668c170",
    "./src/elites.js?v=r221-62b2f668c170",
    "./src/random.js?v=r221-62b2f668c170",
    "./src/types.js?v=r221-62b2f668c170",
    "./src/story.js?v=r221-62b2f668c170",
    "./src/foundry.js?v=r221-62b2f668c170",
    "./src/world.js?v=r221-62b2f668c170",
    "./src/deep-dungeons.js?v=r221-62b2f668c170",
    "./src/scenes.js?v=r221-62b2f668c170",
    "./src/arenas.js?v=r221-62b2f668c170",
    "./src/items.js?v=r221-62b2f668c170",
    "./src/combat.js?v=r221-62b2f668c170",
    "./src/interactions.js?v=r221-62b2f668c170",
    "./src/persistence.js?v=r221-62b2f668c170",
    "./src/input.js?v=r221-62b2f668c170",
    "./src/game.js?v=r221-62b2f668c170",
    "./src/renderer.js?v=r221-62b2f668c170",
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
