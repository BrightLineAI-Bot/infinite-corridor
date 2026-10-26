const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v445`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=445",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=445",
    "./src/proving-ground.js?v=445",
    "./src/proving-ground-fixtures.js?v=445",
    "./src/proving-ground-labs.js?v=445",
    "./src/dungeon-variation.js?v=445",
    "./src/dungeon-completion.js?v=445",
    "./src/enemy-patterns.js?v=445",
    "./src/monster-pack.js?v=445",
    "./src/monster-render.js?v=445",
    "./src/astral-worm.js?v=445",
    "./src/astral-worm-render.js?v=445",
    "./src/astral-worm-retreat.js?v=445",
    "./src/astral-worm-mount.js?v=445",
    "./src/lightning-giant-render.js?v=445",
    "./src/astral-encounters.js?v=445",
    "./src/astral-world-retreat.js?v=445",
    "./src/landscape.js?v=445",
    "./src/landscape-render.js?v=445",
    "./src/underlands.js?v=445",
    "./src/pattern-dungeons.js?v=445",
    "./src/relay-network.js?v=445",
    "./src/glyphs.js?v=445",
    "./src/echoes.js?v=445",
    "./src/constellation.js?v=445",
    "./src/water-traversal.js?v=445",
    "./src/open-sea.js?v=445",
    "./src/boats.js?v=445",
    "./src/sea-creatures.js?v=445",
    "./src/diving.js?v=445",
    "./src/grottoes.js?v=445",
    "./src/spell-slots.js?v=445",
    "./src/settlements.js?v=445",
    "./src/skirmishes.js?v=445",
    "./src/travelers.js?v=445",
    "./src/diagnostic-probe.js?v=445",
    "./src/questing-beast.js?v=445",
    "./src/recitations.js?v=445",
    "./src/lore.js?v=445",
    "./src/glimpses.js?v=445",
    "./src/glimpse-render.js?v=445",
    "./src/glimpse-paint.js?v=445",
    "./src/glimpse-scenes.js?v=445",
    "./src/glimpse-horror.js?v=445",
    "./src/glimpse-legend.js?v=445",
    "./src/glimpse-hand.js?v=445",
    "./src/atlas-view.js?v=445",
    "./src/strange.js?v=445",
    "./src/linked-dungeons.js?v=445",
    "./src/digging.js?v=445",
    "./src/building.js?v=445",
    "./src/refuge-lands.js?v=445",
    "./src/revenant-horde.js?v=445",
    "./src/stages.js?v=445",
    "./src/watcher.js?v=445",
    "./src/vehicle-gates.js?v=445",
    "./src/dungeon-ladder.js?v=445",
    "./src/potions.js?v=445",
    "./src/transit-lattice.js?v=445",
    "./src/late-spells.js?v=445",
    "./src/listener-mirror.js?v=445",
    "./src/hometowns.js?v=445",
    "./src/listener-arena.js?v=445",
    "./src/listener-morph.js?v=445",
    "./src/build-presets.js?v=445",
    "./src/smithy.js?v=445",
    "./src/ilse.js?v=445",
    "./src/bells.js?v=445",
    "./src/tyrant-hunt.js?v=445",
    "./src/world-beasts.js?v=445",
    "./src/elders.js?v=445",
    "./src/far-array.js?v=445",
    "./src/combat-visuals.js?v=445",
    "./src/dungeon-framework.js?v=445",
    "./src/elites.js?v=445",
    "./src/random.js?v=445",
    "./src/types.js?v=445",
    "./src/story.js?v=445",
    "./src/foundry.js?v=445",
    "./src/world.js?v=445",
    "./src/deep-dungeons.js?v=445",
    "./src/scenes.js?v=445",
    "./src/arenas.js?v=445",
    "./src/items.js?v=445",
    "./src/combat.js?v=445",
    "./src/interactions.js?v=445",
    "./src/persistence.js?v=445",
    "./src/input.js?v=445",
    "./src/game.js?v=445",
    "./src/renderer.js?v=445",
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
