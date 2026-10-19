const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v219`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=219",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=219",
    "./src/proving-ground.js?v=219",
    "./src/proving-ground-fixtures.js?v=219",
    "./src/proving-ground-labs.js?v=219",
    "./src/dungeon-variation.js?v=219",
    "./src/dungeon-completion.js?v=219",
    "./src/enemy-patterns.js?v=219",
    "./src/monster-pack.js?v=219",
    "./src/monster-render.js?v=219",
    "./src/landscape.js?v=219",
    "./src/landscape-render.js?v=219",
    "./src/underlands.js?v=219",
    "./src/pattern-dungeons.js?v=219",
    "./src/relay-network.js?v=219",
    "./src/glyphs.js?v=219",
    "./src/echoes.js?v=219",
    "./src/constellation.js?v=219",
    "./src/water-traversal.js?v=219",
    "./src/open-sea.js?v=219",
    "./src/boats.js?v=219",
    "./src/sea-creatures.js?v=219",
    "./src/diving.js?v=219",
    "./src/grottoes.js?v=219",
    "./src/spell-slots.js?v=219",
    "./src/settlements.js?v=219",
    "./src/skirmishes.js?v=219",
    "./src/travelers.js?v=219",
    "./src/diagnostic-probe.js?v=219",
    "./src/questing-beast.js?v=219",
    "./src/recitations.js?v=219",
    "./src/lore.js?v=219",
    "./src/glimpses.js?v=219",
    "./src/glimpse-render.js?v=219",
    "./src/glimpse-paint.js?v=219",
    "./src/glimpse-scenes.js?v=219",
    "./src/glimpse-horror.js?v=219",
    "./src/glimpse-legend.js?v=219",
    "./src/atlas-view.js?v=219",
    "./src/strange.js?v=219",
    "./src/linked-dungeons.js?v=219",
    "./src/elders.js?v=219",
    "./src/far-array.js?v=219",
    "./src/combat-visuals.js?v=219",
    "./src/dungeon-framework.js?v=219",
    "./src/elites.js?v=219",
    "./src/random.js?v=219",
    "./src/types.js?v=219",
    "./src/story.js?v=219",
    "./src/foundry.js?v=219",
    "./src/world.js?v=219",
    "./src/deep-dungeons.js?v=219",
    "./src/scenes.js?v=219",
    "./src/arenas.js?v=219",
    "./src/items.js?v=219",
    "./src/combat.js?v=219",
    "./src/interactions.js?v=219",
    "./src/persistence.js?v=219",
    "./src/input.js?v=219",
    "./src/game.js?v=219",
    "./src/renderer.js?v=219",
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
