const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v519`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=519",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=519",
    "./src/proving-ground.js?v=519",
    "./src/proving-ground-fixtures.js?v=519",
    "./src/proving-ground-labs.js?v=519",
    "./src/dungeon-variation.js?v=519",
    "./src/dungeon-completion.js?v=519",
    "./src/enemy-patterns.js?v=519",
    "./src/monster-pack.js?v=519",
    "./src/monster-render.js?v=519",
    "./src/astral-worm.js?v=519",
    "./src/astral-worm-render.js?v=519",
    "./src/astral-worm-retreat.js?v=519",
    "./src/astral-worm-mount.js?v=519",
    "./src/lightning-giant-render.js?v=519",
    "./src/astral-encounters.js?v=519",
    "./src/astral-world-retreat.js?v=519",
    "./src/landscape.js?v=519",
    "./src/landscape-render.js?v=519",
    "./src/underlands.js?v=519",
    "./src/pattern-dungeons.js?v=519",
    "./src/relay-network.js?v=519",
    "./src/glyphs.js?v=519",
    "./src/echoes.js?v=519",
    "./src/constellation.js?v=519",
    "./src/water-traversal.js?v=519",
    "./src/open-sea.js?v=519",
    "./src/boats.js?v=519",
    "./src/sea-creatures.js?v=519",
    "./src/diving.js?v=519",
    "./src/grottoes.js?v=519",
    "./src/spell-slots.js?v=519",
    "./src/settlements.js?v=519",
    "./src/skirmishes.js?v=519",
    "./src/travelers.js?v=519",
    "./src/diagnostic-probe.js?v=519",
    "./src/questing-beast.js?v=519",
    "./src/recitations.js?v=519",
    "./src/lore.js?v=519",
    "./src/glimpses.js?v=519",
    "./src/glimpse-render.js?v=519",
    "./src/glimpse-paint.js?v=519",
    "./src/glimpse-scenes.js?v=519",
    "./src/glimpse-horror.js?v=519",
    "./src/glimpse-legend.js?v=519",
    "./src/glimpse-hand.js?v=519",
    "./src/atlas-view.js?v=519",
    "./src/strange.js?v=519",
    "./src/linked-dungeons.js?v=519",
    "./src/digging.js?v=519",
    "./src/building.js?v=519",
    "./src/refuge-lands.js?v=519",
    "./src/revenant-horde.js?v=519",
    "./src/stages.js?v=519",
    "./src/watcher.js?v=519",
    "./src/vehicle-gates.js?v=519",
    "./src/dungeon-ladder.js?v=519",
    "./src/potions.js?v=519",
    "./src/transit-lattice.js?v=519",
    "./src/late-spells.js?v=519",
    "./src/brawler-spells.js?v=519",
    "./src/orbit-volley.js?v=519",
    "./src/surveyor.js?v=519",
    "./src/lattice-fields.js?v=519",
    "./src/listener-mirror.js?v=519",
    "./src/hometowns.js?v=519",
    "./src/listener-arena.js?v=519",
    "./src/listener-morph.js?v=519",
    "./src/build-presets.js?v=519",
    "./src/smithy.js?v=519",
    "./src/ilse.js?v=519",
    "./src/bells.js?v=519",
    "./src/meals.js?v=519",
    "./src/margins.js?v=519",
    "./src/marginalia.js?v=519",
    "./src/tyrant-hunt.js?v=519",
    "./src/world-beasts.js?v=519",
    "./src/elders.js?v=519",
    "./src/far-array.js?v=519",
    "./src/combat-visuals.js?v=519",
    "./src/dungeon-framework.js?v=519",
    "./src/elites.js?v=519",
    "./src/random.js?v=519",
    "./src/types.js?v=519",
    "./src/story.js?v=519",
    "./src/foundry.js?v=519",
    "./src/world.js?v=519",
    "./src/deep-dungeons.js?v=519",
    "./src/scenes.js?v=519",
    "./src/arenas.js?v=519",
    "./src/items.js?v=519",
    "./src/combat.js?v=519",
    "./src/interactions.js?v=519",
    "./src/persistence.js?v=519",
    "./src/input.js?v=519",
    "./src/game.js?v=519",
    "./src/renderer.js?v=519",
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
