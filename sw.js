const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v459`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=459",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=459",
    "./src/proving-ground.js?v=459",
    "./src/proving-ground-fixtures.js?v=459",
    "./src/proving-ground-labs.js?v=459",
    "./src/dungeon-variation.js?v=459",
    "./src/dungeon-completion.js?v=459",
    "./src/enemy-patterns.js?v=459",
    "./src/monster-pack.js?v=459",
    "./src/monster-render.js?v=459",
    "./src/astral-worm.js?v=459",
    "./src/astral-worm-render.js?v=459",
    "./src/astral-worm-retreat.js?v=459",
    "./src/astral-worm-mount.js?v=459",
    "./src/lightning-giant-render.js?v=459",
    "./src/astral-encounters.js?v=459",
    "./src/astral-world-retreat.js?v=459",
    "./src/landscape.js?v=459",
    "./src/landscape-render.js?v=459",
    "./src/underlands.js?v=459",
    "./src/pattern-dungeons.js?v=459",
    "./src/relay-network.js?v=459",
    "./src/glyphs.js?v=459",
    "./src/echoes.js?v=459",
    "./src/constellation.js?v=459",
    "./src/water-traversal.js?v=459",
    "./src/open-sea.js?v=459",
    "./src/boats.js?v=459",
    "./src/sea-creatures.js?v=459",
    "./src/diving.js?v=459",
    "./src/grottoes.js?v=459",
    "./src/spell-slots.js?v=459",
    "./src/settlements.js?v=459",
    "./src/skirmishes.js?v=459",
    "./src/travelers.js?v=459",
    "./src/diagnostic-probe.js?v=459",
    "./src/questing-beast.js?v=459",
    "./src/recitations.js?v=459",
    "./src/lore.js?v=459",
    "./src/glimpses.js?v=459",
    "./src/glimpse-render.js?v=459",
    "./src/glimpse-paint.js?v=459",
    "./src/glimpse-scenes.js?v=459",
    "./src/glimpse-horror.js?v=459",
    "./src/glimpse-legend.js?v=459",
    "./src/glimpse-hand.js?v=459",
    "./src/atlas-view.js?v=459",
    "./src/strange.js?v=459",
    "./src/linked-dungeons.js?v=459",
    "./src/digging.js?v=459",
    "./src/building.js?v=459",
    "./src/refuge-lands.js?v=459",
    "./src/revenant-horde.js?v=459",
    "./src/stages.js?v=459",
    "./src/watcher.js?v=459",
    "./src/vehicle-gates.js?v=459",
    "./src/dungeon-ladder.js?v=459",
    "./src/potions.js?v=459",
    "./src/transit-lattice.js?v=459",
    "./src/late-spells.js?v=459",
    "./src/listener-mirror.js?v=459",
    "./src/hometowns.js?v=459",
    "./src/listener-arena.js?v=459",
    "./src/listener-morph.js?v=459",
    "./src/build-presets.js?v=459",
    "./src/smithy.js?v=459",
    "./src/ilse.js?v=459",
    "./src/bells.js?v=459",
    "./src/meals.js?v=459",
    "./src/margins.js?v=459",
    "./src/marginalia.js?v=459",
    "./src/tyrant-hunt.js?v=459",
    "./src/world-beasts.js?v=459",
    "./src/elders.js?v=459",
    "./src/far-array.js?v=459",
    "./src/combat-visuals.js?v=459",
    "./src/dungeon-framework.js?v=459",
    "./src/elites.js?v=459",
    "./src/random.js?v=459",
    "./src/types.js?v=459",
    "./src/story.js?v=459",
    "./src/foundry.js?v=459",
    "./src/world.js?v=459",
    "./src/deep-dungeons.js?v=459",
    "./src/scenes.js?v=459",
    "./src/arenas.js?v=459",
    "./src/items.js?v=459",
    "./src/combat.js?v=459",
    "./src/interactions.js?v=459",
    "./src/persistence.js?v=459",
    "./src/input.js?v=459",
    "./src/game.js?v=459",
    "./src/renderer.js?v=459",
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
