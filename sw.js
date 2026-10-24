const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v391`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=391",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=391",
    "./src/proving-ground.js?v=391",
    "./src/proving-ground-fixtures.js?v=391",
    "./src/proving-ground-labs.js?v=391",
    "./src/dungeon-variation.js?v=391",
    "./src/dungeon-completion.js?v=391",
    "./src/enemy-patterns.js?v=391",
    "./src/monster-pack.js?v=391",
    "./src/monster-render.js?v=391",
    "./src/astral-worm.js?v=391",
    "./src/astral-worm-render.js?v=391",
    "./src/astral-worm-retreat.js?v=391",
    "./src/astral-worm-mount.js?v=391",
    "./src/lightning-giant-render.js?v=391",
    "./src/astral-encounters.js?v=391",
    "./src/astral-world-retreat.js?v=391",
    "./src/landscape.js?v=391",
    "./src/landscape-render.js?v=391",
    "./src/underlands.js?v=391",
    "./src/pattern-dungeons.js?v=391",
    "./src/relay-network.js?v=391",
    "./src/glyphs.js?v=391",
    "./src/echoes.js?v=391",
    "./src/constellation.js?v=391",
    "./src/water-traversal.js?v=391",
    "./src/open-sea.js?v=391",
    "./src/boats.js?v=391",
    "./src/sea-creatures.js?v=391",
    "./src/diving.js?v=391",
    "./src/grottoes.js?v=391",
    "./src/spell-slots.js?v=391",
    "./src/settlements.js?v=391",
    "./src/skirmishes.js?v=391",
    "./src/travelers.js?v=391",
    "./src/diagnostic-probe.js?v=391",
    "./src/questing-beast.js?v=391",
    "./src/recitations.js?v=391",
    "./src/lore.js?v=391",
    "./src/glimpses.js?v=391",
    "./src/glimpse-render.js?v=391",
    "./src/glimpse-paint.js?v=391",
    "./src/glimpse-scenes.js?v=391",
    "./src/glimpse-horror.js?v=391",
    "./src/glimpse-legend.js?v=391",
    "./src/glimpse-hand.js?v=391",
    "./src/atlas-view.js?v=391",
    "./src/strange.js?v=391",
    "./src/linked-dungeons.js?v=391",
    "./src/digging.js?v=391",
    "./src/building.js?v=391",
    "./src/refuge-lands.js?v=391",
    "./src/revenant-horde.js?v=391",
    "./src/stages.js?v=391",
    "./src/watcher.js?v=391",
    "./src/vehicle-gates.js?v=391",
    "./src/dungeon-ladder.js?v=391",
    "./src/potions.js?v=391",
    "./src/transit-lattice.js?v=391",
    "./src/late-spells.js?v=391",
    "./src/listener-mirror.js?v=391",
    "./src/hometowns.js?v=391",
    "./src/listener-arena.js?v=391",
    "./src/listener-morph.js?v=391",
    "./src/tyrant-hunt.js?v=391",
    "./src/world-beasts.js?v=391",
    "./src/elders.js?v=391",
    "./src/far-array.js?v=391",
    "./src/combat-visuals.js?v=391",
    "./src/dungeon-framework.js?v=391",
    "./src/elites.js?v=391",
    "./src/random.js?v=391",
    "./src/types.js?v=391",
    "./src/story.js?v=391",
    "./src/foundry.js?v=391",
    "./src/world.js?v=391",
    "./src/deep-dungeons.js?v=391",
    "./src/scenes.js?v=391",
    "./src/arenas.js?v=391",
    "./src/items.js?v=391",
    "./src/combat.js?v=391",
    "./src/interactions.js?v=391",
    "./src/persistence.js?v=391",
    "./src/input.js?v=391",
    "./src/game.js?v=391",
    "./src/renderer.js?v=391",
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
