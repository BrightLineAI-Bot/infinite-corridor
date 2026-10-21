const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r253-447383f7b357`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r253-447383f7b357",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r253-447383f7b357",
    "./src/proving-ground.js?v=r253-447383f7b357",
    "./src/proving-ground-fixtures.js?v=r253-447383f7b357",
    "./src/proving-ground-labs.js?v=r253-447383f7b357",
    "./src/dungeon-variation.js?v=r253-447383f7b357",
    "./src/dungeon-completion.js?v=r253-447383f7b357",
    "./src/enemy-patterns.js?v=r253-447383f7b357",
    "./src/monster-pack.js?v=r253-447383f7b357",
    "./src/monster-render.js?v=r253-447383f7b357",
    "./src/astral-worm.js?v=r253-447383f7b357",
    "./src/astral-worm-render.js?v=r253-447383f7b357",
    "./src/astral-worm-retreat.js?v=r253-447383f7b357",
    "./src/astral-worm-mount.js?v=r253-447383f7b357",
    "./src/astral-encounters.js?v=r253-447383f7b357",
    "./src/astral-world-retreat.js?v=r253-447383f7b357",
    "./src/landscape.js?v=r253-447383f7b357",
    "./src/landscape-render.js?v=r253-447383f7b357",
    "./src/underlands.js?v=r253-447383f7b357",
    "./src/pattern-dungeons.js?v=r253-447383f7b357",
    "./src/relay-network.js?v=r253-447383f7b357",
    "./src/glyphs.js?v=r253-447383f7b357",
    "./src/echoes.js?v=r253-447383f7b357",
    "./src/constellation.js?v=r253-447383f7b357",
    "./src/water-traversal.js?v=r253-447383f7b357",
    "./src/open-sea.js?v=r253-447383f7b357",
    "./src/boats.js?v=r253-447383f7b357",
    "./src/sea-creatures.js?v=r253-447383f7b357",
    "./src/diving.js?v=r253-447383f7b357",
    "./src/grottoes.js?v=r253-447383f7b357",
    "./src/spell-slots.js?v=r253-447383f7b357",
    "./src/settlements.js?v=r253-447383f7b357",
    "./src/skirmishes.js?v=r253-447383f7b357",
    "./src/travelers.js?v=r253-447383f7b357",
    "./src/diagnostic-probe.js?v=r253-447383f7b357",
    "./src/questing-beast.js?v=r253-447383f7b357",
    "./src/recitations.js?v=r253-447383f7b357",
    "./src/lore.js?v=r253-447383f7b357",
    "./src/glimpses.js?v=r253-447383f7b357",
    "./src/glimpse-render.js?v=r253-447383f7b357",
    "./src/glimpse-paint.js?v=r253-447383f7b357",
    "./src/glimpse-scenes.js?v=r253-447383f7b357",
    "./src/glimpse-horror.js?v=r253-447383f7b357",
    "./src/glimpse-legend.js?v=r253-447383f7b357",
    "./src/glimpse-hand.js?v=r253-447383f7b357",
    "./src/atlas-view.js?v=r253-447383f7b357",
    "./src/strange.js?v=r253-447383f7b357",
    "./src/linked-dungeons.js?v=r253-447383f7b357",
    "./src/digging.js?v=r253-447383f7b357",
    "./src/tyrant-hunt.js?v=r253-447383f7b357",
    "./src/world-beasts.js?v=r253-447383f7b357",
    "./src/elders.js?v=r253-447383f7b357",
    "./src/far-array.js?v=r253-447383f7b357",
    "./src/combat-visuals.js?v=r253-447383f7b357",
    "./src/dungeon-framework.js?v=r253-447383f7b357",
    "./src/elites.js?v=r253-447383f7b357",
    "./src/random.js?v=r253-447383f7b357",
    "./src/types.js?v=r253-447383f7b357",
    "./src/story.js?v=r253-447383f7b357",
    "./src/foundry.js?v=r253-447383f7b357",
    "./src/world.js?v=r253-447383f7b357",
    "./src/deep-dungeons.js?v=r253-447383f7b357",
    "./src/scenes.js?v=r253-447383f7b357",
    "./src/arenas.js?v=r253-447383f7b357",
    "./src/items.js?v=r253-447383f7b357",
    "./src/combat.js?v=r253-447383f7b357",
    "./src/interactions.js?v=r253-447383f7b357",
    "./src/persistence.js?v=r253-447383f7b357",
    "./src/input.js?v=r253-447383f7b357",
    "./src/game.js?v=r253-447383f7b357",
    "./src/renderer.js?v=r253-447383f7b357",
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
