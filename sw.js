const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v481`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=481",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=481",
    "./src/proving-ground.js?v=481",
    "./src/proving-ground-fixtures.js?v=481",
    "./src/proving-ground-labs.js?v=481",
    "./src/dungeon-variation.js?v=481",
    "./src/dungeon-completion.js?v=481",
    "./src/enemy-patterns.js?v=481",
    "./src/monster-pack.js?v=481",
    "./src/monster-render.js?v=481",
    "./src/astral-worm.js?v=481",
    "./src/astral-worm-render.js?v=481",
    "./src/astral-worm-retreat.js?v=481",
    "./src/astral-worm-mount.js?v=481",
    "./src/lightning-giant-render.js?v=481",
    "./src/astral-encounters.js?v=481",
    "./src/astral-world-retreat.js?v=481",
    "./src/landscape.js?v=481",
    "./src/landscape-render.js?v=481",
    "./src/underlands.js?v=481",
    "./src/pattern-dungeons.js?v=481",
    "./src/relay-network.js?v=481",
    "./src/glyphs.js?v=481",
    "./src/echoes.js?v=481",
    "./src/constellation.js?v=481",
    "./src/water-traversal.js?v=481",
    "./src/open-sea.js?v=481",
    "./src/boats.js?v=481",
    "./src/sea-creatures.js?v=481",
    "./src/diving.js?v=481",
    "./src/grottoes.js?v=481",
    "./src/spell-slots.js?v=481",
    "./src/settlements.js?v=481",
    "./src/skirmishes.js?v=481",
    "./src/travelers.js?v=481",
    "./src/diagnostic-probe.js?v=481",
    "./src/questing-beast.js?v=481",
    "./src/recitations.js?v=481",
    "./src/lore.js?v=481",
    "./src/glimpses.js?v=481",
    "./src/glimpse-render.js?v=481",
    "./src/glimpse-paint.js?v=481",
    "./src/glimpse-scenes.js?v=481",
    "./src/glimpse-horror.js?v=481",
    "./src/glimpse-legend.js?v=481",
    "./src/glimpse-hand.js?v=481",
    "./src/atlas-view.js?v=481",
    "./src/strange.js?v=481",
    "./src/linked-dungeons.js?v=481",
    "./src/digging.js?v=481",
    "./src/building.js?v=481",
    "./src/refuge-lands.js?v=481",
    "./src/revenant-horde.js?v=481",
    "./src/stages.js?v=481",
    "./src/watcher.js?v=481",
    "./src/vehicle-gates.js?v=481",
    "./src/dungeon-ladder.js?v=481",
    "./src/potions.js?v=481",
    "./src/transit-lattice.js?v=481",
    "./src/late-spells.js?v=481",
    "./src/listener-mirror.js?v=481",
    "./src/hometowns.js?v=481",
    "./src/listener-arena.js?v=481",
    "./src/listener-morph.js?v=481",
    "./src/build-presets.js?v=481",
    "./src/smithy.js?v=481",
    "./src/ilse.js?v=481",
    "./src/bells.js?v=481",
    "./src/meals.js?v=481",
    "./src/margins.js?v=481",
    "./src/marginalia.js?v=481",
    "./src/tyrant-hunt.js?v=481",
    "./src/world-beasts.js?v=481",
    "./src/elders.js?v=481",
    "./src/far-array.js?v=481",
    "./src/combat-visuals.js?v=481",
    "./src/dungeon-framework.js?v=481",
    "./src/elites.js?v=481",
    "./src/random.js?v=481",
    "./src/types.js?v=481",
    "./src/story.js?v=481",
    "./src/foundry.js?v=481",
    "./src/world.js?v=481",
    "./src/deep-dungeons.js?v=481",
    "./src/scenes.js?v=481",
    "./src/arenas.js?v=481",
    "./src/items.js?v=481",
    "./src/combat.js?v=481",
    "./src/interactions.js?v=481",
    "./src/persistence.js?v=481",
    "./src/input.js?v=481",
    "./src/game.js?v=481",
    "./src/renderer.js?v=481",
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
