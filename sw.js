const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v501`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=501",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=501",
    "./src/proving-ground.js?v=501",
    "./src/proving-ground-fixtures.js?v=501",
    "./src/proving-ground-labs.js?v=501",
    "./src/dungeon-variation.js?v=501",
    "./src/dungeon-completion.js?v=501",
    "./src/enemy-patterns.js?v=501",
    "./src/monster-pack.js?v=501",
    "./src/monster-render.js?v=501",
    "./src/astral-worm.js?v=501",
    "./src/astral-worm-render.js?v=501",
    "./src/astral-worm-retreat.js?v=501",
    "./src/astral-worm-mount.js?v=501",
    "./src/lightning-giant-render.js?v=501",
    "./src/astral-encounters.js?v=501",
    "./src/astral-world-retreat.js?v=501",
    "./src/landscape.js?v=501",
    "./src/landscape-render.js?v=501",
    "./src/underlands.js?v=501",
    "./src/pattern-dungeons.js?v=501",
    "./src/relay-network.js?v=501",
    "./src/glyphs.js?v=501",
    "./src/echoes.js?v=501",
    "./src/constellation.js?v=501",
    "./src/water-traversal.js?v=501",
    "./src/open-sea.js?v=501",
    "./src/boats.js?v=501",
    "./src/sea-creatures.js?v=501",
    "./src/diving.js?v=501",
    "./src/grottoes.js?v=501",
    "./src/spell-slots.js?v=501",
    "./src/settlements.js?v=501",
    "./src/skirmishes.js?v=501",
    "./src/travelers.js?v=501",
    "./src/diagnostic-probe.js?v=501",
    "./src/questing-beast.js?v=501",
    "./src/recitations.js?v=501",
    "./src/lore.js?v=501",
    "./src/glimpses.js?v=501",
    "./src/glimpse-render.js?v=501",
    "./src/glimpse-paint.js?v=501",
    "./src/glimpse-scenes.js?v=501",
    "./src/glimpse-horror.js?v=501",
    "./src/glimpse-legend.js?v=501",
    "./src/glimpse-hand.js?v=501",
    "./src/atlas-view.js?v=501",
    "./src/strange.js?v=501",
    "./src/linked-dungeons.js?v=501",
    "./src/digging.js?v=501",
    "./src/building.js?v=501",
    "./src/refuge-lands.js?v=501",
    "./src/revenant-horde.js?v=501",
    "./src/stages.js?v=501",
    "./src/watcher.js?v=501",
    "./src/vehicle-gates.js?v=501",
    "./src/dungeon-ladder.js?v=501",
    "./src/potions.js?v=501",
    "./src/transit-lattice.js?v=501",
    "./src/late-spells.js?v=501",
    "./src/brawler-spells.js?v=501",
    "./src/orbit-volley.js?v=501",
    "./src/listener-mirror.js?v=501",
    "./src/hometowns.js?v=501",
    "./src/listener-arena.js?v=501",
    "./src/listener-morph.js?v=501",
    "./src/build-presets.js?v=501",
    "./src/smithy.js?v=501",
    "./src/ilse.js?v=501",
    "./src/bells.js?v=501",
    "./src/meals.js?v=501",
    "./src/margins.js?v=501",
    "./src/marginalia.js?v=501",
    "./src/tyrant-hunt.js?v=501",
    "./src/world-beasts.js?v=501",
    "./src/elders.js?v=501",
    "./src/far-array.js?v=501",
    "./src/combat-visuals.js?v=501",
    "./src/dungeon-framework.js?v=501",
    "./src/elites.js?v=501",
    "./src/random.js?v=501",
    "./src/types.js?v=501",
    "./src/story.js?v=501",
    "./src/foundry.js?v=501",
    "./src/world.js?v=501",
    "./src/deep-dungeons.js?v=501",
    "./src/scenes.js?v=501",
    "./src/arenas.js?v=501",
    "./src/items.js?v=501",
    "./src/combat.js?v=501",
    "./src/interactions.js?v=501",
    "./src/persistence.js?v=501",
    "./src/input.js?v=501",
    "./src/game.js?v=501",
    "./src/renderer.js?v=501",
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
