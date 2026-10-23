const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r367-cff5c3a5b912`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r367-cff5c3a5b912",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r367-cff5c3a5b912",
    "./src/proving-ground.js?v=r367-cff5c3a5b912",
    "./src/proving-ground-fixtures.js?v=r367-cff5c3a5b912",
    "./src/proving-ground-labs.js?v=r367-cff5c3a5b912",
    "./src/dungeon-variation.js?v=r367-cff5c3a5b912",
    "./src/dungeon-completion.js?v=r367-cff5c3a5b912",
    "./src/enemy-patterns.js?v=r367-cff5c3a5b912",
    "./src/monster-pack.js?v=r367-cff5c3a5b912",
    "./src/monster-render.js?v=r367-cff5c3a5b912",
    "./src/astral-worm.js?v=r367-cff5c3a5b912",
    "./src/astral-worm-render.js?v=r367-cff5c3a5b912",
    "./src/astral-worm-retreat.js?v=r367-cff5c3a5b912",
    "./src/astral-worm-mount.js?v=r367-cff5c3a5b912",
    "./src/lightning-giant-render.js?v=r367-cff5c3a5b912",
    "./src/astral-encounters.js?v=r367-cff5c3a5b912",
    "./src/astral-world-retreat.js?v=r367-cff5c3a5b912",
    "./src/landscape.js?v=r367-cff5c3a5b912",
    "./src/landscape-render.js?v=r367-cff5c3a5b912",
    "./src/underlands.js?v=r367-cff5c3a5b912",
    "./src/pattern-dungeons.js?v=r367-cff5c3a5b912",
    "./src/relay-network.js?v=r367-cff5c3a5b912",
    "./src/glyphs.js?v=r367-cff5c3a5b912",
    "./src/echoes.js?v=r367-cff5c3a5b912",
    "./src/constellation.js?v=r367-cff5c3a5b912",
    "./src/water-traversal.js?v=r367-cff5c3a5b912",
    "./src/open-sea.js?v=r367-cff5c3a5b912",
    "./src/boats.js?v=r367-cff5c3a5b912",
    "./src/sea-creatures.js?v=r367-cff5c3a5b912",
    "./src/diving.js?v=r367-cff5c3a5b912",
    "./src/grottoes.js?v=r367-cff5c3a5b912",
    "./src/spell-slots.js?v=r367-cff5c3a5b912",
    "./src/settlements.js?v=r367-cff5c3a5b912",
    "./src/skirmishes.js?v=r367-cff5c3a5b912",
    "./src/travelers.js?v=r367-cff5c3a5b912",
    "./src/diagnostic-probe.js?v=r367-cff5c3a5b912",
    "./src/questing-beast.js?v=r367-cff5c3a5b912",
    "./src/recitations.js?v=r367-cff5c3a5b912",
    "./src/lore.js?v=r367-cff5c3a5b912",
    "./src/glimpses.js?v=r367-cff5c3a5b912",
    "./src/glimpse-render.js?v=r367-cff5c3a5b912",
    "./src/glimpse-paint.js?v=r367-cff5c3a5b912",
    "./src/glimpse-scenes.js?v=r367-cff5c3a5b912",
    "./src/glimpse-horror.js?v=r367-cff5c3a5b912",
    "./src/glimpse-legend.js?v=r367-cff5c3a5b912",
    "./src/glimpse-hand.js?v=r367-cff5c3a5b912",
    "./src/atlas-view.js?v=r367-cff5c3a5b912",
    "./src/strange.js?v=r367-cff5c3a5b912",
    "./src/linked-dungeons.js?v=r367-cff5c3a5b912",
    "./src/digging.js?v=r367-cff5c3a5b912",
    "./src/building.js?v=r367-cff5c3a5b912",
    "./src/refuge-lands.js?v=r367-cff5c3a5b912",
    "./src/revenant-horde.js?v=r367-cff5c3a5b912",
    "./src/stages.js?v=r367-cff5c3a5b912",
    "./src/watcher.js?v=r367-cff5c3a5b912",
    "./src/vehicle-gates.js?v=r367-cff5c3a5b912",
    "./src/dungeon-ladder.js?v=r367-cff5c3a5b912",
    "./src/potions.js?v=r367-cff5c3a5b912",
    "./src/transit-lattice.js?v=r367-cff5c3a5b912",
    "./src/late-spells.js?v=r367-cff5c3a5b912",
    "./src/tyrant-hunt.js?v=r367-cff5c3a5b912",
    "./src/world-beasts.js?v=r367-cff5c3a5b912",
    "./src/elders.js?v=r367-cff5c3a5b912",
    "./src/far-array.js?v=r367-cff5c3a5b912",
    "./src/combat-visuals.js?v=r367-cff5c3a5b912",
    "./src/dungeon-framework.js?v=r367-cff5c3a5b912",
    "./src/elites.js?v=r367-cff5c3a5b912",
    "./src/random.js?v=r367-cff5c3a5b912",
    "./src/types.js?v=r367-cff5c3a5b912",
    "./src/story.js?v=r367-cff5c3a5b912",
    "./src/foundry.js?v=r367-cff5c3a5b912",
    "./src/world.js?v=r367-cff5c3a5b912",
    "./src/deep-dungeons.js?v=r367-cff5c3a5b912",
    "./src/scenes.js?v=r367-cff5c3a5b912",
    "./src/arenas.js?v=r367-cff5c3a5b912",
    "./src/items.js?v=r367-cff5c3a5b912",
    "./src/combat.js?v=r367-cff5c3a5b912",
    "./src/interactions.js?v=r367-cff5c3a5b912",
    "./src/persistence.js?v=r367-cff5c3a5b912",
    "./src/input.js?v=r367-cff5c3a5b912",
    "./src/game.js?v=r367-cff5c3a5b912",
    "./src/renderer.js?v=r367-cff5c3a5b912",
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
