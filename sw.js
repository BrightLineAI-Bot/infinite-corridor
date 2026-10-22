const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v317`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=317",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=317",
    "./src/proving-ground.js?v=317",
    "./src/proving-ground-fixtures.js?v=317",
    "./src/proving-ground-labs.js?v=317",
    "./src/dungeon-variation.js?v=317",
    "./src/dungeon-completion.js?v=317",
    "./src/enemy-patterns.js?v=317",
    "./src/monster-pack.js?v=317",
    "./src/monster-render.js?v=317",
    "./src/astral-worm.js?v=317",
    "./src/astral-worm-render.js?v=317",
    "./src/astral-worm-retreat.js?v=317",
    "./src/astral-worm-mount.js?v=317",
    "./src/lightning-giant-render.js?v=317",
    "./src/astral-encounters.js?v=317",
    "./src/astral-world-retreat.js?v=317",
    "./src/landscape.js?v=317",
    "./src/landscape-render.js?v=317",
    "./src/underlands.js?v=317",
    "./src/pattern-dungeons.js?v=317",
    "./src/relay-network.js?v=317",
    "./src/glyphs.js?v=317",
    "./src/echoes.js?v=317",
    "./src/constellation.js?v=317",
    "./src/water-traversal.js?v=317",
    "./src/open-sea.js?v=317",
    "./src/boats.js?v=317",
    "./src/sea-creatures.js?v=317",
    "./src/diving.js?v=317",
    "./src/grottoes.js?v=317",
    "./src/spell-slots.js?v=317",
    "./src/settlements.js?v=317",
    "./src/skirmishes.js?v=317",
    "./src/travelers.js?v=317",
    "./src/diagnostic-probe.js?v=317",
    "./src/questing-beast.js?v=317",
    "./src/recitations.js?v=317",
    "./src/lore.js?v=317",
    "./src/glimpses.js?v=317",
    "./src/glimpse-render.js?v=317",
    "./src/glimpse-paint.js?v=317",
    "./src/glimpse-scenes.js?v=317",
    "./src/glimpse-horror.js?v=317",
    "./src/glimpse-legend.js?v=317",
    "./src/glimpse-hand.js?v=317",
    "./src/atlas-view.js?v=317",
    "./src/strange.js?v=317",
    "./src/linked-dungeons.js?v=317",
    "./src/digging.js?v=317",
    "./src/building.js?v=317",
    "./src/refuge-lands.js?v=317",
    "./src/revenant-horde.js?v=317",
    "./src/stages.js?v=317",
    "./src/watcher.js?v=317",
    "./src/vehicle-gates.js?v=317",
    "./src/tyrant-hunt.js?v=317",
    "./src/world-beasts.js?v=317",
    "./src/elders.js?v=317",
    "./src/far-array.js?v=317",
    "./src/combat-visuals.js?v=317",
    "./src/dungeon-framework.js?v=317",
    "./src/elites.js?v=317",
    "./src/random.js?v=317",
    "./src/types.js?v=317",
    "./src/story.js?v=317",
    "./src/foundry.js?v=317",
    "./src/world.js?v=317",
    "./src/deep-dungeons.js?v=317",
    "./src/scenes.js?v=317",
    "./src/arenas.js?v=317",
    "./src/items.js?v=317",
    "./src/combat.js?v=317",
    "./src/interactions.js?v=317",
    "./src/persistence.js?v=317",
    "./src/input.js?v=317",
    "./src/game.js?v=317",
    "./src/renderer.js?v=317",
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
