const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v517`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=517",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=517",
    "./src/proving-ground.js?v=517",
    "./src/proving-ground-fixtures.js?v=517",
    "./src/proving-ground-labs.js?v=517",
    "./src/dungeon-variation.js?v=517",
    "./src/dungeon-completion.js?v=517",
    "./src/enemy-patterns.js?v=517",
    "./src/monster-pack.js?v=517",
    "./src/monster-render.js?v=517",
    "./src/astral-worm.js?v=517",
    "./src/astral-worm-render.js?v=517",
    "./src/astral-worm-retreat.js?v=517",
    "./src/astral-worm-mount.js?v=517",
    "./src/lightning-giant-render.js?v=517",
    "./src/astral-encounters.js?v=517",
    "./src/astral-world-retreat.js?v=517",
    "./src/landscape.js?v=517",
    "./src/landscape-render.js?v=517",
    "./src/underlands.js?v=517",
    "./src/pattern-dungeons.js?v=517",
    "./src/relay-network.js?v=517",
    "./src/glyphs.js?v=517",
    "./src/echoes.js?v=517",
    "./src/constellation.js?v=517",
    "./src/water-traversal.js?v=517",
    "./src/open-sea.js?v=517",
    "./src/boats.js?v=517",
    "./src/sea-creatures.js?v=517",
    "./src/diving.js?v=517",
    "./src/grottoes.js?v=517",
    "./src/spell-slots.js?v=517",
    "./src/settlements.js?v=517",
    "./src/skirmishes.js?v=517",
    "./src/travelers.js?v=517",
    "./src/diagnostic-probe.js?v=517",
    "./src/questing-beast.js?v=517",
    "./src/recitations.js?v=517",
    "./src/lore.js?v=517",
    "./src/glimpses.js?v=517",
    "./src/glimpse-render.js?v=517",
    "./src/glimpse-paint.js?v=517",
    "./src/glimpse-scenes.js?v=517",
    "./src/glimpse-horror.js?v=517",
    "./src/glimpse-legend.js?v=517",
    "./src/glimpse-hand.js?v=517",
    "./src/atlas-view.js?v=517",
    "./src/strange.js?v=517",
    "./src/linked-dungeons.js?v=517",
    "./src/digging.js?v=517",
    "./src/building.js?v=517",
    "./src/refuge-lands.js?v=517",
    "./src/revenant-horde.js?v=517",
    "./src/stages.js?v=517",
    "./src/watcher.js?v=517",
    "./src/vehicle-gates.js?v=517",
    "./src/dungeon-ladder.js?v=517",
    "./src/potions.js?v=517",
    "./src/transit-lattice.js?v=517",
    "./src/late-spells.js?v=517",
    "./src/brawler-spells.js?v=517",
    "./src/orbit-volley.js?v=517",
    "./src/surveyor.js?v=517",
    "./src/lattice-fields.js?v=517",
    "./src/listener-mirror.js?v=517",
    "./src/hometowns.js?v=517",
    "./src/listener-arena.js?v=517",
    "./src/listener-morph.js?v=517",
    "./src/build-presets.js?v=517",
    "./src/smithy.js?v=517",
    "./src/ilse.js?v=517",
    "./src/bells.js?v=517",
    "./src/meals.js?v=517",
    "./src/margins.js?v=517",
    "./src/marginalia.js?v=517",
    "./src/tyrant-hunt.js?v=517",
    "./src/world-beasts.js?v=517",
    "./src/elders.js?v=517",
    "./src/far-array.js?v=517",
    "./src/combat-visuals.js?v=517",
    "./src/dungeon-framework.js?v=517",
    "./src/elites.js?v=517",
    "./src/random.js?v=517",
    "./src/types.js?v=517",
    "./src/story.js?v=517",
    "./src/foundry.js?v=517",
    "./src/world.js?v=517",
    "./src/deep-dungeons.js?v=517",
    "./src/scenes.js?v=517",
    "./src/arenas.js?v=517",
    "./src/items.js?v=517",
    "./src/combat.js?v=517",
    "./src/interactions.js?v=517",
    "./src/persistence.js?v=517",
    "./src/input.js?v=517",
    "./src/game.js?v=517",
    "./src/renderer.js?v=517",
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
