const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v465`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=465",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=465",
    "./src/proving-ground.js?v=465",
    "./src/proving-ground-fixtures.js?v=465",
    "./src/proving-ground-labs.js?v=465",
    "./src/dungeon-variation.js?v=465",
    "./src/dungeon-completion.js?v=465",
    "./src/enemy-patterns.js?v=465",
    "./src/monster-pack.js?v=465",
    "./src/monster-render.js?v=465",
    "./src/astral-worm.js?v=465",
    "./src/astral-worm-render.js?v=465",
    "./src/astral-worm-retreat.js?v=465",
    "./src/astral-worm-mount.js?v=465",
    "./src/lightning-giant-render.js?v=465",
    "./src/astral-encounters.js?v=465",
    "./src/astral-world-retreat.js?v=465",
    "./src/landscape.js?v=465",
    "./src/landscape-render.js?v=465",
    "./src/underlands.js?v=465",
    "./src/pattern-dungeons.js?v=465",
    "./src/relay-network.js?v=465",
    "./src/glyphs.js?v=465",
    "./src/echoes.js?v=465",
    "./src/constellation.js?v=465",
    "./src/water-traversal.js?v=465",
    "./src/open-sea.js?v=465",
    "./src/boats.js?v=465",
    "./src/sea-creatures.js?v=465",
    "./src/diving.js?v=465",
    "./src/grottoes.js?v=465",
    "./src/spell-slots.js?v=465",
    "./src/settlements.js?v=465",
    "./src/skirmishes.js?v=465",
    "./src/travelers.js?v=465",
    "./src/diagnostic-probe.js?v=465",
    "./src/questing-beast.js?v=465",
    "./src/recitations.js?v=465",
    "./src/lore.js?v=465",
    "./src/glimpses.js?v=465",
    "./src/glimpse-render.js?v=465",
    "./src/glimpse-paint.js?v=465",
    "./src/glimpse-scenes.js?v=465",
    "./src/glimpse-horror.js?v=465",
    "./src/glimpse-legend.js?v=465",
    "./src/glimpse-hand.js?v=465",
    "./src/atlas-view.js?v=465",
    "./src/strange.js?v=465",
    "./src/linked-dungeons.js?v=465",
    "./src/digging.js?v=465",
    "./src/building.js?v=465",
    "./src/refuge-lands.js?v=465",
    "./src/revenant-horde.js?v=465",
    "./src/stages.js?v=465",
    "./src/watcher.js?v=465",
    "./src/vehicle-gates.js?v=465",
    "./src/dungeon-ladder.js?v=465",
    "./src/potions.js?v=465",
    "./src/transit-lattice.js?v=465",
    "./src/late-spells.js?v=465",
    "./src/listener-mirror.js?v=465",
    "./src/hometowns.js?v=465",
    "./src/listener-arena.js?v=465",
    "./src/listener-morph.js?v=465",
    "./src/build-presets.js?v=465",
    "./src/smithy.js?v=465",
    "./src/ilse.js?v=465",
    "./src/bells.js?v=465",
    "./src/meals.js?v=465",
    "./src/margins.js?v=465",
    "./src/marginalia.js?v=465",
    "./src/tyrant-hunt.js?v=465",
    "./src/world-beasts.js?v=465",
    "./src/elders.js?v=465",
    "./src/far-array.js?v=465",
    "./src/combat-visuals.js?v=465",
    "./src/dungeon-framework.js?v=465",
    "./src/elites.js?v=465",
    "./src/random.js?v=465",
    "./src/types.js?v=465",
    "./src/story.js?v=465",
    "./src/foundry.js?v=465",
    "./src/world.js?v=465",
    "./src/deep-dungeons.js?v=465",
    "./src/scenes.js?v=465",
    "./src/arenas.js?v=465",
    "./src/items.js?v=465",
    "./src/combat.js?v=465",
    "./src/interactions.js?v=465",
    "./src/persistence.js?v=465",
    "./src/input.js?v=465",
    "./src/game.js?v=465",
    "./src/renderer.js?v=465",
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
