const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v441`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=441",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=441",
    "./src/proving-ground.js?v=441",
    "./src/proving-ground-fixtures.js?v=441",
    "./src/proving-ground-labs.js?v=441",
    "./src/dungeon-variation.js?v=441",
    "./src/dungeon-completion.js?v=441",
    "./src/enemy-patterns.js?v=441",
    "./src/monster-pack.js?v=441",
    "./src/monster-render.js?v=441",
    "./src/astral-worm.js?v=441",
    "./src/astral-worm-render.js?v=441",
    "./src/astral-worm-retreat.js?v=441",
    "./src/astral-worm-mount.js?v=441",
    "./src/lightning-giant-render.js?v=441",
    "./src/astral-encounters.js?v=441",
    "./src/astral-world-retreat.js?v=441",
    "./src/landscape.js?v=441",
    "./src/landscape-render.js?v=441",
    "./src/underlands.js?v=441",
    "./src/pattern-dungeons.js?v=441",
    "./src/relay-network.js?v=441",
    "./src/glyphs.js?v=441",
    "./src/echoes.js?v=441",
    "./src/constellation.js?v=441",
    "./src/water-traversal.js?v=441",
    "./src/open-sea.js?v=441",
    "./src/boats.js?v=441",
    "./src/sea-creatures.js?v=441",
    "./src/diving.js?v=441",
    "./src/grottoes.js?v=441",
    "./src/spell-slots.js?v=441",
    "./src/settlements.js?v=441",
    "./src/skirmishes.js?v=441",
    "./src/travelers.js?v=441",
    "./src/diagnostic-probe.js?v=441",
    "./src/questing-beast.js?v=441",
    "./src/recitations.js?v=441",
    "./src/lore.js?v=441",
    "./src/glimpses.js?v=441",
    "./src/glimpse-render.js?v=441",
    "./src/glimpse-paint.js?v=441",
    "./src/glimpse-scenes.js?v=441",
    "./src/glimpse-horror.js?v=441",
    "./src/glimpse-legend.js?v=441",
    "./src/glimpse-hand.js?v=441",
    "./src/atlas-view.js?v=441",
    "./src/strange.js?v=441",
    "./src/linked-dungeons.js?v=441",
    "./src/digging.js?v=441",
    "./src/building.js?v=441",
    "./src/refuge-lands.js?v=441",
    "./src/revenant-horde.js?v=441",
    "./src/stages.js?v=441",
    "./src/watcher.js?v=441",
    "./src/vehicle-gates.js?v=441",
    "./src/dungeon-ladder.js?v=441",
    "./src/potions.js?v=441",
    "./src/transit-lattice.js?v=441",
    "./src/late-spells.js?v=441",
    "./src/listener-mirror.js?v=441",
    "./src/hometowns.js?v=441",
    "./src/listener-arena.js?v=441",
    "./src/listener-morph.js?v=441",
    "./src/build-presets.js?v=441",
    "./src/smithy.js?v=441",
    "./src/ilse.js?v=441",
    "./src/bells.js?v=441",
    "./src/tyrant-hunt.js?v=441",
    "./src/world-beasts.js?v=441",
    "./src/elders.js?v=441",
    "./src/far-array.js?v=441",
    "./src/combat-visuals.js?v=441",
    "./src/dungeon-framework.js?v=441",
    "./src/elites.js?v=441",
    "./src/random.js?v=441",
    "./src/types.js?v=441",
    "./src/story.js?v=441",
    "./src/foundry.js?v=441",
    "./src/world.js?v=441",
    "./src/deep-dungeons.js?v=441",
    "./src/scenes.js?v=441",
    "./src/arenas.js?v=441",
    "./src/items.js?v=441",
    "./src/combat.js?v=441",
    "./src/interactions.js?v=441",
    "./src/persistence.js?v=441",
    "./src/input.js?v=441",
    "./src/game.js?v=441",
    "./src/renderer.js?v=441",
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
