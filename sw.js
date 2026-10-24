const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v395`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=395",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=395",
    "./src/proving-ground.js?v=395",
    "./src/proving-ground-fixtures.js?v=395",
    "./src/proving-ground-labs.js?v=395",
    "./src/dungeon-variation.js?v=395",
    "./src/dungeon-completion.js?v=395",
    "./src/enemy-patterns.js?v=395",
    "./src/monster-pack.js?v=395",
    "./src/monster-render.js?v=395",
    "./src/astral-worm.js?v=395",
    "./src/astral-worm-render.js?v=395",
    "./src/astral-worm-retreat.js?v=395",
    "./src/astral-worm-mount.js?v=395",
    "./src/lightning-giant-render.js?v=395",
    "./src/astral-encounters.js?v=395",
    "./src/astral-world-retreat.js?v=395",
    "./src/landscape.js?v=395",
    "./src/landscape-render.js?v=395",
    "./src/underlands.js?v=395",
    "./src/pattern-dungeons.js?v=395",
    "./src/relay-network.js?v=395",
    "./src/glyphs.js?v=395",
    "./src/echoes.js?v=395",
    "./src/constellation.js?v=395",
    "./src/water-traversal.js?v=395",
    "./src/open-sea.js?v=395",
    "./src/boats.js?v=395",
    "./src/sea-creatures.js?v=395",
    "./src/diving.js?v=395",
    "./src/grottoes.js?v=395",
    "./src/spell-slots.js?v=395",
    "./src/settlements.js?v=395",
    "./src/skirmishes.js?v=395",
    "./src/travelers.js?v=395",
    "./src/diagnostic-probe.js?v=395",
    "./src/questing-beast.js?v=395",
    "./src/recitations.js?v=395",
    "./src/lore.js?v=395",
    "./src/glimpses.js?v=395",
    "./src/glimpse-render.js?v=395",
    "./src/glimpse-paint.js?v=395",
    "./src/glimpse-scenes.js?v=395",
    "./src/glimpse-horror.js?v=395",
    "./src/glimpse-legend.js?v=395",
    "./src/glimpse-hand.js?v=395",
    "./src/atlas-view.js?v=395",
    "./src/strange.js?v=395",
    "./src/linked-dungeons.js?v=395",
    "./src/digging.js?v=395",
    "./src/building.js?v=395",
    "./src/refuge-lands.js?v=395",
    "./src/revenant-horde.js?v=395",
    "./src/stages.js?v=395",
    "./src/watcher.js?v=395",
    "./src/vehicle-gates.js?v=395",
    "./src/dungeon-ladder.js?v=395",
    "./src/potions.js?v=395",
    "./src/transit-lattice.js?v=395",
    "./src/late-spells.js?v=395",
    "./src/listener-mirror.js?v=395",
    "./src/hometowns.js?v=395",
    "./src/listener-arena.js?v=395",
    "./src/listener-morph.js?v=395",
    "./src/build-presets.js?v=395",
    "./src/smithy.js?v=395",
    "./src/tyrant-hunt.js?v=395",
    "./src/world-beasts.js?v=395",
    "./src/elders.js?v=395",
    "./src/far-array.js?v=395",
    "./src/combat-visuals.js?v=395",
    "./src/dungeon-framework.js?v=395",
    "./src/elites.js?v=395",
    "./src/random.js?v=395",
    "./src/types.js?v=395",
    "./src/story.js?v=395",
    "./src/foundry.js?v=395",
    "./src/world.js?v=395",
    "./src/deep-dungeons.js?v=395",
    "./src/scenes.js?v=395",
    "./src/arenas.js?v=395",
    "./src/items.js?v=395",
    "./src/combat.js?v=395",
    "./src/interactions.js?v=395",
    "./src/persistence.js?v=395",
    "./src/input.js?v=395",
    "./src/game.js?v=395",
    "./src/renderer.js?v=395",
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
