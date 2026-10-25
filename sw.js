const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v431`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=431",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=431",
    "./src/proving-ground.js?v=431",
    "./src/proving-ground-fixtures.js?v=431",
    "./src/proving-ground-labs.js?v=431",
    "./src/dungeon-variation.js?v=431",
    "./src/dungeon-completion.js?v=431",
    "./src/enemy-patterns.js?v=431",
    "./src/monster-pack.js?v=431",
    "./src/monster-render.js?v=431",
    "./src/astral-worm.js?v=431",
    "./src/astral-worm-render.js?v=431",
    "./src/astral-worm-retreat.js?v=431",
    "./src/astral-worm-mount.js?v=431",
    "./src/lightning-giant-render.js?v=431",
    "./src/astral-encounters.js?v=431",
    "./src/astral-world-retreat.js?v=431",
    "./src/landscape.js?v=431",
    "./src/landscape-render.js?v=431",
    "./src/underlands.js?v=431",
    "./src/pattern-dungeons.js?v=431",
    "./src/relay-network.js?v=431",
    "./src/glyphs.js?v=431",
    "./src/echoes.js?v=431",
    "./src/constellation.js?v=431",
    "./src/water-traversal.js?v=431",
    "./src/open-sea.js?v=431",
    "./src/boats.js?v=431",
    "./src/sea-creatures.js?v=431",
    "./src/diving.js?v=431",
    "./src/grottoes.js?v=431",
    "./src/spell-slots.js?v=431",
    "./src/settlements.js?v=431",
    "./src/skirmishes.js?v=431",
    "./src/travelers.js?v=431",
    "./src/diagnostic-probe.js?v=431",
    "./src/questing-beast.js?v=431",
    "./src/recitations.js?v=431",
    "./src/lore.js?v=431",
    "./src/glimpses.js?v=431",
    "./src/glimpse-render.js?v=431",
    "./src/glimpse-paint.js?v=431",
    "./src/glimpse-scenes.js?v=431",
    "./src/glimpse-horror.js?v=431",
    "./src/glimpse-legend.js?v=431",
    "./src/glimpse-hand.js?v=431",
    "./src/atlas-view.js?v=431",
    "./src/strange.js?v=431",
    "./src/linked-dungeons.js?v=431",
    "./src/digging.js?v=431",
    "./src/building.js?v=431",
    "./src/refuge-lands.js?v=431",
    "./src/revenant-horde.js?v=431",
    "./src/stages.js?v=431",
    "./src/watcher.js?v=431",
    "./src/vehicle-gates.js?v=431",
    "./src/dungeon-ladder.js?v=431",
    "./src/potions.js?v=431",
    "./src/transit-lattice.js?v=431",
    "./src/late-spells.js?v=431",
    "./src/listener-mirror.js?v=431",
    "./src/hometowns.js?v=431",
    "./src/listener-arena.js?v=431",
    "./src/listener-morph.js?v=431",
    "./src/build-presets.js?v=431",
    "./src/smithy.js?v=431",
    "./src/ilse.js?v=431",
    "./src/bells.js?v=431",
    "./src/tyrant-hunt.js?v=431",
    "./src/world-beasts.js?v=431",
    "./src/elders.js?v=431",
    "./src/far-array.js?v=431",
    "./src/combat-visuals.js?v=431",
    "./src/dungeon-framework.js?v=431",
    "./src/elites.js?v=431",
    "./src/random.js?v=431",
    "./src/types.js?v=431",
    "./src/story.js?v=431",
    "./src/foundry.js?v=431",
    "./src/world.js?v=431",
    "./src/deep-dungeons.js?v=431",
    "./src/scenes.js?v=431",
    "./src/arenas.js?v=431",
    "./src/items.js?v=431",
    "./src/combat.js?v=431",
    "./src/interactions.js?v=431",
    "./src/persistence.js?v=431",
    "./src/input.js?v=431",
    "./src/game.js?v=431",
    "./src/renderer.js?v=431",
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
