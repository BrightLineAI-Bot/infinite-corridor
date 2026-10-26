const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v461`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=461",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=461",
    "./src/proving-ground.js?v=461",
    "./src/proving-ground-fixtures.js?v=461",
    "./src/proving-ground-labs.js?v=461",
    "./src/dungeon-variation.js?v=461",
    "./src/dungeon-completion.js?v=461",
    "./src/enemy-patterns.js?v=461",
    "./src/monster-pack.js?v=461",
    "./src/monster-render.js?v=461",
    "./src/astral-worm.js?v=461",
    "./src/astral-worm-render.js?v=461",
    "./src/astral-worm-retreat.js?v=461",
    "./src/astral-worm-mount.js?v=461",
    "./src/lightning-giant-render.js?v=461",
    "./src/astral-encounters.js?v=461",
    "./src/astral-world-retreat.js?v=461",
    "./src/landscape.js?v=461",
    "./src/landscape-render.js?v=461",
    "./src/underlands.js?v=461",
    "./src/pattern-dungeons.js?v=461",
    "./src/relay-network.js?v=461",
    "./src/glyphs.js?v=461",
    "./src/echoes.js?v=461",
    "./src/constellation.js?v=461",
    "./src/water-traversal.js?v=461",
    "./src/open-sea.js?v=461",
    "./src/boats.js?v=461",
    "./src/sea-creatures.js?v=461",
    "./src/diving.js?v=461",
    "./src/grottoes.js?v=461",
    "./src/spell-slots.js?v=461",
    "./src/settlements.js?v=461",
    "./src/skirmishes.js?v=461",
    "./src/travelers.js?v=461",
    "./src/diagnostic-probe.js?v=461",
    "./src/questing-beast.js?v=461",
    "./src/recitations.js?v=461",
    "./src/lore.js?v=461",
    "./src/glimpses.js?v=461",
    "./src/glimpse-render.js?v=461",
    "./src/glimpse-paint.js?v=461",
    "./src/glimpse-scenes.js?v=461",
    "./src/glimpse-horror.js?v=461",
    "./src/glimpse-legend.js?v=461",
    "./src/glimpse-hand.js?v=461",
    "./src/atlas-view.js?v=461",
    "./src/strange.js?v=461",
    "./src/linked-dungeons.js?v=461",
    "./src/digging.js?v=461",
    "./src/building.js?v=461",
    "./src/refuge-lands.js?v=461",
    "./src/revenant-horde.js?v=461",
    "./src/stages.js?v=461",
    "./src/watcher.js?v=461",
    "./src/vehicle-gates.js?v=461",
    "./src/dungeon-ladder.js?v=461",
    "./src/potions.js?v=461",
    "./src/transit-lattice.js?v=461",
    "./src/late-spells.js?v=461",
    "./src/listener-mirror.js?v=461",
    "./src/hometowns.js?v=461",
    "./src/listener-arena.js?v=461",
    "./src/listener-morph.js?v=461",
    "./src/build-presets.js?v=461",
    "./src/smithy.js?v=461",
    "./src/ilse.js?v=461",
    "./src/bells.js?v=461",
    "./src/meals.js?v=461",
    "./src/margins.js?v=461",
    "./src/marginalia.js?v=461",
    "./src/tyrant-hunt.js?v=461",
    "./src/world-beasts.js?v=461",
    "./src/elders.js?v=461",
    "./src/far-array.js?v=461",
    "./src/combat-visuals.js?v=461",
    "./src/dungeon-framework.js?v=461",
    "./src/elites.js?v=461",
    "./src/random.js?v=461",
    "./src/types.js?v=461",
    "./src/story.js?v=461",
    "./src/foundry.js?v=461",
    "./src/world.js?v=461",
    "./src/deep-dungeons.js?v=461",
    "./src/scenes.js?v=461",
    "./src/arenas.js?v=461",
    "./src/items.js?v=461",
    "./src/combat.js?v=461",
    "./src/interactions.js?v=461",
    "./src/persistence.js?v=461",
    "./src/input.js?v=461",
    "./src/game.js?v=461",
    "./src/renderer.js?v=461",
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
