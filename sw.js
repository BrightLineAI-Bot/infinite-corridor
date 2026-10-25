const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v427`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=427",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=427",
    "./src/proving-ground.js?v=427",
    "./src/proving-ground-fixtures.js?v=427",
    "./src/proving-ground-labs.js?v=427",
    "./src/dungeon-variation.js?v=427",
    "./src/dungeon-completion.js?v=427",
    "./src/enemy-patterns.js?v=427",
    "./src/monster-pack.js?v=427",
    "./src/monster-render.js?v=427",
    "./src/astral-worm.js?v=427",
    "./src/astral-worm-render.js?v=427",
    "./src/astral-worm-retreat.js?v=427",
    "./src/astral-worm-mount.js?v=427",
    "./src/lightning-giant-render.js?v=427",
    "./src/astral-encounters.js?v=427",
    "./src/astral-world-retreat.js?v=427",
    "./src/landscape.js?v=427",
    "./src/landscape-render.js?v=427",
    "./src/underlands.js?v=427",
    "./src/pattern-dungeons.js?v=427",
    "./src/relay-network.js?v=427",
    "./src/glyphs.js?v=427",
    "./src/echoes.js?v=427",
    "./src/constellation.js?v=427",
    "./src/water-traversal.js?v=427",
    "./src/open-sea.js?v=427",
    "./src/boats.js?v=427",
    "./src/sea-creatures.js?v=427",
    "./src/diving.js?v=427",
    "./src/grottoes.js?v=427",
    "./src/spell-slots.js?v=427",
    "./src/settlements.js?v=427",
    "./src/skirmishes.js?v=427",
    "./src/travelers.js?v=427",
    "./src/diagnostic-probe.js?v=427",
    "./src/questing-beast.js?v=427",
    "./src/recitations.js?v=427",
    "./src/lore.js?v=427",
    "./src/glimpses.js?v=427",
    "./src/glimpse-render.js?v=427",
    "./src/glimpse-paint.js?v=427",
    "./src/glimpse-scenes.js?v=427",
    "./src/glimpse-horror.js?v=427",
    "./src/glimpse-legend.js?v=427",
    "./src/glimpse-hand.js?v=427",
    "./src/atlas-view.js?v=427",
    "./src/strange.js?v=427",
    "./src/linked-dungeons.js?v=427",
    "./src/digging.js?v=427",
    "./src/building.js?v=427",
    "./src/refuge-lands.js?v=427",
    "./src/revenant-horde.js?v=427",
    "./src/stages.js?v=427",
    "./src/watcher.js?v=427",
    "./src/vehicle-gates.js?v=427",
    "./src/dungeon-ladder.js?v=427",
    "./src/potions.js?v=427",
    "./src/transit-lattice.js?v=427",
    "./src/late-spells.js?v=427",
    "./src/listener-mirror.js?v=427",
    "./src/hometowns.js?v=427",
    "./src/listener-arena.js?v=427",
    "./src/listener-morph.js?v=427",
    "./src/build-presets.js?v=427",
    "./src/smithy.js?v=427",
    "./src/ilse.js?v=427",
    "./src/tyrant-hunt.js?v=427",
    "./src/world-beasts.js?v=427",
    "./src/elders.js?v=427",
    "./src/far-array.js?v=427",
    "./src/combat-visuals.js?v=427",
    "./src/dungeon-framework.js?v=427",
    "./src/elites.js?v=427",
    "./src/random.js?v=427",
    "./src/types.js?v=427",
    "./src/story.js?v=427",
    "./src/foundry.js?v=427",
    "./src/world.js?v=427",
    "./src/deep-dungeons.js?v=427",
    "./src/scenes.js?v=427",
    "./src/arenas.js?v=427",
    "./src/items.js?v=427",
    "./src/combat.js?v=427",
    "./src/interactions.js?v=427",
    "./src/persistence.js?v=427",
    "./src/input.js?v=427",
    "./src/game.js?v=427",
    "./src/renderer.js?v=427",
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
