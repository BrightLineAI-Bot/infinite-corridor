const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v401`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=401",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=401",
    "./src/proving-ground.js?v=401",
    "./src/proving-ground-fixtures.js?v=401",
    "./src/proving-ground-labs.js?v=401",
    "./src/dungeon-variation.js?v=401",
    "./src/dungeon-completion.js?v=401",
    "./src/enemy-patterns.js?v=401",
    "./src/monster-pack.js?v=401",
    "./src/monster-render.js?v=401",
    "./src/astral-worm.js?v=401",
    "./src/astral-worm-render.js?v=401",
    "./src/astral-worm-retreat.js?v=401",
    "./src/astral-worm-mount.js?v=401",
    "./src/lightning-giant-render.js?v=401",
    "./src/astral-encounters.js?v=401",
    "./src/astral-world-retreat.js?v=401",
    "./src/landscape.js?v=401",
    "./src/landscape-render.js?v=401",
    "./src/underlands.js?v=401",
    "./src/pattern-dungeons.js?v=401",
    "./src/relay-network.js?v=401",
    "./src/glyphs.js?v=401",
    "./src/echoes.js?v=401",
    "./src/constellation.js?v=401",
    "./src/water-traversal.js?v=401",
    "./src/open-sea.js?v=401",
    "./src/boats.js?v=401",
    "./src/sea-creatures.js?v=401",
    "./src/diving.js?v=401",
    "./src/grottoes.js?v=401",
    "./src/spell-slots.js?v=401",
    "./src/settlements.js?v=401",
    "./src/skirmishes.js?v=401",
    "./src/travelers.js?v=401",
    "./src/diagnostic-probe.js?v=401",
    "./src/questing-beast.js?v=401",
    "./src/recitations.js?v=401",
    "./src/lore.js?v=401",
    "./src/glimpses.js?v=401",
    "./src/glimpse-render.js?v=401",
    "./src/glimpse-paint.js?v=401",
    "./src/glimpse-scenes.js?v=401",
    "./src/glimpse-horror.js?v=401",
    "./src/glimpse-legend.js?v=401",
    "./src/glimpse-hand.js?v=401",
    "./src/atlas-view.js?v=401",
    "./src/strange.js?v=401",
    "./src/linked-dungeons.js?v=401",
    "./src/digging.js?v=401",
    "./src/building.js?v=401",
    "./src/refuge-lands.js?v=401",
    "./src/revenant-horde.js?v=401",
    "./src/stages.js?v=401",
    "./src/watcher.js?v=401",
    "./src/vehicle-gates.js?v=401",
    "./src/dungeon-ladder.js?v=401",
    "./src/potions.js?v=401",
    "./src/transit-lattice.js?v=401",
    "./src/late-spells.js?v=401",
    "./src/listener-mirror.js?v=401",
    "./src/hometowns.js?v=401",
    "./src/listener-arena.js?v=401",
    "./src/listener-morph.js?v=401",
    "./src/build-presets.js?v=401",
    "./src/smithy.js?v=401",
    "./src/tyrant-hunt.js?v=401",
    "./src/world-beasts.js?v=401",
    "./src/elders.js?v=401",
    "./src/far-array.js?v=401",
    "./src/combat-visuals.js?v=401",
    "./src/dungeon-framework.js?v=401",
    "./src/elites.js?v=401",
    "./src/random.js?v=401",
    "./src/types.js?v=401",
    "./src/story.js?v=401",
    "./src/foundry.js?v=401",
    "./src/world.js?v=401",
    "./src/deep-dungeons.js?v=401",
    "./src/scenes.js?v=401",
    "./src/arenas.js?v=401",
    "./src/items.js?v=401",
    "./src/combat.js?v=401",
    "./src/interactions.js?v=401",
    "./src/persistence.js?v=401",
    "./src/input.js?v=401",
    "./src/game.js?v=401",
    "./src/renderer.js?v=401",
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
