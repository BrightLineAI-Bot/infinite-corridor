const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v407`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=407",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=407",
    "./src/proving-ground.js?v=407",
    "./src/proving-ground-fixtures.js?v=407",
    "./src/proving-ground-labs.js?v=407",
    "./src/dungeon-variation.js?v=407",
    "./src/dungeon-completion.js?v=407",
    "./src/enemy-patterns.js?v=407",
    "./src/monster-pack.js?v=407",
    "./src/monster-render.js?v=407",
    "./src/astral-worm.js?v=407",
    "./src/astral-worm-render.js?v=407",
    "./src/astral-worm-retreat.js?v=407",
    "./src/astral-worm-mount.js?v=407",
    "./src/lightning-giant-render.js?v=407",
    "./src/astral-encounters.js?v=407",
    "./src/astral-world-retreat.js?v=407",
    "./src/landscape.js?v=407",
    "./src/landscape-render.js?v=407",
    "./src/underlands.js?v=407",
    "./src/pattern-dungeons.js?v=407",
    "./src/relay-network.js?v=407",
    "./src/glyphs.js?v=407",
    "./src/echoes.js?v=407",
    "./src/constellation.js?v=407",
    "./src/water-traversal.js?v=407",
    "./src/open-sea.js?v=407",
    "./src/boats.js?v=407",
    "./src/sea-creatures.js?v=407",
    "./src/diving.js?v=407",
    "./src/grottoes.js?v=407",
    "./src/spell-slots.js?v=407",
    "./src/settlements.js?v=407",
    "./src/skirmishes.js?v=407",
    "./src/travelers.js?v=407",
    "./src/diagnostic-probe.js?v=407",
    "./src/questing-beast.js?v=407",
    "./src/recitations.js?v=407",
    "./src/lore.js?v=407",
    "./src/glimpses.js?v=407",
    "./src/glimpse-render.js?v=407",
    "./src/glimpse-paint.js?v=407",
    "./src/glimpse-scenes.js?v=407",
    "./src/glimpse-horror.js?v=407",
    "./src/glimpse-legend.js?v=407",
    "./src/glimpse-hand.js?v=407",
    "./src/atlas-view.js?v=407",
    "./src/strange.js?v=407",
    "./src/linked-dungeons.js?v=407",
    "./src/digging.js?v=407",
    "./src/building.js?v=407",
    "./src/refuge-lands.js?v=407",
    "./src/revenant-horde.js?v=407",
    "./src/stages.js?v=407",
    "./src/watcher.js?v=407",
    "./src/vehicle-gates.js?v=407",
    "./src/dungeon-ladder.js?v=407",
    "./src/potions.js?v=407",
    "./src/transit-lattice.js?v=407",
    "./src/late-spells.js?v=407",
    "./src/listener-mirror.js?v=407",
    "./src/hometowns.js?v=407",
    "./src/listener-arena.js?v=407",
    "./src/listener-morph.js?v=407",
    "./src/build-presets.js?v=407",
    "./src/smithy.js?v=407",
    "./src/tyrant-hunt.js?v=407",
    "./src/world-beasts.js?v=407",
    "./src/elders.js?v=407",
    "./src/far-array.js?v=407",
    "./src/combat-visuals.js?v=407",
    "./src/dungeon-framework.js?v=407",
    "./src/elites.js?v=407",
    "./src/random.js?v=407",
    "./src/types.js?v=407",
    "./src/story.js?v=407",
    "./src/foundry.js?v=407",
    "./src/world.js?v=407",
    "./src/deep-dungeons.js?v=407",
    "./src/scenes.js?v=407",
    "./src/arenas.js?v=407",
    "./src/items.js?v=407",
    "./src/combat.js?v=407",
    "./src/interactions.js?v=407",
    "./src/persistence.js?v=407",
    "./src/input.js?v=407",
    "./src/game.js?v=407",
    "./src/renderer.js?v=407",
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
