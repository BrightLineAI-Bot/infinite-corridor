const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v363`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=363",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=363",
    "./src/proving-ground.js?v=363",
    "./src/proving-ground-fixtures.js?v=363",
    "./src/proving-ground-labs.js?v=363",
    "./src/dungeon-variation.js?v=363",
    "./src/dungeon-completion.js?v=363",
    "./src/enemy-patterns.js?v=363",
    "./src/monster-pack.js?v=363",
    "./src/monster-render.js?v=363",
    "./src/astral-worm.js?v=363",
    "./src/astral-worm-render.js?v=363",
    "./src/astral-worm-retreat.js?v=363",
    "./src/astral-worm-mount.js?v=363",
    "./src/lightning-giant-render.js?v=363",
    "./src/astral-encounters.js?v=363",
    "./src/astral-world-retreat.js?v=363",
    "./src/landscape.js?v=363",
    "./src/landscape-render.js?v=363",
    "./src/underlands.js?v=363",
    "./src/pattern-dungeons.js?v=363",
    "./src/relay-network.js?v=363",
    "./src/glyphs.js?v=363",
    "./src/echoes.js?v=363",
    "./src/constellation.js?v=363",
    "./src/water-traversal.js?v=363",
    "./src/open-sea.js?v=363",
    "./src/boats.js?v=363",
    "./src/sea-creatures.js?v=363",
    "./src/diving.js?v=363",
    "./src/grottoes.js?v=363",
    "./src/spell-slots.js?v=363",
    "./src/settlements.js?v=363",
    "./src/skirmishes.js?v=363",
    "./src/travelers.js?v=363",
    "./src/diagnostic-probe.js?v=363",
    "./src/questing-beast.js?v=363",
    "./src/recitations.js?v=363",
    "./src/lore.js?v=363",
    "./src/glimpses.js?v=363",
    "./src/glimpse-render.js?v=363",
    "./src/glimpse-paint.js?v=363",
    "./src/glimpse-scenes.js?v=363",
    "./src/glimpse-horror.js?v=363",
    "./src/glimpse-legend.js?v=363",
    "./src/glimpse-hand.js?v=363",
    "./src/atlas-view.js?v=363",
    "./src/strange.js?v=363",
    "./src/linked-dungeons.js?v=363",
    "./src/digging.js?v=363",
    "./src/building.js?v=363",
    "./src/refuge-lands.js?v=363",
    "./src/revenant-horde.js?v=363",
    "./src/stages.js?v=363",
    "./src/watcher.js?v=363",
    "./src/vehicle-gates.js?v=363",
    "./src/dungeon-ladder.js?v=363",
    "./src/potions.js?v=363",
    "./src/transit-lattice.js?v=363",
    "./src/tyrant-hunt.js?v=363",
    "./src/world-beasts.js?v=363",
    "./src/elders.js?v=363",
    "./src/far-array.js?v=363",
    "./src/combat-visuals.js?v=363",
    "./src/dungeon-framework.js?v=363",
    "./src/elites.js?v=363",
    "./src/random.js?v=363",
    "./src/types.js?v=363",
    "./src/story.js?v=363",
    "./src/foundry.js?v=363",
    "./src/world.js?v=363",
    "./src/deep-dungeons.js?v=363",
    "./src/scenes.js?v=363",
    "./src/arenas.js?v=363",
    "./src/items.js?v=363",
    "./src/combat.js?v=363",
    "./src/interactions.js?v=363",
    "./src/persistence.js?v=363",
    "./src/input.js?v=363",
    "./src/game.js?v=363",
    "./src/renderer.js?v=363",
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
