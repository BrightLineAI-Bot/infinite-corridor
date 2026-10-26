const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v443`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=443",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=443",
    "./src/proving-ground.js?v=443",
    "./src/proving-ground-fixtures.js?v=443",
    "./src/proving-ground-labs.js?v=443",
    "./src/dungeon-variation.js?v=443",
    "./src/dungeon-completion.js?v=443",
    "./src/enemy-patterns.js?v=443",
    "./src/monster-pack.js?v=443",
    "./src/monster-render.js?v=443",
    "./src/astral-worm.js?v=443",
    "./src/astral-worm-render.js?v=443",
    "./src/astral-worm-retreat.js?v=443",
    "./src/astral-worm-mount.js?v=443",
    "./src/lightning-giant-render.js?v=443",
    "./src/astral-encounters.js?v=443",
    "./src/astral-world-retreat.js?v=443",
    "./src/landscape.js?v=443",
    "./src/landscape-render.js?v=443",
    "./src/underlands.js?v=443",
    "./src/pattern-dungeons.js?v=443",
    "./src/relay-network.js?v=443",
    "./src/glyphs.js?v=443",
    "./src/echoes.js?v=443",
    "./src/constellation.js?v=443",
    "./src/water-traversal.js?v=443",
    "./src/open-sea.js?v=443",
    "./src/boats.js?v=443",
    "./src/sea-creatures.js?v=443",
    "./src/diving.js?v=443",
    "./src/grottoes.js?v=443",
    "./src/spell-slots.js?v=443",
    "./src/settlements.js?v=443",
    "./src/skirmishes.js?v=443",
    "./src/travelers.js?v=443",
    "./src/diagnostic-probe.js?v=443",
    "./src/questing-beast.js?v=443",
    "./src/recitations.js?v=443",
    "./src/lore.js?v=443",
    "./src/glimpses.js?v=443",
    "./src/glimpse-render.js?v=443",
    "./src/glimpse-paint.js?v=443",
    "./src/glimpse-scenes.js?v=443",
    "./src/glimpse-horror.js?v=443",
    "./src/glimpse-legend.js?v=443",
    "./src/glimpse-hand.js?v=443",
    "./src/atlas-view.js?v=443",
    "./src/strange.js?v=443",
    "./src/linked-dungeons.js?v=443",
    "./src/digging.js?v=443",
    "./src/building.js?v=443",
    "./src/refuge-lands.js?v=443",
    "./src/revenant-horde.js?v=443",
    "./src/stages.js?v=443",
    "./src/watcher.js?v=443",
    "./src/vehicle-gates.js?v=443",
    "./src/dungeon-ladder.js?v=443",
    "./src/potions.js?v=443",
    "./src/transit-lattice.js?v=443",
    "./src/late-spells.js?v=443",
    "./src/listener-mirror.js?v=443",
    "./src/hometowns.js?v=443",
    "./src/listener-arena.js?v=443",
    "./src/listener-morph.js?v=443",
    "./src/build-presets.js?v=443",
    "./src/smithy.js?v=443",
    "./src/ilse.js?v=443",
    "./src/bells.js?v=443",
    "./src/tyrant-hunt.js?v=443",
    "./src/world-beasts.js?v=443",
    "./src/elders.js?v=443",
    "./src/far-array.js?v=443",
    "./src/combat-visuals.js?v=443",
    "./src/dungeon-framework.js?v=443",
    "./src/elites.js?v=443",
    "./src/random.js?v=443",
    "./src/types.js?v=443",
    "./src/story.js?v=443",
    "./src/foundry.js?v=443",
    "./src/world.js?v=443",
    "./src/deep-dungeons.js?v=443",
    "./src/scenes.js?v=443",
    "./src/arenas.js?v=443",
    "./src/items.js?v=443",
    "./src/combat.js?v=443",
    "./src/interactions.js?v=443",
    "./src/persistence.js?v=443",
    "./src/input.js?v=443",
    "./src/game.js?v=443",
    "./src/renderer.js?v=443",
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
