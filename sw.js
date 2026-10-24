const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v417`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=417",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=417",
    "./src/proving-ground.js?v=417",
    "./src/proving-ground-fixtures.js?v=417",
    "./src/proving-ground-labs.js?v=417",
    "./src/dungeon-variation.js?v=417",
    "./src/dungeon-completion.js?v=417",
    "./src/enemy-patterns.js?v=417",
    "./src/monster-pack.js?v=417",
    "./src/monster-render.js?v=417",
    "./src/astral-worm.js?v=417",
    "./src/astral-worm-render.js?v=417",
    "./src/astral-worm-retreat.js?v=417",
    "./src/astral-worm-mount.js?v=417",
    "./src/lightning-giant-render.js?v=417",
    "./src/astral-encounters.js?v=417",
    "./src/astral-world-retreat.js?v=417",
    "./src/landscape.js?v=417",
    "./src/landscape-render.js?v=417",
    "./src/underlands.js?v=417",
    "./src/pattern-dungeons.js?v=417",
    "./src/relay-network.js?v=417",
    "./src/glyphs.js?v=417",
    "./src/echoes.js?v=417",
    "./src/constellation.js?v=417",
    "./src/water-traversal.js?v=417",
    "./src/open-sea.js?v=417",
    "./src/boats.js?v=417",
    "./src/sea-creatures.js?v=417",
    "./src/diving.js?v=417",
    "./src/grottoes.js?v=417",
    "./src/spell-slots.js?v=417",
    "./src/settlements.js?v=417",
    "./src/skirmishes.js?v=417",
    "./src/travelers.js?v=417",
    "./src/diagnostic-probe.js?v=417",
    "./src/questing-beast.js?v=417",
    "./src/recitations.js?v=417",
    "./src/lore.js?v=417",
    "./src/glimpses.js?v=417",
    "./src/glimpse-render.js?v=417",
    "./src/glimpse-paint.js?v=417",
    "./src/glimpse-scenes.js?v=417",
    "./src/glimpse-horror.js?v=417",
    "./src/glimpse-legend.js?v=417",
    "./src/glimpse-hand.js?v=417",
    "./src/atlas-view.js?v=417",
    "./src/strange.js?v=417",
    "./src/linked-dungeons.js?v=417",
    "./src/digging.js?v=417",
    "./src/building.js?v=417",
    "./src/refuge-lands.js?v=417",
    "./src/revenant-horde.js?v=417",
    "./src/stages.js?v=417",
    "./src/watcher.js?v=417",
    "./src/vehicle-gates.js?v=417",
    "./src/dungeon-ladder.js?v=417",
    "./src/potions.js?v=417",
    "./src/transit-lattice.js?v=417",
    "./src/late-spells.js?v=417",
    "./src/listener-mirror.js?v=417",
    "./src/hometowns.js?v=417",
    "./src/listener-arena.js?v=417",
    "./src/listener-morph.js?v=417",
    "./src/build-presets.js?v=417",
    "./src/smithy.js?v=417",
    "./src/ilse.js?v=417",
    "./src/tyrant-hunt.js?v=417",
    "./src/world-beasts.js?v=417",
    "./src/elders.js?v=417",
    "./src/far-array.js?v=417",
    "./src/combat-visuals.js?v=417",
    "./src/dungeon-framework.js?v=417",
    "./src/elites.js?v=417",
    "./src/random.js?v=417",
    "./src/types.js?v=417",
    "./src/story.js?v=417",
    "./src/foundry.js?v=417",
    "./src/world.js?v=417",
    "./src/deep-dungeons.js?v=417",
    "./src/scenes.js?v=417",
    "./src/arenas.js?v=417",
    "./src/items.js?v=417",
    "./src/combat.js?v=417",
    "./src/interactions.js?v=417",
    "./src/persistence.js?v=417",
    "./src/input.js?v=417",
    "./src/game.js?v=417",
    "./src/renderer.js?v=417",
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
