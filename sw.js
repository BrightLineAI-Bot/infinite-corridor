const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v497`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=497",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=497",
    "./src/proving-ground.js?v=497",
    "./src/proving-ground-fixtures.js?v=497",
    "./src/proving-ground-labs.js?v=497",
    "./src/dungeon-variation.js?v=497",
    "./src/dungeon-completion.js?v=497",
    "./src/enemy-patterns.js?v=497",
    "./src/monster-pack.js?v=497",
    "./src/monster-render.js?v=497",
    "./src/astral-worm.js?v=497",
    "./src/astral-worm-render.js?v=497",
    "./src/astral-worm-retreat.js?v=497",
    "./src/astral-worm-mount.js?v=497",
    "./src/lightning-giant-render.js?v=497",
    "./src/astral-encounters.js?v=497",
    "./src/astral-world-retreat.js?v=497",
    "./src/landscape.js?v=497",
    "./src/landscape-render.js?v=497",
    "./src/underlands.js?v=497",
    "./src/pattern-dungeons.js?v=497",
    "./src/relay-network.js?v=497",
    "./src/glyphs.js?v=497",
    "./src/echoes.js?v=497",
    "./src/constellation.js?v=497",
    "./src/water-traversal.js?v=497",
    "./src/open-sea.js?v=497",
    "./src/boats.js?v=497",
    "./src/sea-creatures.js?v=497",
    "./src/diving.js?v=497",
    "./src/grottoes.js?v=497",
    "./src/spell-slots.js?v=497",
    "./src/settlements.js?v=497",
    "./src/skirmishes.js?v=497",
    "./src/travelers.js?v=497",
    "./src/diagnostic-probe.js?v=497",
    "./src/questing-beast.js?v=497",
    "./src/recitations.js?v=497",
    "./src/lore.js?v=497",
    "./src/glimpses.js?v=497",
    "./src/glimpse-render.js?v=497",
    "./src/glimpse-paint.js?v=497",
    "./src/glimpse-scenes.js?v=497",
    "./src/glimpse-horror.js?v=497",
    "./src/glimpse-legend.js?v=497",
    "./src/glimpse-hand.js?v=497",
    "./src/atlas-view.js?v=497",
    "./src/strange.js?v=497",
    "./src/linked-dungeons.js?v=497",
    "./src/digging.js?v=497",
    "./src/building.js?v=497",
    "./src/refuge-lands.js?v=497",
    "./src/revenant-horde.js?v=497",
    "./src/stages.js?v=497",
    "./src/watcher.js?v=497",
    "./src/vehicle-gates.js?v=497",
    "./src/dungeon-ladder.js?v=497",
    "./src/potions.js?v=497",
    "./src/transit-lattice.js?v=497",
    "./src/late-spells.js?v=497",
    "./src/brawler-spells.js?v=497",
    "./src/orbit-volley.js?v=497",
    "./src/listener-mirror.js?v=497",
    "./src/hometowns.js?v=497",
    "./src/listener-arena.js?v=497",
    "./src/listener-morph.js?v=497",
    "./src/build-presets.js?v=497",
    "./src/smithy.js?v=497",
    "./src/ilse.js?v=497",
    "./src/bells.js?v=497",
    "./src/meals.js?v=497",
    "./src/margins.js?v=497",
    "./src/marginalia.js?v=497",
    "./src/tyrant-hunt.js?v=497",
    "./src/world-beasts.js?v=497",
    "./src/elders.js?v=497",
    "./src/far-array.js?v=497",
    "./src/combat-visuals.js?v=497",
    "./src/dungeon-framework.js?v=497",
    "./src/elites.js?v=497",
    "./src/random.js?v=497",
    "./src/types.js?v=497",
    "./src/story.js?v=497",
    "./src/foundry.js?v=497",
    "./src/world.js?v=497",
    "./src/deep-dungeons.js?v=497",
    "./src/scenes.js?v=497",
    "./src/arenas.js?v=497",
    "./src/items.js?v=497",
    "./src/combat.js?v=497",
    "./src/interactions.js?v=497",
    "./src/persistence.js?v=497",
    "./src/input.js?v=497",
    "./src/game.js?v=497",
    "./src/renderer.js?v=497",
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
