const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v513`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=513",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=513",
    "./src/proving-ground.js?v=513",
    "./src/proving-ground-fixtures.js?v=513",
    "./src/proving-ground-labs.js?v=513",
    "./src/dungeon-variation.js?v=513",
    "./src/dungeon-completion.js?v=513",
    "./src/enemy-patterns.js?v=513",
    "./src/monster-pack.js?v=513",
    "./src/monster-render.js?v=513",
    "./src/astral-worm.js?v=513",
    "./src/astral-worm-render.js?v=513",
    "./src/astral-worm-retreat.js?v=513",
    "./src/astral-worm-mount.js?v=513",
    "./src/lightning-giant-render.js?v=513",
    "./src/astral-encounters.js?v=513",
    "./src/astral-world-retreat.js?v=513",
    "./src/landscape.js?v=513",
    "./src/landscape-render.js?v=513",
    "./src/underlands.js?v=513",
    "./src/pattern-dungeons.js?v=513",
    "./src/relay-network.js?v=513",
    "./src/glyphs.js?v=513",
    "./src/echoes.js?v=513",
    "./src/constellation.js?v=513",
    "./src/water-traversal.js?v=513",
    "./src/open-sea.js?v=513",
    "./src/boats.js?v=513",
    "./src/sea-creatures.js?v=513",
    "./src/diving.js?v=513",
    "./src/grottoes.js?v=513",
    "./src/spell-slots.js?v=513",
    "./src/settlements.js?v=513",
    "./src/skirmishes.js?v=513",
    "./src/travelers.js?v=513",
    "./src/diagnostic-probe.js?v=513",
    "./src/questing-beast.js?v=513",
    "./src/recitations.js?v=513",
    "./src/lore.js?v=513",
    "./src/glimpses.js?v=513",
    "./src/glimpse-render.js?v=513",
    "./src/glimpse-paint.js?v=513",
    "./src/glimpse-scenes.js?v=513",
    "./src/glimpse-horror.js?v=513",
    "./src/glimpse-legend.js?v=513",
    "./src/glimpse-hand.js?v=513",
    "./src/atlas-view.js?v=513",
    "./src/strange.js?v=513",
    "./src/linked-dungeons.js?v=513",
    "./src/digging.js?v=513",
    "./src/building.js?v=513",
    "./src/refuge-lands.js?v=513",
    "./src/revenant-horde.js?v=513",
    "./src/stages.js?v=513",
    "./src/watcher.js?v=513",
    "./src/vehicle-gates.js?v=513",
    "./src/dungeon-ladder.js?v=513",
    "./src/potions.js?v=513",
    "./src/transit-lattice.js?v=513",
    "./src/late-spells.js?v=513",
    "./src/brawler-spells.js?v=513",
    "./src/orbit-volley.js?v=513",
    "./src/surveyor.js?v=513",
    "./src/listener-mirror.js?v=513",
    "./src/hometowns.js?v=513",
    "./src/listener-arena.js?v=513",
    "./src/listener-morph.js?v=513",
    "./src/build-presets.js?v=513",
    "./src/smithy.js?v=513",
    "./src/ilse.js?v=513",
    "./src/bells.js?v=513",
    "./src/meals.js?v=513",
    "./src/margins.js?v=513",
    "./src/marginalia.js?v=513",
    "./src/tyrant-hunt.js?v=513",
    "./src/world-beasts.js?v=513",
    "./src/elders.js?v=513",
    "./src/far-array.js?v=513",
    "./src/combat-visuals.js?v=513",
    "./src/dungeon-framework.js?v=513",
    "./src/elites.js?v=513",
    "./src/random.js?v=513",
    "./src/types.js?v=513",
    "./src/story.js?v=513",
    "./src/foundry.js?v=513",
    "./src/world.js?v=513",
    "./src/deep-dungeons.js?v=513",
    "./src/scenes.js?v=513",
    "./src/arenas.js?v=513",
    "./src/items.js?v=513",
    "./src/combat.js?v=513",
    "./src/interactions.js?v=513",
    "./src/persistence.js?v=513",
    "./src/input.js?v=513",
    "./src/game.js?v=513",
    "./src/renderer.js?v=513",
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
