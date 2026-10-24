const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v393`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=393",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=393",
    "./src/proving-ground.js?v=393",
    "./src/proving-ground-fixtures.js?v=393",
    "./src/proving-ground-labs.js?v=393",
    "./src/dungeon-variation.js?v=393",
    "./src/dungeon-completion.js?v=393",
    "./src/enemy-patterns.js?v=393",
    "./src/monster-pack.js?v=393",
    "./src/monster-render.js?v=393",
    "./src/astral-worm.js?v=393",
    "./src/astral-worm-render.js?v=393",
    "./src/astral-worm-retreat.js?v=393",
    "./src/astral-worm-mount.js?v=393",
    "./src/lightning-giant-render.js?v=393",
    "./src/astral-encounters.js?v=393",
    "./src/astral-world-retreat.js?v=393",
    "./src/landscape.js?v=393",
    "./src/landscape-render.js?v=393",
    "./src/underlands.js?v=393",
    "./src/pattern-dungeons.js?v=393",
    "./src/relay-network.js?v=393",
    "./src/glyphs.js?v=393",
    "./src/echoes.js?v=393",
    "./src/constellation.js?v=393",
    "./src/water-traversal.js?v=393",
    "./src/open-sea.js?v=393",
    "./src/boats.js?v=393",
    "./src/sea-creatures.js?v=393",
    "./src/diving.js?v=393",
    "./src/grottoes.js?v=393",
    "./src/spell-slots.js?v=393",
    "./src/settlements.js?v=393",
    "./src/skirmishes.js?v=393",
    "./src/travelers.js?v=393",
    "./src/diagnostic-probe.js?v=393",
    "./src/questing-beast.js?v=393",
    "./src/recitations.js?v=393",
    "./src/lore.js?v=393",
    "./src/glimpses.js?v=393",
    "./src/glimpse-render.js?v=393",
    "./src/glimpse-paint.js?v=393",
    "./src/glimpse-scenes.js?v=393",
    "./src/glimpse-horror.js?v=393",
    "./src/glimpse-legend.js?v=393",
    "./src/glimpse-hand.js?v=393",
    "./src/atlas-view.js?v=393",
    "./src/strange.js?v=393",
    "./src/linked-dungeons.js?v=393",
    "./src/digging.js?v=393",
    "./src/building.js?v=393",
    "./src/refuge-lands.js?v=393",
    "./src/revenant-horde.js?v=393",
    "./src/stages.js?v=393",
    "./src/watcher.js?v=393",
    "./src/vehicle-gates.js?v=393",
    "./src/dungeon-ladder.js?v=393",
    "./src/potions.js?v=393",
    "./src/transit-lattice.js?v=393",
    "./src/late-spells.js?v=393",
    "./src/listener-mirror.js?v=393",
    "./src/hometowns.js?v=393",
    "./src/listener-arena.js?v=393",
    "./src/listener-morph.js?v=393",
    "./src/build-presets.js?v=393",
    "./src/tyrant-hunt.js?v=393",
    "./src/world-beasts.js?v=393",
    "./src/elders.js?v=393",
    "./src/far-array.js?v=393",
    "./src/combat-visuals.js?v=393",
    "./src/dungeon-framework.js?v=393",
    "./src/elites.js?v=393",
    "./src/random.js?v=393",
    "./src/types.js?v=393",
    "./src/story.js?v=393",
    "./src/foundry.js?v=393",
    "./src/world.js?v=393",
    "./src/deep-dungeons.js?v=393",
    "./src/scenes.js?v=393",
    "./src/arenas.js?v=393",
    "./src/items.js?v=393",
    "./src/combat.js?v=393",
    "./src/interactions.js?v=393",
    "./src/persistence.js?v=393",
    "./src/input.js?v=393",
    "./src/game.js?v=393",
    "./src/renderer.js?v=393",
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
