const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v489`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=489",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=489",
    "./src/proving-ground.js?v=489",
    "./src/proving-ground-fixtures.js?v=489",
    "./src/proving-ground-labs.js?v=489",
    "./src/dungeon-variation.js?v=489",
    "./src/dungeon-completion.js?v=489",
    "./src/enemy-patterns.js?v=489",
    "./src/monster-pack.js?v=489",
    "./src/monster-render.js?v=489",
    "./src/astral-worm.js?v=489",
    "./src/astral-worm-render.js?v=489",
    "./src/astral-worm-retreat.js?v=489",
    "./src/astral-worm-mount.js?v=489",
    "./src/lightning-giant-render.js?v=489",
    "./src/astral-encounters.js?v=489",
    "./src/astral-world-retreat.js?v=489",
    "./src/landscape.js?v=489",
    "./src/landscape-render.js?v=489",
    "./src/underlands.js?v=489",
    "./src/pattern-dungeons.js?v=489",
    "./src/relay-network.js?v=489",
    "./src/glyphs.js?v=489",
    "./src/echoes.js?v=489",
    "./src/constellation.js?v=489",
    "./src/water-traversal.js?v=489",
    "./src/open-sea.js?v=489",
    "./src/boats.js?v=489",
    "./src/sea-creatures.js?v=489",
    "./src/diving.js?v=489",
    "./src/grottoes.js?v=489",
    "./src/spell-slots.js?v=489",
    "./src/settlements.js?v=489",
    "./src/skirmishes.js?v=489",
    "./src/travelers.js?v=489",
    "./src/diagnostic-probe.js?v=489",
    "./src/questing-beast.js?v=489",
    "./src/recitations.js?v=489",
    "./src/lore.js?v=489",
    "./src/glimpses.js?v=489",
    "./src/glimpse-render.js?v=489",
    "./src/glimpse-paint.js?v=489",
    "./src/glimpse-scenes.js?v=489",
    "./src/glimpse-horror.js?v=489",
    "./src/glimpse-legend.js?v=489",
    "./src/glimpse-hand.js?v=489",
    "./src/atlas-view.js?v=489",
    "./src/strange.js?v=489",
    "./src/linked-dungeons.js?v=489",
    "./src/digging.js?v=489",
    "./src/building.js?v=489",
    "./src/refuge-lands.js?v=489",
    "./src/revenant-horde.js?v=489",
    "./src/stages.js?v=489",
    "./src/watcher.js?v=489",
    "./src/vehicle-gates.js?v=489",
    "./src/dungeon-ladder.js?v=489",
    "./src/potions.js?v=489",
    "./src/transit-lattice.js?v=489",
    "./src/late-spells.js?v=489",
    "./src/brawler-spells.js?v=489",
    "./src/orbit-volley.js?v=489",
    "./src/listener-mirror.js?v=489",
    "./src/hometowns.js?v=489",
    "./src/listener-arena.js?v=489",
    "./src/listener-morph.js?v=489",
    "./src/build-presets.js?v=489",
    "./src/smithy.js?v=489",
    "./src/ilse.js?v=489",
    "./src/bells.js?v=489",
    "./src/meals.js?v=489",
    "./src/margins.js?v=489",
    "./src/marginalia.js?v=489",
    "./src/tyrant-hunt.js?v=489",
    "./src/world-beasts.js?v=489",
    "./src/elders.js?v=489",
    "./src/far-array.js?v=489",
    "./src/combat-visuals.js?v=489",
    "./src/dungeon-framework.js?v=489",
    "./src/elites.js?v=489",
    "./src/random.js?v=489",
    "./src/types.js?v=489",
    "./src/story.js?v=489",
    "./src/foundry.js?v=489",
    "./src/world.js?v=489",
    "./src/deep-dungeons.js?v=489",
    "./src/scenes.js?v=489",
    "./src/arenas.js?v=489",
    "./src/items.js?v=489",
    "./src/combat.js?v=489",
    "./src/interactions.js?v=489",
    "./src/persistence.js?v=489",
    "./src/input.js?v=489",
    "./src/game.js?v=489",
    "./src/renderer.js?v=489",
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
