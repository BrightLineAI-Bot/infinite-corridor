const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v449`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=449",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=449",
    "./src/proving-ground.js?v=449",
    "./src/proving-ground-fixtures.js?v=449",
    "./src/proving-ground-labs.js?v=449",
    "./src/dungeon-variation.js?v=449",
    "./src/dungeon-completion.js?v=449",
    "./src/enemy-patterns.js?v=449",
    "./src/monster-pack.js?v=449",
    "./src/monster-render.js?v=449",
    "./src/astral-worm.js?v=449",
    "./src/astral-worm-render.js?v=449",
    "./src/astral-worm-retreat.js?v=449",
    "./src/astral-worm-mount.js?v=449",
    "./src/lightning-giant-render.js?v=449",
    "./src/astral-encounters.js?v=449",
    "./src/astral-world-retreat.js?v=449",
    "./src/landscape.js?v=449",
    "./src/landscape-render.js?v=449",
    "./src/underlands.js?v=449",
    "./src/pattern-dungeons.js?v=449",
    "./src/relay-network.js?v=449",
    "./src/glyphs.js?v=449",
    "./src/echoes.js?v=449",
    "./src/constellation.js?v=449",
    "./src/water-traversal.js?v=449",
    "./src/open-sea.js?v=449",
    "./src/boats.js?v=449",
    "./src/sea-creatures.js?v=449",
    "./src/diving.js?v=449",
    "./src/grottoes.js?v=449",
    "./src/spell-slots.js?v=449",
    "./src/settlements.js?v=449",
    "./src/skirmishes.js?v=449",
    "./src/travelers.js?v=449",
    "./src/diagnostic-probe.js?v=449",
    "./src/questing-beast.js?v=449",
    "./src/recitations.js?v=449",
    "./src/lore.js?v=449",
    "./src/glimpses.js?v=449",
    "./src/glimpse-render.js?v=449",
    "./src/glimpse-paint.js?v=449",
    "./src/glimpse-scenes.js?v=449",
    "./src/glimpse-horror.js?v=449",
    "./src/glimpse-legend.js?v=449",
    "./src/glimpse-hand.js?v=449",
    "./src/atlas-view.js?v=449",
    "./src/strange.js?v=449",
    "./src/linked-dungeons.js?v=449",
    "./src/digging.js?v=449",
    "./src/building.js?v=449",
    "./src/refuge-lands.js?v=449",
    "./src/revenant-horde.js?v=449",
    "./src/stages.js?v=449",
    "./src/watcher.js?v=449",
    "./src/vehicle-gates.js?v=449",
    "./src/dungeon-ladder.js?v=449",
    "./src/potions.js?v=449",
    "./src/transit-lattice.js?v=449",
    "./src/late-spells.js?v=449",
    "./src/listener-mirror.js?v=449",
    "./src/hometowns.js?v=449",
    "./src/listener-arena.js?v=449",
    "./src/listener-morph.js?v=449",
    "./src/build-presets.js?v=449",
    "./src/smithy.js?v=449",
    "./src/ilse.js?v=449",
    "./src/bells.js?v=449",
    "./src/meals.js?v=449",
    "./src/tyrant-hunt.js?v=449",
    "./src/world-beasts.js?v=449",
    "./src/elders.js?v=449",
    "./src/far-array.js?v=449",
    "./src/combat-visuals.js?v=449",
    "./src/dungeon-framework.js?v=449",
    "./src/elites.js?v=449",
    "./src/random.js?v=449",
    "./src/types.js?v=449",
    "./src/story.js?v=449",
    "./src/foundry.js?v=449",
    "./src/world.js?v=449",
    "./src/deep-dungeons.js?v=449",
    "./src/scenes.js?v=449",
    "./src/arenas.js?v=449",
    "./src/items.js?v=449",
    "./src/combat.js?v=449",
    "./src/interactions.js?v=449",
    "./src/persistence.js?v=449",
    "./src/input.js?v=449",
    "./src/game.js?v=449",
    "./src/renderer.js?v=449",
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
