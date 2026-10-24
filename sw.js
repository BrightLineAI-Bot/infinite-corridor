const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v409`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=409",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=409",
    "./src/proving-ground.js?v=409",
    "./src/proving-ground-fixtures.js?v=409",
    "./src/proving-ground-labs.js?v=409",
    "./src/dungeon-variation.js?v=409",
    "./src/dungeon-completion.js?v=409",
    "./src/enemy-patterns.js?v=409",
    "./src/monster-pack.js?v=409",
    "./src/monster-render.js?v=409",
    "./src/astral-worm.js?v=409",
    "./src/astral-worm-render.js?v=409",
    "./src/astral-worm-retreat.js?v=409",
    "./src/astral-worm-mount.js?v=409",
    "./src/lightning-giant-render.js?v=409",
    "./src/astral-encounters.js?v=409",
    "./src/astral-world-retreat.js?v=409",
    "./src/landscape.js?v=409",
    "./src/landscape-render.js?v=409",
    "./src/underlands.js?v=409",
    "./src/pattern-dungeons.js?v=409",
    "./src/relay-network.js?v=409",
    "./src/glyphs.js?v=409",
    "./src/echoes.js?v=409",
    "./src/constellation.js?v=409",
    "./src/water-traversal.js?v=409",
    "./src/open-sea.js?v=409",
    "./src/boats.js?v=409",
    "./src/sea-creatures.js?v=409",
    "./src/diving.js?v=409",
    "./src/grottoes.js?v=409",
    "./src/spell-slots.js?v=409",
    "./src/settlements.js?v=409",
    "./src/skirmishes.js?v=409",
    "./src/travelers.js?v=409",
    "./src/diagnostic-probe.js?v=409",
    "./src/questing-beast.js?v=409",
    "./src/recitations.js?v=409",
    "./src/lore.js?v=409",
    "./src/glimpses.js?v=409",
    "./src/glimpse-render.js?v=409",
    "./src/glimpse-paint.js?v=409",
    "./src/glimpse-scenes.js?v=409",
    "./src/glimpse-horror.js?v=409",
    "./src/glimpse-legend.js?v=409",
    "./src/glimpse-hand.js?v=409",
    "./src/atlas-view.js?v=409",
    "./src/strange.js?v=409",
    "./src/linked-dungeons.js?v=409",
    "./src/digging.js?v=409",
    "./src/building.js?v=409",
    "./src/refuge-lands.js?v=409",
    "./src/revenant-horde.js?v=409",
    "./src/stages.js?v=409",
    "./src/watcher.js?v=409",
    "./src/vehicle-gates.js?v=409",
    "./src/dungeon-ladder.js?v=409",
    "./src/potions.js?v=409",
    "./src/transit-lattice.js?v=409",
    "./src/late-spells.js?v=409",
    "./src/listener-mirror.js?v=409",
    "./src/hometowns.js?v=409",
    "./src/listener-arena.js?v=409",
    "./src/listener-morph.js?v=409",
    "./src/build-presets.js?v=409",
    "./src/smithy.js?v=409",
    "./src/tyrant-hunt.js?v=409",
    "./src/world-beasts.js?v=409",
    "./src/elders.js?v=409",
    "./src/far-array.js?v=409",
    "./src/combat-visuals.js?v=409",
    "./src/dungeon-framework.js?v=409",
    "./src/elites.js?v=409",
    "./src/random.js?v=409",
    "./src/types.js?v=409",
    "./src/story.js?v=409",
    "./src/foundry.js?v=409",
    "./src/world.js?v=409",
    "./src/deep-dungeons.js?v=409",
    "./src/scenes.js?v=409",
    "./src/arenas.js?v=409",
    "./src/items.js?v=409",
    "./src/combat.js?v=409",
    "./src/interactions.js?v=409",
    "./src/persistence.js?v=409",
    "./src/input.js?v=409",
    "./src/game.js?v=409",
    "./src/renderer.js?v=409",
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
