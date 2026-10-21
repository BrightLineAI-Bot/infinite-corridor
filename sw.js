const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v253`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=253",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=253",
    "./src/proving-ground.js?v=253",
    "./src/proving-ground-fixtures.js?v=253",
    "./src/proving-ground-labs.js?v=253",
    "./src/dungeon-variation.js?v=253",
    "./src/dungeon-completion.js?v=253",
    "./src/enemy-patterns.js?v=253",
    "./src/monster-pack.js?v=253",
    "./src/monster-render.js?v=253",
    "./src/astral-worm.js?v=253",
    "./src/astral-worm-render.js?v=253",
    "./src/astral-worm-retreat.js?v=253",
    "./src/astral-worm-mount.js?v=253",
    "./src/astral-encounters.js?v=253",
    "./src/astral-world-retreat.js?v=253",
    "./src/landscape.js?v=253",
    "./src/landscape-render.js?v=253",
    "./src/underlands.js?v=253",
    "./src/pattern-dungeons.js?v=253",
    "./src/relay-network.js?v=253",
    "./src/glyphs.js?v=253",
    "./src/echoes.js?v=253",
    "./src/constellation.js?v=253",
    "./src/water-traversal.js?v=253",
    "./src/open-sea.js?v=253",
    "./src/boats.js?v=253",
    "./src/sea-creatures.js?v=253",
    "./src/diving.js?v=253",
    "./src/grottoes.js?v=253",
    "./src/spell-slots.js?v=253",
    "./src/settlements.js?v=253",
    "./src/skirmishes.js?v=253",
    "./src/travelers.js?v=253",
    "./src/diagnostic-probe.js?v=253",
    "./src/questing-beast.js?v=253",
    "./src/recitations.js?v=253",
    "./src/lore.js?v=253",
    "./src/glimpses.js?v=253",
    "./src/glimpse-render.js?v=253",
    "./src/glimpse-paint.js?v=253",
    "./src/glimpse-scenes.js?v=253",
    "./src/glimpse-horror.js?v=253",
    "./src/glimpse-legend.js?v=253",
    "./src/glimpse-hand.js?v=253",
    "./src/atlas-view.js?v=253",
    "./src/strange.js?v=253",
    "./src/linked-dungeons.js?v=253",
    "./src/digging.js?v=253",
    "./src/tyrant-hunt.js?v=253",
    "./src/world-beasts.js?v=253",
    "./src/elders.js?v=253",
    "./src/far-array.js?v=253",
    "./src/combat-visuals.js?v=253",
    "./src/dungeon-framework.js?v=253",
    "./src/elites.js?v=253",
    "./src/random.js?v=253",
    "./src/types.js?v=253",
    "./src/story.js?v=253",
    "./src/foundry.js?v=253",
    "./src/world.js?v=253",
    "./src/deep-dungeons.js?v=253",
    "./src/scenes.js?v=253",
    "./src/arenas.js?v=253",
    "./src/items.js?v=253",
    "./src/combat.js?v=253",
    "./src/interactions.js?v=253",
    "./src/persistence.js?v=253",
    "./src/input.js?v=253",
    "./src/game.js?v=253",
    "./src/renderer.js?v=253",
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
