const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r439-a6fb9615c252`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r439-a6fb9615c252",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r439-a6fb9615c252",
    "./src/proving-ground.js?v=r439-a6fb9615c252",
    "./src/proving-ground-fixtures.js?v=r439-a6fb9615c252",
    "./src/proving-ground-labs.js?v=r439-a6fb9615c252",
    "./src/dungeon-variation.js?v=r439-a6fb9615c252",
    "./src/dungeon-completion.js?v=r439-a6fb9615c252",
    "./src/enemy-patterns.js?v=r439-a6fb9615c252",
    "./src/monster-pack.js?v=r439-a6fb9615c252",
    "./src/monster-render.js?v=r439-a6fb9615c252",
    "./src/astral-worm.js?v=r439-a6fb9615c252",
    "./src/astral-worm-render.js?v=r439-a6fb9615c252",
    "./src/astral-worm-retreat.js?v=r439-a6fb9615c252",
    "./src/astral-worm-mount.js?v=r439-a6fb9615c252",
    "./src/lightning-giant-render.js?v=r439-a6fb9615c252",
    "./src/astral-encounters.js?v=r439-a6fb9615c252",
    "./src/astral-world-retreat.js?v=r439-a6fb9615c252",
    "./src/landscape.js?v=r439-a6fb9615c252",
    "./src/landscape-render.js?v=r439-a6fb9615c252",
    "./src/underlands.js?v=r439-a6fb9615c252",
    "./src/pattern-dungeons.js?v=r439-a6fb9615c252",
    "./src/relay-network.js?v=r439-a6fb9615c252",
    "./src/glyphs.js?v=r439-a6fb9615c252",
    "./src/echoes.js?v=r439-a6fb9615c252",
    "./src/constellation.js?v=r439-a6fb9615c252",
    "./src/water-traversal.js?v=r439-a6fb9615c252",
    "./src/open-sea.js?v=r439-a6fb9615c252",
    "./src/boats.js?v=r439-a6fb9615c252",
    "./src/sea-creatures.js?v=r439-a6fb9615c252",
    "./src/diving.js?v=r439-a6fb9615c252",
    "./src/grottoes.js?v=r439-a6fb9615c252",
    "./src/spell-slots.js?v=r439-a6fb9615c252",
    "./src/settlements.js?v=r439-a6fb9615c252",
    "./src/skirmishes.js?v=r439-a6fb9615c252",
    "./src/travelers.js?v=r439-a6fb9615c252",
    "./src/diagnostic-probe.js?v=r439-a6fb9615c252",
    "./src/questing-beast.js?v=r439-a6fb9615c252",
    "./src/recitations.js?v=r439-a6fb9615c252",
    "./src/lore.js?v=r439-a6fb9615c252",
    "./src/glimpses.js?v=r439-a6fb9615c252",
    "./src/glimpse-render.js?v=r439-a6fb9615c252",
    "./src/glimpse-paint.js?v=r439-a6fb9615c252",
    "./src/glimpse-scenes.js?v=r439-a6fb9615c252",
    "./src/glimpse-horror.js?v=r439-a6fb9615c252",
    "./src/glimpse-legend.js?v=r439-a6fb9615c252",
    "./src/glimpse-hand.js?v=r439-a6fb9615c252",
    "./src/atlas-view.js?v=r439-a6fb9615c252",
    "./src/strange.js?v=r439-a6fb9615c252",
    "./src/linked-dungeons.js?v=r439-a6fb9615c252",
    "./src/digging.js?v=r439-a6fb9615c252",
    "./src/building.js?v=r439-a6fb9615c252",
    "./src/refuge-lands.js?v=r439-a6fb9615c252",
    "./src/revenant-horde.js?v=r439-a6fb9615c252",
    "./src/stages.js?v=r439-a6fb9615c252",
    "./src/watcher.js?v=r439-a6fb9615c252",
    "./src/vehicle-gates.js?v=r439-a6fb9615c252",
    "./src/dungeon-ladder.js?v=r439-a6fb9615c252",
    "./src/potions.js?v=r439-a6fb9615c252",
    "./src/transit-lattice.js?v=r439-a6fb9615c252",
    "./src/late-spells.js?v=r439-a6fb9615c252",
    "./src/listener-mirror.js?v=r439-a6fb9615c252",
    "./src/hometowns.js?v=r439-a6fb9615c252",
    "./src/listener-arena.js?v=r439-a6fb9615c252",
    "./src/listener-morph.js?v=r439-a6fb9615c252",
    "./src/build-presets.js?v=r439-a6fb9615c252",
    "./src/smithy.js?v=r439-a6fb9615c252",
    "./src/ilse.js?v=r439-a6fb9615c252",
    "./src/bells.js?v=r439-a6fb9615c252",
    "./src/tyrant-hunt.js?v=r439-a6fb9615c252",
    "./src/world-beasts.js?v=r439-a6fb9615c252",
    "./src/elders.js?v=r439-a6fb9615c252",
    "./src/far-array.js?v=r439-a6fb9615c252",
    "./src/combat-visuals.js?v=r439-a6fb9615c252",
    "./src/dungeon-framework.js?v=r439-a6fb9615c252",
    "./src/elites.js?v=r439-a6fb9615c252",
    "./src/random.js?v=r439-a6fb9615c252",
    "./src/types.js?v=r439-a6fb9615c252",
    "./src/story.js?v=r439-a6fb9615c252",
    "./src/foundry.js?v=r439-a6fb9615c252",
    "./src/world.js?v=r439-a6fb9615c252",
    "./src/deep-dungeons.js?v=r439-a6fb9615c252",
    "./src/scenes.js?v=r439-a6fb9615c252",
    "./src/arenas.js?v=r439-a6fb9615c252",
    "./src/items.js?v=r439-a6fb9615c252",
    "./src/combat.js?v=r439-a6fb9615c252",
    "./src/interactions.js?v=r439-a6fb9615c252",
    "./src/persistence.js?v=r439-a6fb9615c252",
    "./src/input.js?v=r439-a6fb9615c252",
    "./src/game.js?v=r439-a6fb9615c252",
    "./src/renderer.js?v=r439-a6fb9615c252",
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
