const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v437`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=437",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=437",
    "./src/proving-ground.js?v=437",
    "./src/proving-ground-fixtures.js?v=437",
    "./src/proving-ground-labs.js?v=437",
    "./src/dungeon-variation.js?v=437",
    "./src/dungeon-completion.js?v=437",
    "./src/enemy-patterns.js?v=437",
    "./src/monster-pack.js?v=437",
    "./src/monster-render.js?v=437",
    "./src/astral-worm.js?v=437",
    "./src/astral-worm-render.js?v=437",
    "./src/astral-worm-retreat.js?v=437",
    "./src/astral-worm-mount.js?v=437",
    "./src/lightning-giant-render.js?v=437",
    "./src/astral-encounters.js?v=437",
    "./src/astral-world-retreat.js?v=437",
    "./src/landscape.js?v=437",
    "./src/landscape-render.js?v=437",
    "./src/underlands.js?v=437",
    "./src/pattern-dungeons.js?v=437",
    "./src/relay-network.js?v=437",
    "./src/glyphs.js?v=437",
    "./src/echoes.js?v=437",
    "./src/constellation.js?v=437",
    "./src/water-traversal.js?v=437",
    "./src/open-sea.js?v=437",
    "./src/boats.js?v=437",
    "./src/sea-creatures.js?v=437",
    "./src/diving.js?v=437",
    "./src/grottoes.js?v=437",
    "./src/spell-slots.js?v=437",
    "./src/settlements.js?v=437",
    "./src/skirmishes.js?v=437",
    "./src/travelers.js?v=437",
    "./src/diagnostic-probe.js?v=437",
    "./src/questing-beast.js?v=437",
    "./src/recitations.js?v=437",
    "./src/lore.js?v=437",
    "./src/glimpses.js?v=437",
    "./src/glimpse-render.js?v=437",
    "./src/glimpse-paint.js?v=437",
    "./src/glimpse-scenes.js?v=437",
    "./src/glimpse-horror.js?v=437",
    "./src/glimpse-legend.js?v=437",
    "./src/glimpse-hand.js?v=437",
    "./src/atlas-view.js?v=437",
    "./src/strange.js?v=437",
    "./src/linked-dungeons.js?v=437",
    "./src/digging.js?v=437",
    "./src/building.js?v=437",
    "./src/refuge-lands.js?v=437",
    "./src/revenant-horde.js?v=437",
    "./src/stages.js?v=437",
    "./src/watcher.js?v=437",
    "./src/vehicle-gates.js?v=437",
    "./src/dungeon-ladder.js?v=437",
    "./src/potions.js?v=437",
    "./src/transit-lattice.js?v=437",
    "./src/late-spells.js?v=437",
    "./src/listener-mirror.js?v=437",
    "./src/hometowns.js?v=437",
    "./src/listener-arena.js?v=437",
    "./src/listener-morph.js?v=437",
    "./src/build-presets.js?v=437",
    "./src/smithy.js?v=437",
    "./src/ilse.js?v=437",
    "./src/bells.js?v=437",
    "./src/tyrant-hunt.js?v=437",
    "./src/world-beasts.js?v=437",
    "./src/elders.js?v=437",
    "./src/far-array.js?v=437",
    "./src/combat-visuals.js?v=437",
    "./src/dungeon-framework.js?v=437",
    "./src/elites.js?v=437",
    "./src/random.js?v=437",
    "./src/types.js?v=437",
    "./src/story.js?v=437",
    "./src/foundry.js?v=437",
    "./src/world.js?v=437",
    "./src/deep-dungeons.js?v=437",
    "./src/scenes.js?v=437",
    "./src/arenas.js?v=437",
    "./src/items.js?v=437",
    "./src/combat.js?v=437",
    "./src/interactions.js?v=437",
    "./src/persistence.js?v=437",
    "./src/input.js?v=437",
    "./src/game.js?v=437",
    "./src/renderer.js?v=437",
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
