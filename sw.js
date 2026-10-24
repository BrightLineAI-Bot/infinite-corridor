const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v403`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=403",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=403",
    "./src/proving-ground.js?v=403",
    "./src/proving-ground-fixtures.js?v=403",
    "./src/proving-ground-labs.js?v=403",
    "./src/dungeon-variation.js?v=403",
    "./src/dungeon-completion.js?v=403",
    "./src/enemy-patterns.js?v=403",
    "./src/monster-pack.js?v=403",
    "./src/monster-render.js?v=403",
    "./src/astral-worm.js?v=403",
    "./src/astral-worm-render.js?v=403",
    "./src/astral-worm-retreat.js?v=403",
    "./src/astral-worm-mount.js?v=403",
    "./src/lightning-giant-render.js?v=403",
    "./src/astral-encounters.js?v=403",
    "./src/astral-world-retreat.js?v=403",
    "./src/landscape.js?v=403",
    "./src/landscape-render.js?v=403",
    "./src/underlands.js?v=403",
    "./src/pattern-dungeons.js?v=403",
    "./src/relay-network.js?v=403",
    "./src/glyphs.js?v=403",
    "./src/echoes.js?v=403",
    "./src/constellation.js?v=403",
    "./src/water-traversal.js?v=403",
    "./src/open-sea.js?v=403",
    "./src/boats.js?v=403",
    "./src/sea-creatures.js?v=403",
    "./src/diving.js?v=403",
    "./src/grottoes.js?v=403",
    "./src/spell-slots.js?v=403",
    "./src/settlements.js?v=403",
    "./src/skirmishes.js?v=403",
    "./src/travelers.js?v=403",
    "./src/diagnostic-probe.js?v=403",
    "./src/questing-beast.js?v=403",
    "./src/recitations.js?v=403",
    "./src/lore.js?v=403",
    "./src/glimpses.js?v=403",
    "./src/glimpse-render.js?v=403",
    "./src/glimpse-paint.js?v=403",
    "./src/glimpse-scenes.js?v=403",
    "./src/glimpse-horror.js?v=403",
    "./src/glimpse-legend.js?v=403",
    "./src/glimpse-hand.js?v=403",
    "./src/atlas-view.js?v=403",
    "./src/strange.js?v=403",
    "./src/linked-dungeons.js?v=403",
    "./src/digging.js?v=403",
    "./src/building.js?v=403",
    "./src/refuge-lands.js?v=403",
    "./src/revenant-horde.js?v=403",
    "./src/stages.js?v=403",
    "./src/watcher.js?v=403",
    "./src/vehicle-gates.js?v=403",
    "./src/dungeon-ladder.js?v=403",
    "./src/potions.js?v=403",
    "./src/transit-lattice.js?v=403",
    "./src/late-spells.js?v=403",
    "./src/listener-mirror.js?v=403",
    "./src/hometowns.js?v=403",
    "./src/listener-arena.js?v=403",
    "./src/listener-morph.js?v=403",
    "./src/build-presets.js?v=403",
    "./src/smithy.js?v=403",
    "./src/tyrant-hunt.js?v=403",
    "./src/world-beasts.js?v=403",
    "./src/elders.js?v=403",
    "./src/far-array.js?v=403",
    "./src/combat-visuals.js?v=403",
    "./src/dungeon-framework.js?v=403",
    "./src/elites.js?v=403",
    "./src/random.js?v=403",
    "./src/types.js?v=403",
    "./src/story.js?v=403",
    "./src/foundry.js?v=403",
    "./src/world.js?v=403",
    "./src/deep-dungeons.js?v=403",
    "./src/scenes.js?v=403",
    "./src/arenas.js?v=403",
    "./src/items.js?v=403",
    "./src/combat.js?v=403",
    "./src/interactions.js?v=403",
    "./src/persistence.js?v=403",
    "./src/input.js?v=403",
    "./src/game.js?v=403",
    "./src/renderer.js?v=403",
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
