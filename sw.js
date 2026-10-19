const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v227`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=227",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=227",
    "./src/proving-ground.js?v=227",
    "./src/proving-ground-fixtures.js?v=227",
    "./src/proving-ground-labs.js?v=227",
    "./src/dungeon-variation.js?v=227",
    "./src/dungeon-completion.js?v=227",
    "./src/enemy-patterns.js?v=227",
    "./src/monster-pack.js?v=227",
    "./src/monster-render.js?v=227",
    "./src/landscape.js?v=227",
    "./src/landscape-render.js?v=227",
    "./src/underlands.js?v=227",
    "./src/pattern-dungeons.js?v=227",
    "./src/relay-network.js?v=227",
    "./src/glyphs.js?v=227",
    "./src/echoes.js?v=227",
    "./src/constellation.js?v=227",
    "./src/water-traversal.js?v=227",
    "./src/open-sea.js?v=227",
    "./src/boats.js?v=227",
    "./src/sea-creatures.js?v=227",
    "./src/diving.js?v=227",
    "./src/grottoes.js?v=227",
    "./src/spell-slots.js?v=227",
    "./src/settlements.js?v=227",
    "./src/skirmishes.js?v=227",
    "./src/travelers.js?v=227",
    "./src/diagnostic-probe.js?v=227",
    "./src/questing-beast.js?v=227",
    "./src/recitations.js?v=227",
    "./src/lore.js?v=227",
    "./src/glimpses.js?v=227",
    "./src/glimpse-render.js?v=227",
    "./src/glimpse-paint.js?v=227",
    "./src/glimpse-scenes.js?v=227",
    "./src/glimpse-horror.js?v=227",
    "./src/glimpse-legend.js?v=227",
    "./src/glimpse-hand.js?v=227",
    "./src/atlas-view.js?v=227",
    "./src/strange.js?v=227",
    "./src/linked-dungeons.js?v=227",
    "./src/digging.js?v=227",
    "./src/elders.js?v=227",
    "./src/far-array.js?v=227",
    "./src/combat-visuals.js?v=227",
    "./src/dungeon-framework.js?v=227",
    "./src/elites.js?v=227",
    "./src/random.js?v=227",
    "./src/types.js?v=227",
    "./src/story.js?v=227",
    "./src/foundry.js?v=227",
    "./src/world.js?v=227",
    "./src/deep-dungeons.js?v=227",
    "./src/scenes.js?v=227",
    "./src/arenas.js?v=227",
    "./src/items.js?v=227",
    "./src/combat.js?v=227",
    "./src/interactions.js?v=227",
    "./src/persistence.js?v=227",
    "./src/input.js?v=227",
    "./src/game.js?v=227",
    "./src/renderer.js?v=227",
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
