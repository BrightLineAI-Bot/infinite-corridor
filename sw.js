const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v455`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=455",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=455",
    "./src/proving-ground.js?v=455",
    "./src/proving-ground-fixtures.js?v=455",
    "./src/proving-ground-labs.js?v=455",
    "./src/dungeon-variation.js?v=455",
    "./src/dungeon-completion.js?v=455",
    "./src/enemy-patterns.js?v=455",
    "./src/monster-pack.js?v=455",
    "./src/monster-render.js?v=455",
    "./src/astral-worm.js?v=455",
    "./src/astral-worm-render.js?v=455",
    "./src/astral-worm-retreat.js?v=455",
    "./src/astral-worm-mount.js?v=455",
    "./src/lightning-giant-render.js?v=455",
    "./src/astral-encounters.js?v=455",
    "./src/astral-world-retreat.js?v=455",
    "./src/landscape.js?v=455",
    "./src/landscape-render.js?v=455",
    "./src/underlands.js?v=455",
    "./src/pattern-dungeons.js?v=455",
    "./src/relay-network.js?v=455",
    "./src/glyphs.js?v=455",
    "./src/echoes.js?v=455",
    "./src/constellation.js?v=455",
    "./src/water-traversal.js?v=455",
    "./src/open-sea.js?v=455",
    "./src/boats.js?v=455",
    "./src/sea-creatures.js?v=455",
    "./src/diving.js?v=455",
    "./src/grottoes.js?v=455",
    "./src/spell-slots.js?v=455",
    "./src/settlements.js?v=455",
    "./src/skirmishes.js?v=455",
    "./src/travelers.js?v=455",
    "./src/diagnostic-probe.js?v=455",
    "./src/questing-beast.js?v=455",
    "./src/recitations.js?v=455",
    "./src/lore.js?v=455",
    "./src/glimpses.js?v=455",
    "./src/glimpse-render.js?v=455",
    "./src/glimpse-paint.js?v=455",
    "./src/glimpse-scenes.js?v=455",
    "./src/glimpse-horror.js?v=455",
    "./src/glimpse-legend.js?v=455",
    "./src/glimpse-hand.js?v=455",
    "./src/atlas-view.js?v=455",
    "./src/strange.js?v=455",
    "./src/linked-dungeons.js?v=455",
    "./src/digging.js?v=455",
    "./src/building.js?v=455",
    "./src/refuge-lands.js?v=455",
    "./src/revenant-horde.js?v=455",
    "./src/stages.js?v=455",
    "./src/watcher.js?v=455",
    "./src/vehicle-gates.js?v=455",
    "./src/dungeon-ladder.js?v=455",
    "./src/potions.js?v=455",
    "./src/transit-lattice.js?v=455",
    "./src/late-spells.js?v=455",
    "./src/listener-mirror.js?v=455",
    "./src/hometowns.js?v=455",
    "./src/listener-arena.js?v=455",
    "./src/listener-morph.js?v=455",
    "./src/build-presets.js?v=455",
    "./src/smithy.js?v=455",
    "./src/ilse.js?v=455",
    "./src/bells.js?v=455",
    "./src/meals.js?v=455",
    "./src/margins.js?v=455",
    "./src/tyrant-hunt.js?v=455",
    "./src/world-beasts.js?v=455",
    "./src/elders.js?v=455",
    "./src/far-array.js?v=455",
    "./src/combat-visuals.js?v=455",
    "./src/dungeon-framework.js?v=455",
    "./src/elites.js?v=455",
    "./src/random.js?v=455",
    "./src/types.js?v=455",
    "./src/story.js?v=455",
    "./src/foundry.js?v=455",
    "./src/world.js?v=455",
    "./src/deep-dungeons.js?v=455",
    "./src/scenes.js?v=455",
    "./src/arenas.js?v=455",
    "./src/items.js?v=455",
    "./src/combat.js?v=455",
    "./src/interactions.js?v=455",
    "./src/persistence.js?v=455",
    "./src/input.js?v=455",
    "./src/game.js?v=455",
    "./src/renderer.js?v=455",
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
