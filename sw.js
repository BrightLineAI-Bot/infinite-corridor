const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r515-bf3734f5bbc0`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r515-bf3734f5bbc0",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r515-bf3734f5bbc0",
    "./src/proving-ground.js?v=r515-bf3734f5bbc0",
    "./src/proving-ground-fixtures.js?v=r515-bf3734f5bbc0",
    "./src/proving-ground-labs.js?v=r515-bf3734f5bbc0",
    "./src/dungeon-variation.js?v=r515-bf3734f5bbc0",
    "./src/dungeon-completion.js?v=r515-bf3734f5bbc0",
    "./src/enemy-patterns.js?v=r515-bf3734f5bbc0",
    "./src/monster-pack.js?v=r515-bf3734f5bbc0",
    "./src/monster-render.js?v=r515-bf3734f5bbc0",
    "./src/astral-worm.js?v=r515-bf3734f5bbc0",
    "./src/astral-worm-render.js?v=r515-bf3734f5bbc0",
    "./src/astral-worm-retreat.js?v=r515-bf3734f5bbc0",
    "./src/astral-worm-mount.js?v=r515-bf3734f5bbc0",
    "./src/lightning-giant-render.js?v=r515-bf3734f5bbc0",
    "./src/astral-encounters.js?v=r515-bf3734f5bbc0",
    "./src/astral-world-retreat.js?v=r515-bf3734f5bbc0",
    "./src/landscape.js?v=r515-bf3734f5bbc0",
    "./src/landscape-render.js?v=r515-bf3734f5bbc0",
    "./src/underlands.js?v=r515-bf3734f5bbc0",
    "./src/pattern-dungeons.js?v=r515-bf3734f5bbc0",
    "./src/relay-network.js?v=r515-bf3734f5bbc0",
    "./src/glyphs.js?v=r515-bf3734f5bbc0",
    "./src/echoes.js?v=r515-bf3734f5bbc0",
    "./src/constellation.js?v=r515-bf3734f5bbc0",
    "./src/water-traversal.js?v=r515-bf3734f5bbc0",
    "./src/open-sea.js?v=r515-bf3734f5bbc0",
    "./src/boats.js?v=r515-bf3734f5bbc0",
    "./src/sea-creatures.js?v=r515-bf3734f5bbc0",
    "./src/diving.js?v=r515-bf3734f5bbc0",
    "./src/grottoes.js?v=r515-bf3734f5bbc0",
    "./src/spell-slots.js?v=r515-bf3734f5bbc0",
    "./src/settlements.js?v=r515-bf3734f5bbc0",
    "./src/skirmishes.js?v=r515-bf3734f5bbc0",
    "./src/travelers.js?v=r515-bf3734f5bbc0",
    "./src/diagnostic-probe.js?v=r515-bf3734f5bbc0",
    "./src/questing-beast.js?v=r515-bf3734f5bbc0",
    "./src/recitations.js?v=r515-bf3734f5bbc0",
    "./src/lore.js?v=r515-bf3734f5bbc0",
    "./src/glimpses.js?v=r515-bf3734f5bbc0",
    "./src/glimpse-render.js?v=r515-bf3734f5bbc0",
    "./src/glimpse-paint.js?v=r515-bf3734f5bbc0",
    "./src/glimpse-scenes.js?v=r515-bf3734f5bbc0",
    "./src/glimpse-horror.js?v=r515-bf3734f5bbc0",
    "./src/glimpse-legend.js?v=r515-bf3734f5bbc0",
    "./src/glimpse-hand.js?v=r515-bf3734f5bbc0",
    "./src/atlas-view.js?v=r515-bf3734f5bbc0",
    "./src/strange.js?v=r515-bf3734f5bbc0",
    "./src/linked-dungeons.js?v=r515-bf3734f5bbc0",
    "./src/digging.js?v=r515-bf3734f5bbc0",
    "./src/building.js?v=r515-bf3734f5bbc0",
    "./src/refuge-lands.js?v=r515-bf3734f5bbc0",
    "./src/revenant-horde.js?v=r515-bf3734f5bbc0",
    "./src/stages.js?v=r515-bf3734f5bbc0",
    "./src/watcher.js?v=r515-bf3734f5bbc0",
    "./src/vehicle-gates.js?v=r515-bf3734f5bbc0",
    "./src/dungeon-ladder.js?v=r515-bf3734f5bbc0",
    "./src/potions.js?v=r515-bf3734f5bbc0",
    "./src/transit-lattice.js?v=r515-bf3734f5bbc0",
    "./src/late-spells.js?v=r515-bf3734f5bbc0",
    "./src/brawler-spells.js?v=r515-bf3734f5bbc0",
    "./src/orbit-volley.js?v=r515-bf3734f5bbc0",
    "./src/surveyor.js?v=r515-bf3734f5bbc0",
    "./src/lattice-fields.js?v=r515-bf3734f5bbc0",
    "./src/listener-mirror.js?v=r515-bf3734f5bbc0",
    "./src/hometowns.js?v=r515-bf3734f5bbc0",
    "./src/listener-arena.js?v=r515-bf3734f5bbc0",
    "./src/listener-morph.js?v=r515-bf3734f5bbc0",
    "./src/build-presets.js?v=r515-bf3734f5bbc0",
    "./src/smithy.js?v=r515-bf3734f5bbc0",
    "./src/ilse.js?v=r515-bf3734f5bbc0",
    "./src/bells.js?v=r515-bf3734f5bbc0",
    "./src/meals.js?v=r515-bf3734f5bbc0",
    "./src/margins.js?v=r515-bf3734f5bbc0",
    "./src/marginalia.js?v=r515-bf3734f5bbc0",
    "./src/tyrant-hunt.js?v=r515-bf3734f5bbc0",
    "./src/world-beasts.js?v=r515-bf3734f5bbc0",
    "./src/elders.js?v=r515-bf3734f5bbc0",
    "./src/far-array.js?v=r515-bf3734f5bbc0",
    "./src/combat-visuals.js?v=r515-bf3734f5bbc0",
    "./src/dungeon-framework.js?v=r515-bf3734f5bbc0",
    "./src/elites.js?v=r515-bf3734f5bbc0",
    "./src/random.js?v=r515-bf3734f5bbc0",
    "./src/types.js?v=r515-bf3734f5bbc0",
    "./src/story.js?v=r515-bf3734f5bbc0",
    "./src/foundry.js?v=r515-bf3734f5bbc0",
    "./src/world.js?v=r515-bf3734f5bbc0",
    "./src/deep-dungeons.js?v=r515-bf3734f5bbc0",
    "./src/scenes.js?v=r515-bf3734f5bbc0",
    "./src/arenas.js?v=r515-bf3734f5bbc0",
    "./src/items.js?v=r515-bf3734f5bbc0",
    "./src/combat.js?v=r515-bf3734f5bbc0",
    "./src/interactions.js?v=r515-bf3734f5bbc0",
    "./src/persistence.js?v=r515-bf3734f5bbc0",
    "./src/input.js?v=r515-bf3734f5bbc0",
    "./src/game.js?v=r515-bf3734f5bbc0",
    "./src/renderer.js?v=r515-bf3734f5bbc0",
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
