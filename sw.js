const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v365`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=365",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=365",
    "./src/proving-ground.js?v=365",
    "./src/proving-ground-fixtures.js?v=365",
    "./src/proving-ground-labs.js?v=365",
    "./src/dungeon-variation.js?v=365",
    "./src/dungeon-completion.js?v=365",
    "./src/enemy-patterns.js?v=365",
    "./src/monster-pack.js?v=365",
    "./src/monster-render.js?v=365",
    "./src/astral-worm.js?v=365",
    "./src/astral-worm-render.js?v=365",
    "./src/astral-worm-retreat.js?v=365",
    "./src/astral-worm-mount.js?v=365",
    "./src/lightning-giant-render.js?v=365",
    "./src/astral-encounters.js?v=365",
    "./src/astral-world-retreat.js?v=365",
    "./src/landscape.js?v=365",
    "./src/landscape-render.js?v=365",
    "./src/underlands.js?v=365",
    "./src/pattern-dungeons.js?v=365",
    "./src/relay-network.js?v=365",
    "./src/glyphs.js?v=365",
    "./src/echoes.js?v=365",
    "./src/constellation.js?v=365",
    "./src/water-traversal.js?v=365",
    "./src/open-sea.js?v=365",
    "./src/boats.js?v=365",
    "./src/sea-creatures.js?v=365",
    "./src/diving.js?v=365",
    "./src/grottoes.js?v=365",
    "./src/spell-slots.js?v=365",
    "./src/settlements.js?v=365",
    "./src/skirmishes.js?v=365",
    "./src/travelers.js?v=365",
    "./src/diagnostic-probe.js?v=365",
    "./src/questing-beast.js?v=365",
    "./src/recitations.js?v=365",
    "./src/lore.js?v=365",
    "./src/glimpses.js?v=365",
    "./src/glimpse-render.js?v=365",
    "./src/glimpse-paint.js?v=365",
    "./src/glimpse-scenes.js?v=365",
    "./src/glimpse-horror.js?v=365",
    "./src/glimpse-legend.js?v=365",
    "./src/glimpse-hand.js?v=365",
    "./src/atlas-view.js?v=365",
    "./src/strange.js?v=365",
    "./src/linked-dungeons.js?v=365",
    "./src/digging.js?v=365",
    "./src/building.js?v=365",
    "./src/refuge-lands.js?v=365",
    "./src/revenant-horde.js?v=365",
    "./src/stages.js?v=365",
    "./src/watcher.js?v=365",
    "./src/vehicle-gates.js?v=365",
    "./src/dungeon-ladder.js?v=365",
    "./src/potions.js?v=365",
    "./src/transit-lattice.js?v=365",
    "./src/late-spells.js?v=365",
    "./src/tyrant-hunt.js?v=365",
    "./src/world-beasts.js?v=365",
    "./src/elders.js?v=365",
    "./src/far-array.js?v=365",
    "./src/combat-visuals.js?v=365",
    "./src/dungeon-framework.js?v=365",
    "./src/elites.js?v=365",
    "./src/random.js?v=365",
    "./src/types.js?v=365",
    "./src/story.js?v=365",
    "./src/foundry.js?v=365",
    "./src/world.js?v=365",
    "./src/deep-dungeons.js?v=365",
    "./src/scenes.js?v=365",
    "./src/arenas.js?v=365",
    "./src/items.js?v=365",
    "./src/combat.js?v=365",
    "./src/interactions.js?v=365",
    "./src/persistence.js?v=365",
    "./src/input.js?v=365",
    "./src/game.js?v=365",
    "./src/renderer.js?v=365",
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
