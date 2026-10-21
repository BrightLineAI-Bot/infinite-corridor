const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v267`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=267",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=267",
    "./src/proving-ground.js?v=267",
    "./src/proving-ground-fixtures.js?v=267",
    "./src/proving-ground-labs.js?v=267",
    "./src/dungeon-variation.js?v=267",
    "./src/dungeon-completion.js?v=267",
    "./src/enemy-patterns.js?v=267",
    "./src/monster-pack.js?v=267",
    "./src/monster-render.js?v=267",
    "./src/astral-worm.js?v=267",
    "./src/astral-worm-render.js?v=267",
    "./src/astral-worm-retreat.js?v=267",
    "./src/astral-worm-mount.js?v=267",
    "./src/lightning-giant-render.js?v=267",
    "./src/astral-encounters.js?v=267",
    "./src/astral-world-retreat.js?v=267",
    "./src/landscape.js?v=267",
    "./src/landscape-render.js?v=267",
    "./src/underlands.js?v=267",
    "./src/pattern-dungeons.js?v=267",
    "./src/relay-network.js?v=267",
    "./src/glyphs.js?v=267",
    "./src/echoes.js?v=267",
    "./src/constellation.js?v=267",
    "./src/water-traversal.js?v=267",
    "./src/open-sea.js?v=267",
    "./src/boats.js?v=267",
    "./src/sea-creatures.js?v=267",
    "./src/diving.js?v=267",
    "./src/grottoes.js?v=267",
    "./src/spell-slots.js?v=267",
    "./src/settlements.js?v=267",
    "./src/skirmishes.js?v=267",
    "./src/travelers.js?v=267",
    "./src/diagnostic-probe.js?v=267",
    "./src/questing-beast.js?v=267",
    "./src/recitations.js?v=267",
    "./src/lore.js?v=267",
    "./src/glimpses.js?v=267",
    "./src/glimpse-render.js?v=267",
    "./src/glimpse-paint.js?v=267",
    "./src/glimpse-scenes.js?v=267",
    "./src/glimpse-horror.js?v=267",
    "./src/glimpse-legend.js?v=267",
    "./src/glimpse-hand.js?v=267",
    "./src/atlas-view.js?v=267",
    "./src/strange.js?v=267",
    "./src/linked-dungeons.js?v=267",
    "./src/digging.js?v=267",
    "./src/building.js?v=267",
    "./src/refuge-lands.js?v=267",
    "./src/tyrant-hunt.js?v=267",
    "./src/world-beasts.js?v=267",
    "./src/elders.js?v=267",
    "./src/far-array.js?v=267",
    "./src/combat-visuals.js?v=267",
    "./src/dungeon-framework.js?v=267",
    "./src/elites.js?v=267",
    "./src/random.js?v=267",
    "./src/types.js?v=267",
    "./src/story.js?v=267",
    "./src/foundry.js?v=267",
    "./src/world.js?v=267",
    "./src/deep-dungeons.js?v=267",
    "./src/scenes.js?v=267",
    "./src/arenas.js?v=267",
    "./src/items.js?v=267",
    "./src/combat.js?v=267",
    "./src/interactions.js?v=267",
    "./src/persistence.js?v=267",
    "./src/input.js?v=267",
    "./src/game.js?v=267",
    "./src/renderer.js?v=267",
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
