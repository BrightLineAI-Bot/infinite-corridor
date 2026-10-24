const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v421`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=421",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=421",
    "./src/proving-ground.js?v=421",
    "./src/proving-ground-fixtures.js?v=421",
    "./src/proving-ground-labs.js?v=421",
    "./src/dungeon-variation.js?v=421",
    "./src/dungeon-completion.js?v=421",
    "./src/enemy-patterns.js?v=421",
    "./src/monster-pack.js?v=421",
    "./src/monster-render.js?v=421",
    "./src/astral-worm.js?v=421",
    "./src/astral-worm-render.js?v=421",
    "./src/astral-worm-retreat.js?v=421",
    "./src/astral-worm-mount.js?v=421",
    "./src/lightning-giant-render.js?v=421",
    "./src/astral-encounters.js?v=421",
    "./src/astral-world-retreat.js?v=421",
    "./src/landscape.js?v=421",
    "./src/landscape-render.js?v=421",
    "./src/underlands.js?v=421",
    "./src/pattern-dungeons.js?v=421",
    "./src/relay-network.js?v=421",
    "./src/glyphs.js?v=421",
    "./src/echoes.js?v=421",
    "./src/constellation.js?v=421",
    "./src/water-traversal.js?v=421",
    "./src/open-sea.js?v=421",
    "./src/boats.js?v=421",
    "./src/sea-creatures.js?v=421",
    "./src/diving.js?v=421",
    "./src/grottoes.js?v=421",
    "./src/spell-slots.js?v=421",
    "./src/settlements.js?v=421",
    "./src/skirmishes.js?v=421",
    "./src/travelers.js?v=421",
    "./src/diagnostic-probe.js?v=421",
    "./src/questing-beast.js?v=421",
    "./src/recitations.js?v=421",
    "./src/lore.js?v=421",
    "./src/glimpses.js?v=421",
    "./src/glimpse-render.js?v=421",
    "./src/glimpse-paint.js?v=421",
    "./src/glimpse-scenes.js?v=421",
    "./src/glimpse-horror.js?v=421",
    "./src/glimpse-legend.js?v=421",
    "./src/glimpse-hand.js?v=421",
    "./src/atlas-view.js?v=421",
    "./src/strange.js?v=421",
    "./src/linked-dungeons.js?v=421",
    "./src/digging.js?v=421",
    "./src/building.js?v=421",
    "./src/refuge-lands.js?v=421",
    "./src/revenant-horde.js?v=421",
    "./src/stages.js?v=421",
    "./src/watcher.js?v=421",
    "./src/vehicle-gates.js?v=421",
    "./src/dungeon-ladder.js?v=421",
    "./src/potions.js?v=421",
    "./src/transit-lattice.js?v=421",
    "./src/late-spells.js?v=421",
    "./src/listener-mirror.js?v=421",
    "./src/hometowns.js?v=421",
    "./src/listener-arena.js?v=421",
    "./src/listener-morph.js?v=421",
    "./src/build-presets.js?v=421",
    "./src/smithy.js?v=421",
    "./src/ilse.js?v=421",
    "./src/tyrant-hunt.js?v=421",
    "./src/world-beasts.js?v=421",
    "./src/elders.js?v=421",
    "./src/far-array.js?v=421",
    "./src/combat-visuals.js?v=421",
    "./src/dungeon-framework.js?v=421",
    "./src/elites.js?v=421",
    "./src/random.js?v=421",
    "./src/types.js?v=421",
    "./src/story.js?v=421",
    "./src/foundry.js?v=421",
    "./src/world.js?v=421",
    "./src/deep-dungeons.js?v=421",
    "./src/scenes.js?v=421",
    "./src/arenas.js?v=421",
    "./src/items.js?v=421",
    "./src/combat.js?v=421",
    "./src/interactions.js?v=421",
    "./src/persistence.js?v=421",
    "./src/input.js?v=421",
    "./src/game.js?v=421",
    "./src/renderer.js?v=421",
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
