const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v453`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=453",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=453",
    "./src/proving-ground.js?v=453",
    "./src/proving-ground-fixtures.js?v=453",
    "./src/proving-ground-labs.js?v=453",
    "./src/dungeon-variation.js?v=453",
    "./src/dungeon-completion.js?v=453",
    "./src/enemy-patterns.js?v=453",
    "./src/monster-pack.js?v=453",
    "./src/monster-render.js?v=453",
    "./src/astral-worm.js?v=453",
    "./src/astral-worm-render.js?v=453",
    "./src/astral-worm-retreat.js?v=453",
    "./src/astral-worm-mount.js?v=453",
    "./src/lightning-giant-render.js?v=453",
    "./src/astral-encounters.js?v=453",
    "./src/astral-world-retreat.js?v=453",
    "./src/landscape.js?v=453",
    "./src/landscape-render.js?v=453",
    "./src/underlands.js?v=453",
    "./src/pattern-dungeons.js?v=453",
    "./src/relay-network.js?v=453",
    "./src/glyphs.js?v=453",
    "./src/echoes.js?v=453",
    "./src/constellation.js?v=453",
    "./src/water-traversal.js?v=453",
    "./src/open-sea.js?v=453",
    "./src/boats.js?v=453",
    "./src/sea-creatures.js?v=453",
    "./src/diving.js?v=453",
    "./src/grottoes.js?v=453",
    "./src/spell-slots.js?v=453",
    "./src/settlements.js?v=453",
    "./src/skirmishes.js?v=453",
    "./src/travelers.js?v=453",
    "./src/diagnostic-probe.js?v=453",
    "./src/questing-beast.js?v=453",
    "./src/recitations.js?v=453",
    "./src/lore.js?v=453",
    "./src/glimpses.js?v=453",
    "./src/glimpse-render.js?v=453",
    "./src/glimpse-paint.js?v=453",
    "./src/glimpse-scenes.js?v=453",
    "./src/glimpse-horror.js?v=453",
    "./src/glimpse-legend.js?v=453",
    "./src/glimpse-hand.js?v=453",
    "./src/atlas-view.js?v=453",
    "./src/strange.js?v=453",
    "./src/linked-dungeons.js?v=453",
    "./src/digging.js?v=453",
    "./src/building.js?v=453",
    "./src/refuge-lands.js?v=453",
    "./src/revenant-horde.js?v=453",
    "./src/stages.js?v=453",
    "./src/watcher.js?v=453",
    "./src/vehicle-gates.js?v=453",
    "./src/dungeon-ladder.js?v=453",
    "./src/potions.js?v=453",
    "./src/transit-lattice.js?v=453",
    "./src/late-spells.js?v=453",
    "./src/listener-mirror.js?v=453",
    "./src/hometowns.js?v=453",
    "./src/listener-arena.js?v=453",
    "./src/listener-morph.js?v=453",
    "./src/build-presets.js?v=453",
    "./src/smithy.js?v=453",
    "./src/ilse.js?v=453",
    "./src/bells.js?v=453",
    "./src/meals.js?v=453",
    "./src/tyrant-hunt.js?v=453",
    "./src/world-beasts.js?v=453",
    "./src/elders.js?v=453",
    "./src/far-array.js?v=453",
    "./src/combat-visuals.js?v=453",
    "./src/dungeon-framework.js?v=453",
    "./src/elites.js?v=453",
    "./src/random.js?v=453",
    "./src/types.js?v=453",
    "./src/story.js?v=453",
    "./src/foundry.js?v=453",
    "./src/world.js?v=453",
    "./src/deep-dungeons.js?v=453",
    "./src/scenes.js?v=453",
    "./src/arenas.js?v=453",
    "./src/items.js?v=453",
    "./src/combat.js?v=453",
    "./src/interactions.js?v=453",
    "./src/persistence.js?v=453",
    "./src/input.js?v=453",
    "./src/game.js?v=453",
    "./src/renderer.js?v=453",
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
