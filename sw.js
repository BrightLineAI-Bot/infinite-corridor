const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v381`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=381",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=381",
    "./src/proving-ground.js?v=381",
    "./src/proving-ground-fixtures.js?v=381",
    "./src/proving-ground-labs.js?v=381",
    "./src/dungeon-variation.js?v=381",
    "./src/dungeon-completion.js?v=381",
    "./src/enemy-patterns.js?v=381",
    "./src/monster-pack.js?v=381",
    "./src/monster-render.js?v=381",
    "./src/astral-worm.js?v=381",
    "./src/astral-worm-render.js?v=381",
    "./src/astral-worm-retreat.js?v=381",
    "./src/astral-worm-mount.js?v=381",
    "./src/lightning-giant-render.js?v=381",
    "./src/astral-encounters.js?v=381",
    "./src/astral-world-retreat.js?v=381",
    "./src/landscape.js?v=381",
    "./src/landscape-render.js?v=381",
    "./src/underlands.js?v=381",
    "./src/pattern-dungeons.js?v=381",
    "./src/relay-network.js?v=381",
    "./src/glyphs.js?v=381",
    "./src/echoes.js?v=381",
    "./src/constellation.js?v=381",
    "./src/water-traversal.js?v=381",
    "./src/open-sea.js?v=381",
    "./src/boats.js?v=381",
    "./src/sea-creatures.js?v=381",
    "./src/diving.js?v=381",
    "./src/grottoes.js?v=381",
    "./src/spell-slots.js?v=381",
    "./src/settlements.js?v=381",
    "./src/skirmishes.js?v=381",
    "./src/travelers.js?v=381",
    "./src/diagnostic-probe.js?v=381",
    "./src/questing-beast.js?v=381",
    "./src/recitations.js?v=381",
    "./src/lore.js?v=381",
    "./src/glimpses.js?v=381",
    "./src/glimpse-render.js?v=381",
    "./src/glimpse-paint.js?v=381",
    "./src/glimpse-scenes.js?v=381",
    "./src/glimpse-horror.js?v=381",
    "./src/glimpse-legend.js?v=381",
    "./src/glimpse-hand.js?v=381",
    "./src/atlas-view.js?v=381",
    "./src/strange.js?v=381",
    "./src/linked-dungeons.js?v=381",
    "./src/digging.js?v=381",
    "./src/building.js?v=381",
    "./src/refuge-lands.js?v=381",
    "./src/revenant-horde.js?v=381",
    "./src/stages.js?v=381",
    "./src/watcher.js?v=381",
    "./src/vehicle-gates.js?v=381",
    "./src/dungeon-ladder.js?v=381",
    "./src/potions.js?v=381",
    "./src/transit-lattice.js?v=381",
    "./src/late-spells.js?v=381",
    "./src/listener-mirror.js?v=381",
    "./src/hometowns.js?v=381",
    "./src/listener-arena.js?v=381",
    "./src/tyrant-hunt.js?v=381",
    "./src/world-beasts.js?v=381",
    "./src/elders.js?v=381",
    "./src/far-array.js?v=381",
    "./src/combat-visuals.js?v=381",
    "./src/dungeon-framework.js?v=381",
    "./src/elites.js?v=381",
    "./src/random.js?v=381",
    "./src/types.js?v=381",
    "./src/story.js?v=381",
    "./src/foundry.js?v=381",
    "./src/world.js?v=381",
    "./src/deep-dungeons.js?v=381",
    "./src/scenes.js?v=381",
    "./src/arenas.js?v=381",
    "./src/items.js?v=381",
    "./src/combat.js?v=381",
    "./src/interactions.js?v=381",
    "./src/persistence.js?v=381",
    "./src/input.js?v=381",
    "./src/game.js?v=381",
    "./src/renderer.js?v=381",
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
