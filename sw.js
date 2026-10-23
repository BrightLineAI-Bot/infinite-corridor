const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v373`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=373",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=373",
    "./src/proving-ground.js?v=373",
    "./src/proving-ground-fixtures.js?v=373",
    "./src/proving-ground-labs.js?v=373",
    "./src/dungeon-variation.js?v=373",
    "./src/dungeon-completion.js?v=373",
    "./src/enemy-patterns.js?v=373",
    "./src/monster-pack.js?v=373",
    "./src/monster-render.js?v=373",
    "./src/astral-worm.js?v=373",
    "./src/astral-worm-render.js?v=373",
    "./src/astral-worm-retreat.js?v=373",
    "./src/astral-worm-mount.js?v=373",
    "./src/lightning-giant-render.js?v=373",
    "./src/astral-encounters.js?v=373",
    "./src/astral-world-retreat.js?v=373",
    "./src/landscape.js?v=373",
    "./src/landscape-render.js?v=373",
    "./src/underlands.js?v=373",
    "./src/pattern-dungeons.js?v=373",
    "./src/relay-network.js?v=373",
    "./src/glyphs.js?v=373",
    "./src/echoes.js?v=373",
    "./src/constellation.js?v=373",
    "./src/water-traversal.js?v=373",
    "./src/open-sea.js?v=373",
    "./src/boats.js?v=373",
    "./src/sea-creatures.js?v=373",
    "./src/diving.js?v=373",
    "./src/grottoes.js?v=373",
    "./src/spell-slots.js?v=373",
    "./src/settlements.js?v=373",
    "./src/skirmishes.js?v=373",
    "./src/travelers.js?v=373",
    "./src/diagnostic-probe.js?v=373",
    "./src/questing-beast.js?v=373",
    "./src/recitations.js?v=373",
    "./src/lore.js?v=373",
    "./src/glimpses.js?v=373",
    "./src/glimpse-render.js?v=373",
    "./src/glimpse-paint.js?v=373",
    "./src/glimpse-scenes.js?v=373",
    "./src/glimpse-horror.js?v=373",
    "./src/glimpse-legend.js?v=373",
    "./src/glimpse-hand.js?v=373",
    "./src/atlas-view.js?v=373",
    "./src/strange.js?v=373",
    "./src/linked-dungeons.js?v=373",
    "./src/digging.js?v=373",
    "./src/building.js?v=373",
    "./src/refuge-lands.js?v=373",
    "./src/revenant-horde.js?v=373",
    "./src/stages.js?v=373",
    "./src/watcher.js?v=373",
    "./src/vehicle-gates.js?v=373",
    "./src/dungeon-ladder.js?v=373",
    "./src/potions.js?v=373",
    "./src/transit-lattice.js?v=373",
    "./src/late-spells.js?v=373",
    "./src/listener-mirror.js?v=373",
    "./src/hometowns.js?v=373",
    "./src/tyrant-hunt.js?v=373",
    "./src/world-beasts.js?v=373",
    "./src/elders.js?v=373",
    "./src/far-array.js?v=373",
    "./src/combat-visuals.js?v=373",
    "./src/dungeon-framework.js?v=373",
    "./src/elites.js?v=373",
    "./src/random.js?v=373",
    "./src/types.js?v=373",
    "./src/story.js?v=373",
    "./src/foundry.js?v=373",
    "./src/world.js?v=373",
    "./src/deep-dungeons.js?v=373",
    "./src/scenes.js?v=373",
    "./src/arenas.js?v=373",
    "./src/items.js?v=373",
    "./src/combat.js?v=373",
    "./src/interactions.js?v=373",
    "./src/persistence.js?v=373",
    "./src/input.js?v=373",
    "./src/game.js?v=373",
    "./src/renderer.js?v=373",
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
