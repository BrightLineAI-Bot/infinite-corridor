const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v425`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=425",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=425",
    "./src/proving-ground.js?v=425",
    "./src/proving-ground-fixtures.js?v=425",
    "./src/proving-ground-labs.js?v=425",
    "./src/dungeon-variation.js?v=425",
    "./src/dungeon-completion.js?v=425",
    "./src/enemy-patterns.js?v=425",
    "./src/monster-pack.js?v=425",
    "./src/monster-render.js?v=425",
    "./src/astral-worm.js?v=425",
    "./src/astral-worm-render.js?v=425",
    "./src/astral-worm-retreat.js?v=425",
    "./src/astral-worm-mount.js?v=425",
    "./src/lightning-giant-render.js?v=425",
    "./src/astral-encounters.js?v=425",
    "./src/astral-world-retreat.js?v=425",
    "./src/landscape.js?v=425",
    "./src/landscape-render.js?v=425",
    "./src/underlands.js?v=425",
    "./src/pattern-dungeons.js?v=425",
    "./src/relay-network.js?v=425",
    "./src/glyphs.js?v=425",
    "./src/echoes.js?v=425",
    "./src/constellation.js?v=425",
    "./src/water-traversal.js?v=425",
    "./src/open-sea.js?v=425",
    "./src/boats.js?v=425",
    "./src/sea-creatures.js?v=425",
    "./src/diving.js?v=425",
    "./src/grottoes.js?v=425",
    "./src/spell-slots.js?v=425",
    "./src/settlements.js?v=425",
    "./src/skirmishes.js?v=425",
    "./src/travelers.js?v=425",
    "./src/diagnostic-probe.js?v=425",
    "./src/questing-beast.js?v=425",
    "./src/recitations.js?v=425",
    "./src/lore.js?v=425",
    "./src/glimpses.js?v=425",
    "./src/glimpse-render.js?v=425",
    "./src/glimpse-paint.js?v=425",
    "./src/glimpse-scenes.js?v=425",
    "./src/glimpse-horror.js?v=425",
    "./src/glimpse-legend.js?v=425",
    "./src/glimpse-hand.js?v=425",
    "./src/atlas-view.js?v=425",
    "./src/strange.js?v=425",
    "./src/linked-dungeons.js?v=425",
    "./src/digging.js?v=425",
    "./src/building.js?v=425",
    "./src/refuge-lands.js?v=425",
    "./src/revenant-horde.js?v=425",
    "./src/stages.js?v=425",
    "./src/watcher.js?v=425",
    "./src/vehicle-gates.js?v=425",
    "./src/dungeon-ladder.js?v=425",
    "./src/potions.js?v=425",
    "./src/transit-lattice.js?v=425",
    "./src/late-spells.js?v=425",
    "./src/listener-mirror.js?v=425",
    "./src/hometowns.js?v=425",
    "./src/listener-arena.js?v=425",
    "./src/listener-morph.js?v=425",
    "./src/build-presets.js?v=425",
    "./src/smithy.js?v=425",
    "./src/ilse.js?v=425",
    "./src/tyrant-hunt.js?v=425",
    "./src/world-beasts.js?v=425",
    "./src/elders.js?v=425",
    "./src/far-array.js?v=425",
    "./src/combat-visuals.js?v=425",
    "./src/dungeon-framework.js?v=425",
    "./src/elites.js?v=425",
    "./src/random.js?v=425",
    "./src/types.js?v=425",
    "./src/story.js?v=425",
    "./src/foundry.js?v=425",
    "./src/world.js?v=425",
    "./src/deep-dungeons.js?v=425",
    "./src/scenes.js?v=425",
    "./src/arenas.js?v=425",
    "./src/items.js?v=425",
    "./src/combat.js?v=425",
    "./src/interactions.js?v=425",
    "./src/persistence.js?v=425",
    "./src/input.js?v=425",
    "./src/game.js?v=425",
    "./src/renderer.js?v=425",
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
