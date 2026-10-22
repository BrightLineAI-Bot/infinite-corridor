const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r325-7b4e702923fb`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r325-7b4e702923fb",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r325-7b4e702923fb",
    "./src/proving-ground.js?v=r325-7b4e702923fb",
    "./src/proving-ground-fixtures.js?v=r325-7b4e702923fb",
    "./src/proving-ground-labs.js?v=r325-7b4e702923fb",
    "./src/dungeon-variation.js?v=r325-7b4e702923fb",
    "./src/dungeon-completion.js?v=r325-7b4e702923fb",
    "./src/enemy-patterns.js?v=r325-7b4e702923fb",
    "./src/monster-pack.js?v=r325-7b4e702923fb",
    "./src/monster-render.js?v=r325-7b4e702923fb",
    "./src/astral-worm.js?v=r325-7b4e702923fb",
    "./src/astral-worm-render.js?v=r325-7b4e702923fb",
    "./src/astral-worm-retreat.js?v=r325-7b4e702923fb",
    "./src/astral-worm-mount.js?v=r325-7b4e702923fb",
    "./src/lightning-giant-render.js?v=r325-7b4e702923fb",
    "./src/astral-encounters.js?v=r325-7b4e702923fb",
    "./src/astral-world-retreat.js?v=r325-7b4e702923fb",
    "./src/landscape.js?v=r325-7b4e702923fb",
    "./src/landscape-render.js?v=r325-7b4e702923fb",
    "./src/underlands.js?v=r325-7b4e702923fb",
    "./src/pattern-dungeons.js?v=r325-7b4e702923fb",
    "./src/relay-network.js?v=r325-7b4e702923fb",
    "./src/glyphs.js?v=r325-7b4e702923fb",
    "./src/echoes.js?v=r325-7b4e702923fb",
    "./src/constellation.js?v=r325-7b4e702923fb",
    "./src/water-traversal.js?v=r325-7b4e702923fb",
    "./src/open-sea.js?v=r325-7b4e702923fb",
    "./src/boats.js?v=r325-7b4e702923fb",
    "./src/sea-creatures.js?v=r325-7b4e702923fb",
    "./src/diving.js?v=r325-7b4e702923fb",
    "./src/grottoes.js?v=r325-7b4e702923fb",
    "./src/spell-slots.js?v=r325-7b4e702923fb",
    "./src/settlements.js?v=r325-7b4e702923fb",
    "./src/skirmishes.js?v=r325-7b4e702923fb",
    "./src/travelers.js?v=r325-7b4e702923fb",
    "./src/diagnostic-probe.js?v=r325-7b4e702923fb",
    "./src/questing-beast.js?v=r325-7b4e702923fb",
    "./src/recitations.js?v=r325-7b4e702923fb",
    "./src/lore.js?v=r325-7b4e702923fb",
    "./src/glimpses.js?v=r325-7b4e702923fb",
    "./src/glimpse-render.js?v=r325-7b4e702923fb",
    "./src/glimpse-paint.js?v=r325-7b4e702923fb",
    "./src/glimpse-scenes.js?v=r325-7b4e702923fb",
    "./src/glimpse-horror.js?v=r325-7b4e702923fb",
    "./src/glimpse-legend.js?v=r325-7b4e702923fb",
    "./src/glimpse-hand.js?v=r325-7b4e702923fb",
    "./src/atlas-view.js?v=r325-7b4e702923fb",
    "./src/strange.js?v=r325-7b4e702923fb",
    "./src/linked-dungeons.js?v=r325-7b4e702923fb",
    "./src/digging.js?v=r325-7b4e702923fb",
    "./src/building.js?v=r325-7b4e702923fb",
    "./src/refuge-lands.js?v=r325-7b4e702923fb",
    "./src/revenant-horde.js?v=r325-7b4e702923fb",
    "./src/stages.js?v=r325-7b4e702923fb",
    "./src/watcher.js?v=r325-7b4e702923fb",
    "./src/vehicle-gates.js?v=r325-7b4e702923fb",
    "./src/dungeon-ladder.js?v=r325-7b4e702923fb",
    "./src/tyrant-hunt.js?v=r325-7b4e702923fb",
    "./src/world-beasts.js?v=r325-7b4e702923fb",
    "./src/elders.js?v=r325-7b4e702923fb",
    "./src/far-array.js?v=r325-7b4e702923fb",
    "./src/combat-visuals.js?v=r325-7b4e702923fb",
    "./src/dungeon-framework.js?v=r325-7b4e702923fb",
    "./src/elites.js?v=r325-7b4e702923fb",
    "./src/random.js?v=r325-7b4e702923fb",
    "./src/types.js?v=r325-7b4e702923fb",
    "./src/story.js?v=r325-7b4e702923fb",
    "./src/foundry.js?v=r325-7b4e702923fb",
    "./src/world.js?v=r325-7b4e702923fb",
    "./src/deep-dungeons.js?v=r325-7b4e702923fb",
    "./src/scenes.js?v=r325-7b4e702923fb",
    "./src/arenas.js?v=r325-7b4e702923fb",
    "./src/items.js?v=r325-7b4e702923fb",
    "./src/combat.js?v=r325-7b4e702923fb",
    "./src/interactions.js?v=r325-7b4e702923fb",
    "./src/persistence.js?v=r325-7b4e702923fb",
    "./src/input.js?v=r325-7b4e702923fb",
    "./src/game.js?v=r325-7b4e702923fb",
    "./src/renderer.js?v=r325-7b4e702923fb",
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
