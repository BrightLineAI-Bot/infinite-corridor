const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v377`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=377",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=377",
    "./src/proving-ground.js?v=377",
    "./src/proving-ground-fixtures.js?v=377",
    "./src/proving-ground-labs.js?v=377",
    "./src/dungeon-variation.js?v=377",
    "./src/dungeon-completion.js?v=377",
    "./src/enemy-patterns.js?v=377",
    "./src/monster-pack.js?v=377",
    "./src/monster-render.js?v=377",
    "./src/astral-worm.js?v=377",
    "./src/astral-worm-render.js?v=377",
    "./src/astral-worm-retreat.js?v=377",
    "./src/astral-worm-mount.js?v=377",
    "./src/lightning-giant-render.js?v=377",
    "./src/astral-encounters.js?v=377",
    "./src/astral-world-retreat.js?v=377",
    "./src/landscape.js?v=377",
    "./src/landscape-render.js?v=377",
    "./src/underlands.js?v=377",
    "./src/pattern-dungeons.js?v=377",
    "./src/relay-network.js?v=377",
    "./src/glyphs.js?v=377",
    "./src/echoes.js?v=377",
    "./src/constellation.js?v=377",
    "./src/water-traversal.js?v=377",
    "./src/open-sea.js?v=377",
    "./src/boats.js?v=377",
    "./src/sea-creatures.js?v=377",
    "./src/diving.js?v=377",
    "./src/grottoes.js?v=377",
    "./src/spell-slots.js?v=377",
    "./src/settlements.js?v=377",
    "./src/skirmishes.js?v=377",
    "./src/travelers.js?v=377",
    "./src/diagnostic-probe.js?v=377",
    "./src/questing-beast.js?v=377",
    "./src/recitations.js?v=377",
    "./src/lore.js?v=377",
    "./src/glimpses.js?v=377",
    "./src/glimpse-render.js?v=377",
    "./src/glimpse-paint.js?v=377",
    "./src/glimpse-scenes.js?v=377",
    "./src/glimpse-horror.js?v=377",
    "./src/glimpse-legend.js?v=377",
    "./src/glimpse-hand.js?v=377",
    "./src/atlas-view.js?v=377",
    "./src/strange.js?v=377",
    "./src/linked-dungeons.js?v=377",
    "./src/digging.js?v=377",
    "./src/building.js?v=377",
    "./src/refuge-lands.js?v=377",
    "./src/revenant-horde.js?v=377",
    "./src/stages.js?v=377",
    "./src/watcher.js?v=377",
    "./src/vehicle-gates.js?v=377",
    "./src/dungeon-ladder.js?v=377",
    "./src/potions.js?v=377",
    "./src/transit-lattice.js?v=377",
    "./src/late-spells.js?v=377",
    "./src/listener-mirror.js?v=377",
    "./src/hometowns.js?v=377",
    "./src/listener-arena.js?v=377",
    "./src/tyrant-hunt.js?v=377",
    "./src/world-beasts.js?v=377",
    "./src/elders.js?v=377",
    "./src/far-array.js?v=377",
    "./src/combat-visuals.js?v=377",
    "./src/dungeon-framework.js?v=377",
    "./src/elites.js?v=377",
    "./src/random.js?v=377",
    "./src/types.js?v=377",
    "./src/story.js?v=377",
    "./src/foundry.js?v=377",
    "./src/world.js?v=377",
    "./src/deep-dungeons.js?v=377",
    "./src/scenes.js?v=377",
    "./src/arenas.js?v=377",
    "./src/items.js?v=377",
    "./src/combat.js?v=377",
    "./src/interactions.js?v=377",
    "./src/persistence.js?v=377",
    "./src/input.js?v=377",
    "./src/game.js?v=377",
    "./src/renderer.js?v=377",
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
