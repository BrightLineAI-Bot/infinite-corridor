const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v531`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=531",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=531",
    "./src/proving-ground.js?v=531",
    "./src/proving-ground-fixtures.js?v=531",
    "./src/proving-ground-labs.js?v=531",
    "./src/dungeon-variation.js?v=531",
    "./src/dungeon-completion.js?v=531",
    "./src/enemy-patterns.js?v=531",
    "./src/monster-pack.js?v=531",
    "./src/monster-render.js?v=531",
    "./src/astral-worm.js?v=531",
    "./src/astral-worm-render.js?v=531",
    "./src/astral-worm-retreat.js?v=531",
    "./src/astral-worm-mount.js?v=531",
    "./src/lightning-giant-render.js?v=531",
    "./src/astral-encounters.js?v=531",
    "./src/astral-world-retreat.js?v=531",
    "./src/landscape.js?v=531",
    "./src/landscape-render.js?v=531",
    "./src/underlands.js?v=531",
    "./src/pattern-dungeons.js?v=531",
    "./src/relay-network.js?v=531",
    "./src/glyphs.js?v=531",
    "./src/echoes.js?v=531",
    "./src/constellation.js?v=531",
    "./src/water-traversal.js?v=531",
    "./src/open-sea.js?v=531",
    "./src/boats.js?v=531",
    "./src/sea-creatures.js?v=531",
    "./src/diving.js?v=531",
    "./src/grottoes.js?v=531",
    "./src/spell-slots.js?v=531",
    "./src/settlements.js?v=531",
    "./src/skirmishes.js?v=531",
    "./src/travelers.js?v=531",
    "./src/diagnostic-probe.js?v=531",
    "./src/questing-beast.js?v=531",
    "./src/recitations.js?v=531",
    "./src/lore.js?v=531",
    "./src/glimpses.js?v=531",
    "./src/glimpse-render.js?v=531",
    "./src/glimpse-paint.js?v=531",
    "./src/glimpse-scenes.js?v=531",
    "./src/glimpse-horror.js?v=531",
    "./src/glimpse-legend.js?v=531",
    "./src/glimpse-hand.js?v=531",
    "./src/atlas-view.js?v=531",
    "./src/strange.js?v=531",
    "./src/linked-dungeons.js?v=531",
    "./src/digging.js?v=531",
    "./src/building.js?v=531",
    "./src/refuge-lands.js?v=531",
    "./src/revenant-horde.js?v=531",
    "./src/stages.js?v=531",
    "./src/watcher.js?v=531",
    "./src/vehicle-gates.js?v=531",
    "./src/dungeon-ladder.js?v=531",
    "./src/potions.js?v=531",
    "./src/transit-lattice.js?v=531",
    "./src/late-spells.js?v=531",
    "./src/brawler-spells.js?v=531",
    "./src/orbit-volley.js?v=531",
    "./src/surveyor.js?v=531",
    "./src/lattice-fields.js?v=531",
    "./src/dungeon-traps.js?v=531",
    "./src/listener-mirror.js?v=531",
    "./src/hometowns.js?v=531",
    "./src/listener-arena.js?v=531",
    "./src/listener-morph.js?v=531",
    "./src/build-presets.js?v=531",
    "./src/smithy.js?v=531",
    "./src/ilse.js?v=531",
    "./src/bells.js?v=531",
    "./src/meals.js?v=531",
    "./src/margins.js?v=531",
    "./src/marginalia.js?v=531",
    "./src/tyrant-hunt.js?v=531",
    "./src/world-beasts.js?v=531",
    "./src/elders.js?v=531",
    "./src/far-array.js?v=531",
    "./src/combat-visuals.js?v=531",
    "./src/dungeon-framework.js?v=531",
    "./src/elites.js?v=531",
    "./src/random.js?v=531",
    "./src/types.js?v=531",
    "./src/story.js?v=531",
    "./src/foundry.js?v=531",
    "./src/world.js?v=531",
    "./src/deep-dungeons.js?v=531",
    "./src/scenes.js?v=531",
    "./src/arenas.js?v=531",
    "./src/items.js?v=531",
    "./src/combat.js?v=531",
    "./src/interactions.js?v=531",
    "./src/persistence.js?v=531",
    "./src/input.js?v=531",
    "./src/game.js?v=531",
    "./src/renderer.js?v=531",
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
