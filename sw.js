const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v399`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=399",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=399",
    "./src/proving-ground.js?v=399",
    "./src/proving-ground-fixtures.js?v=399",
    "./src/proving-ground-labs.js?v=399",
    "./src/dungeon-variation.js?v=399",
    "./src/dungeon-completion.js?v=399",
    "./src/enemy-patterns.js?v=399",
    "./src/monster-pack.js?v=399",
    "./src/monster-render.js?v=399",
    "./src/astral-worm.js?v=399",
    "./src/astral-worm-render.js?v=399",
    "./src/astral-worm-retreat.js?v=399",
    "./src/astral-worm-mount.js?v=399",
    "./src/lightning-giant-render.js?v=399",
    "./src/astral-encounters.js?v=399",
    "./src/astral-world-retreat.js?v=399",
    "./src/landscape.js?v=399",
    "./src/landscape-render.js?v=399",
    "./src/underlands.js?v=399",
    "./src/pattern-dungeons.js?v=399",
    "./src/relay-network.js?v=399",
    "./src/glyphs.js?v=399",
    "./src/echoes.js?v=399",
    "./src/constellation.js?v=399",
    "./src/water-traversal.js?v=399",
    "./src/open-sea.js?v=399",
    "./src/boats.js?v=399",
    "./src/sea-creatures.js?v=399",
    "./src/diving.js?v=399",
    "./src/grottoes.js?v=399",
    "./src/spell-slots.js?v=399",
    "./src/settlements.js?v=399",
    "./src/skirmishes.js?v=399",
    "./src/travelers.js?v=399",
    "./src/diagnostic-probe.js?v=399",
    "./src/questing-beast.js?v=399",
    "./src/recitations.js?v=399",
    "./src/lore.js?v=399",
    "./src/glimpses.js?v=399",
    "./src/glimpse-render.js?v=399",
    "./src/glimpse-paint.js?v=399",
    "./src/glimpse-scenes.js?v=399",
    "./src/glimpse-horror.js?v=399",
    "./src/glimpse-legend.js?v=399",
    "./src/glimpse-hand.js?v=399",
    "./src/atlas-view.js?v=399",
    "./src/strange.js?v=399",
    "./src/linked-dungeons.js?v=399",
    "./src/digging.js?v=399",
    "./src/building.js?v=399",
    "./src/refuge-lands.js?v=399",
    "./src/revenant-horde.js?v=399",
    "./src/stages.js?v=399",
    "./src/watcher.js?v=399",
    "./src/vehicle-gates.js?v=399",
    "./src/dungeon-ladder.js?v=399",
    "./src/potions.js?v=399",
    "./src/transit-lattice.js?v=399",
    "./src/late-spells.js?v=399",
    "./src/listener-mirror.js?v=399",
    "./src/hometowns.js?v=399",
    "./src/listener-arena.js?v=399",
    "./src/listener-morph.js?v=399",
    "./src/build-presets.js?v=399",
    "./src/smithy.js?v=399",
    "./src/tyrant-hunt.js?v=399",
    "./src/world-beasts.js?v=399",
    "./src/elders.js?v=399",
    "./src/far-array.js?v=399",
    "./src/combat-visuals.js?v=399",
    "./src/dungeon-framework.js?v=399",
    "./src/elites.js?v=399",
    "./src/random.js?v=399",
    "./src/types.js?v=399",
    "./src/story.js?v=399",
    "./src/foundry.js?v=399",
    "./src/world.js?v=399",
    "./src/deep-dungeons.js?v=399",
    "./src/scenes.js?v=399",
    "./src/arenas.js?v=399",
    "./src/items.js?v=399",
    "./src/combat.js?v=399",
    "./src/interactions.js?v=399",
    "./src/persistence.js?v=399",
    "./src/input.js?v=399",
    "./src/game.js?v=399",
    "./src/renderer.js?v=399",
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
