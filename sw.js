const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v451`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=451",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=451",
    "./src/proving-ground.js?v=451",
    "./src/proving-ground-fixtures.js?v=451",
    "./src/proving-ground-labs.js?v=451",
    "./src/dungeon-variation.js?v=451",
    "./src/dungeon-completion.js?v=451",
    "./src/enemy-patterns.js?v=451",
    "./src/monster-pack.js?v=451",
    "./src/monster-render.js?v=451",
    "./src/astral-worm.js?v=451",
    "./src/astral-worm-render.js?v=451",
    "./src/astral-worm-retreat.js?v=451",
    "./src/astral-worm-mount.js?v=451",
    "./src/lightning-giant-render.js?v=451",
    "./src/astral-encounters.js?v=451",
    "./src/astral-world-retreat.js?v=451",
    "./src/landscape.js?v=451",
    "./src/landscape-render.js?v=451",
    "./src/underlands.js?v=451",
    "./src/pattern-dungeons.js?v=451",
    "./src/relay-network.js?v=451",
    "./src/glyphs.js?v=451",
    "./src/echoes.js?v=451",
    "./src/constellation.js?v=451",
    "./src/water-traversal.js?v=451",
    "./src/open-sea.js?v=451",
    "./src/boats.js?v=451",
    "./src/sea-creatures.js?v=451",
    "./src/diving.js?v=451",
    "./src/grottoes.js?v=451",
    "./src/spell-slots.js?v=451",
    "./src/settlements.js?v=451",
    "./src/skirmishes.js?v=451",
    "./src/travelers.js?v=451",
    "./src/diagnostic-probe.js?v=451",
    "./src/questing-beast.js?v=451",
    "./src/recitations.js?v=451",
    "./src/lore.js?v=451",
    "./src/glimpses.js?v=451",
    "./src/glimpse-render.js?v=451",
    "./src/glimpse-paint.js?v=451",
    "./src/glimpse-scenes.js?v=451",
    "./src/glimpse-horror.js?v=451",
    "./src/glimpse-legend.js?v=451",
    "./src/glimpse-hand.js?v=451",
    "./src/atlas-view.js?v=451",
    "./src/strange.js?v=451",
    "./src/linked-dungeons.js?v=451",
    "./src/digging.js?v=451",
    "./src/building.js?v=451",
    "./src/refuge-lands.js?v=451",
    "./src/revenant-horde.js?v=451",
    "./src/stages.js?v=451",
    "./src/watcher.js?v=451",
    "./src/vehicle-gates.js?v=451",
    "./src/dungeon-ladder.js?v=451",
    "./src/potions.js?v=451",
    "./src/transit-lattice.js?v=451",
    "./src/late-spells.js?v=451",
    "./src/listener-mirror.js?v=451",
    "./src/hometowns.js?v=451",
    "./src/listener-arena.js?v=451",
    "./src/listener-morph.js?v=451",
    "./src/build-presets.js?v=451",
    "./src/smithy.js?v=451",
    "./src/ilse.js?v=451",
    "./src/bells.js?v=451",
    "./src/meals.js?v=451",
    "./src/tyrant-hunt.js?v=451",
    "./src/world-beasts.js?v=451",
    "./src/elders.js?v=451",
    "./src/far-array.js?v=451",
    "./src/combat-visuals.js?v=451",
    "./src/dungeon-framework.js?v=451",
    "./src/elites.js?v=451",
    "./src/random.js?v=451",
    "./src/types.js?v=451",
    "./src/story.js?v=451",
    "./src/foundry.js?v=451",
    "./src/world.js?v=451",
    "./src/deep-dungeons.js?v=451",
    "./src/scenes.js?v=451",
    "./src/arenas.js?v=451",
    "./src/items.js?v=451",
    "./src/combat.js?v=451",
    "./src/interactions.js?v=451",
    "./src/persistence.js?v=451",
    "./src/input.js?v=451",
    "./src/game.js?v=451",
    "./src/renderer.js?v=451",
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
