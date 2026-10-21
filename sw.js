const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v257`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=257",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=257",
    "./src/proving-ground.js?v=257",
    "./src/proving-ground-fixtures.js?v=257",
    "./src/proving-ground-labs.js?v=257",
    "./src/dungeon-variation.js?v=257",
    "./src/dungeon-completion.js?v=257",
    "./src/enemy-patterns.js?v=257",
    "./src/monster-pack.js?v=257",
    "./src/monster-render.js?v=257",
    "./src/astral-worm.js?v=257",
    "./src/astral-worm-render.js?v=257",
    "./src/astral-worm-retreat.js?v=257",
    "./src/astral-worm-mount.js?v=257",
    "./src/lightning-giant-render.js?v=257",
    "./src/astral-encounters.js?v=257",
    "./src/astral-world-retreat.js?v=257",
    "./src/landscape.js?v=257",
    "./src/landscape-render.js?v=257",
    "./src/underlands.js?v=257",
    "./src/pattern-dungeons.js?v=257",
    "./src/relay-network.js?v=257",
    "./src/glyphs.js?v=257",
    "./src/echoes.js?v=257",
    "./src/constellation.js?v=257",
    "./src/water-traversal.js?v=257",
    "./src/open-sea.js?v=257",
    "./src/boats.js?v=257",
    "./src/sea-creatures.js?v=257",
    "./src/diving.js?v=257",
    "./src/grottoes.js?v=257",
    "./src/spell-slots.js?v=257",
    "./src/settlements.js?v=257",
    "./src/skirmishes.js?v=257",
    "./src/travelers.js?v=257",
    "./src/diagnostic-probe.js?v=257",
    "./src/questing-beast.js?v=257",
    "./src/recitations.js?v=257",
    "./src/lore.js?v=257",
    "./src/glimpses.js?v=257",
    "./src/glimpse-render.js?v=257",
    "./src/glimpse-paint.js?v=257",
    "./src/glimpse-scenes.js?v=257",
    "./src/glimpse-horror.js?v=257",
    "./src/glimpse-legend.js?v=257",
    "./src/glimpse-hand.js?v=257",
    "./src/atlas-view.js?v=257",
    "./src/strange.js?v=257",
    "./src/linked-dungeons.js?v=257",
    "./src/digging.js?v=257",
    "./src/tyrant-hunt.js?v=257",
    "./src/world-beasts.js?v=257",
    "./src/elders.js?v=257",
    "./src/far-array.js?v=257",
    "./src/combat-visuals.js?v=257",
    "./src/dungeon-framework.js?v=257",
    "./src/elites.js?v=257",
    "./src/random.js?v=257",
    "./src/types.js?v=257",
    "./src/story.js?v=257",
    "./src/foundry.js?v=257",
    "./src/world.js?v=257",
    "./src/deep-dungeons.js?v=257",
    "./src/scenes.js?v=257",
    "./src/arenas.js?v=257",
    "./src/items.js?v=257",
    "./src/combat.js?v=257",
    "./src/interactions.js?v=257",
    "./src/persistence.js?v=257",
    "./src/input.js?v=257",
    "./src/game.js?v=257",
    "./src/renderer.js?v=257",
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
