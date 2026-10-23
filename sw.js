const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v375`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=375",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=375",
    "./src/proving-ground.js?v=375",
    "./src/proving-ground-fixtures.js?v=375",
    "./src/proving-ground-labs.js?v=375",
    "./src/dungeon-variation.js?v=375",
    "./src/dungeon-completion.js?v=375",
    "./src/enemy-patterns.js?v=375",
    "./src/monster-pack.js?v=375",
    "./src/monster-render.js?v=375",
    "./src/astral-worm.js?v=375",
    "./src/astral-worm-render.js?v=375",
    "./src/astral-worm-retreat.js?v=375",
    "./src/astral-worm-mount.js?v=375",
    "./src/lightning-giant-render.js?v=375",
    "./src/astral-encounters.js?v=375",
    "./src/astral-world-retreat.js?v=375",
    "./src/landscape.js?v=375",
    "./src/landscape-render.js?v=375",
    "./src/underlands.js?v=375",
    "./src/pattern-dungeons.js?v=375",
    "./src/relay-network.js?v=375",
    "./src/glyphs.js?v=375",
    "./src/echoes.js?v=375",
    "./src/constellation.js?v=375",
    "./src/water-traversal.js?v=375",
    "./src/open-sea.js?v=375",
    "./src/boats.js?v=375",
    "./src/sea-creatures.js?v=375",
    "./src/diving.js?v=375",
    "./src/grottoes.js?v=375",
    "./src/spell-slots.js?v=375",
    "./src/settlements.js?v=375",
    "./src/skirmishes.js?v=375",
    "./src/travelers.js?v=375",
    "./src/diagnostic-probe.js?v=375",
    "./src/questing-beast.js?v=375",
    "./src/recitations.js?v=375",
    "./src/lore.js?v=375",
    "./src/glimpses.js?v=375",
    "./src/glimpse-render.js?v=375",
    "./src/glimpse-paint.js?v=375",
    "./src/glimpse-scenes.js?v=375",
    "./src/glimpse-horror.js?v=375",
    "./src/glimpse-legend.js?v=375",
    "./src/glimpse-hand.js?v=375",
    "./src/atlas-view.js?v=375",
    "./src/strange.js?v=375",
    "./src/linked-dungeons.js?v=375",
    "./src/digging.js?v=375",
    "./src/building.js?v=375",
    "./src/refuge-lands.js?v=375",
    "./src/revenant-horde.js?v=375",
    "./src/stages.js?v=375",
    "./src/watcher.js?v=375",
    "./src/vehicle-gates.js?v=375",
    "./src/dungeon-ladder.js?v=375",
    "./src/potions.js?v=375",
    "./src/transit-lattice.js?v=375",
    "./src/late-spells.js?v=375",
    "./src/listener-mirror.js?v=375",
    "./src/hometowns.js?v=375",
    "./src/listener-arena.js?v=375",
    "./src/tyrant-hunt.js?v=375",
    "./src/world-beasts.js?v=375",
    "./src/elders.js?v=375",
    "./src/far-array.js?v=375",
    "./src/combat-visuals.js?v=375",
    "./src/dungeon-framework.js?v=375",
    "./src/elites.js?v=375",
    "./src/random.js?v=375",
    "./src/types.js?v=375",
    "./src/story.js?v=375",
    "./src/foundry.js?v=375",
    "./src/world.js?v=375",
    "./src/deep-dungeons.js?v=375",
    "./src/scenes.js?v=375",
    "./src/arenas.js?v=375",
    "./src/items.js?v=375",
    "./src/combat.js?v=375",
    "./src/interactions.js?v=375",
    "./src/persistence.js?v=375",
    "./src/input.js?v=375",
    "./src/game.js?v=375",
    "./src/renderer.js?v=375",
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
