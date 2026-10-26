const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v447`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=447",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=447",
    "./src/proving-ground.js?v=447",
    "./src/proving-ground-fixtures.js?v=447",
    "./src/proving-ground-labs.js?v=447",
    "./src/dungeon-variation.js?v=447",
    "./src/dungeon-completion.js?v=447",
    "./src/enemy-patterns.js?v=447",
    "./src/monster-pack.js?v=447",
    "./src/monster-render.js?v=447",
    "./src/astral-worm.js?v=447",
    "./src/astral-worm-render.js?v=447",
    "./src/astral-worm-retreat.js?v=447",
    "./src/astral-worm-mount.js?v=447",
    "./src/lightning-giant-render.js?v=447",
    "./src/astral-encounters.js?v=447",
    "./src/astral-world-retreat.js?v=447",
    "./src/landscape.js?v=447",
    "./src/landscape-render.js?v=447",
    "./src/underlands.js?v=447",
    "./src/pattern-dungeons.js?v=447",
    "./src/relay-network.js?v=447",
    "./src/glyphs.js?v=447",
    "./src/echoes.js?v=447",
    "./src/constellation.js?v=447",
    "./src/water-traversal.js?v=447",
    "./src/open-sea.js?v=447",
    "./src/boats.js?v=447",
    "./src/sea-creatures.js?v=447",
    "./src/diving.js?v=447",
    "./src/grottoes.js?v=447",
    "./src/spell-slots.js?v=447",
    "./src/settlements.js?v=447",
    "./src/skirmishes.js?v=447",
    "./src/travelers.js?v=447",
    "./src/diagnostic-probe.js?v=447",
    "./src/questing-beast.js?v=447",
    "./src/recitations.js?v=447",
    "./src/lore.js?v=447",
    "./src/glimpses.js?v=447",
    "./src/glimpse-render.js?v=447",
    "./src/glimpse-paint.js?v=447",
    "./src/glimpse-scenes.js?v=447",
    "./src/glimpse-horror.js?v=447",
    "./src/glimpse-legend.js?v=447",
    "./src/glimpse-hand.js?v=447",
    "./src/atlas-view.js?v=447",
    "./src/strange.js?v=447",
    "./src/linked-dungeons.js?v=447",
    "./src/digging.js?v=447",
    "./src/building.js?v=447",
    "./src/refuge-lands.js?v=447",
    "./src/revenant-horde.js?v=447",
    "./src/stages.js?v=447",
    "./src/watcher.js?v=447",
    "./src/vehicle-gates.js?v=447",
    "./src/dungeon-ladder.js?v=447",
    "./src/potions.js?v=447",
    "./src/transit-lattice.js?v=447",
    "./src/late-spells.js?v=447",
    "./src/listener-mirror.js?v=447",
    "./src/hometowns.js?v=447",
    "./src/listener-arena.js?v=447",
    "./src/listener-morph.js?v=447",
    "./src/build-presets.js?v=447",
    "./src/smithy.js?v=447",
    "./src/ilse.js?v=447",
    "./src/bells.js?v=447",
    "./src/meals.js?v=447",
    "./src/tyrant-hunt.js?v=447",
    "./src/world-beasts.js?v=447",
    "./src/elders.js?v=447",
    "./src/far-array.js?v=447",
    "./src/combat-visuals.js?v=447",
    "./src/dungeon-framework.js?v=447",
    "./src/elites.js?v=447",
    "./src/random.js?v=447",
    "./src/types.js?v=447",
    "./src/story.js?v=447",
    "./src/foundry.js?v=447",
    "./src/world.js?v=447",
    "./src/deep-dungeons.js?v=447",
    "./src/scenes.js?v=447",
    "./src/arenas.js?v=447",
    "./src/items.js?v=447",
    "./src/combat.js?v=447",
    "./src/interactions.js?v=447",
    "./src/persistence.js?v=447",
    "./src/input.js?v=447",
    "./src/game.js?v=447",
    "./src/renderer.js?v=447",
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
