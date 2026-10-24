const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v387`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=387",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=387",
    "./src/proving-ground.js?v=387",
    "./src/proving-ground-fixtures.js?v=387",
    "./src/proving-ground-labs.js?v=387",
    "./src/dungeon-variation.js?v=387",
    "./src/dungeon-completion.js?v=387",
    "./src/enemy-patterns.js?v=387",
    "./src/monster-pack.js?v=387",
    "./src/monster-render.js?v=387",
    "./src/astral-worm.js?v=387",
    "./src/astral-worm-render.js?v=387",
    "./src/astral-worm-retreat.js?v=387",
    "./src/astral-worm-mount.js?v=387",
    "./src/lightning-giant-render.js?v=387",
    "./src/astral-encounters.js?v=387",
    "./src/astral-world-retreat.js?v=387",
    "./src/landscape.js?v=387",
    "./src/landscape-render.js?v=387",
    "./src/underlands.js?v=387",
    "./src/pattern-dungeons.js?v=387",
    "./src/relay-network.js?v=387",
    "./src/glyphs.js?v=387",
    "./src/echoes.js?v=387",
    "./src/constellation.js?v=387",
    "./src/water-traversal.js?v=387",
    "./src/open-sea.js?v=387",
    "./src/boats.js?v=387",
    "./src/sea-creatures.js?v=387",
    "./src/diving.js?v=387",
    "./src/grottoes.js?v=387",
    "./src/spell-slots.js?v=387",
    "./src/settlements.js?v=387",
    "./src/skirmishes.js?v=387",
    "./src/travelers.js?v=387",
    "./src/diagnostic-probe.js?v=387",
    "./src/questing-beast.js?v=387",
    "./src/recitations.js?v=387",
    "./src/lore.js?v=387",
    "./src/glimpses.js?v=387",
    "./src/glimpse-render.js?v=387",
    "./src/glimpse-paint.js?v=387",
    "./src/glimpse-scenes.js?v=387",
    "./src/glimpse-horror.js?v=387",
    "./src/glimpse-legend.js?v=387",
    "./src/glimpse-hand.js?v=387",
    "./src/atlas-view.js?v=387",
    "./src/strange.js?v=387",
    "./src/linked-dungeons.js?v=387",
    "./src/digging.js?v=387",
    "./src/building.js?v=387",
    "./src/refuge-lands.js?v=387",
    "./src/revenant-horde.js?v=387",
    "./src/stages.js?v=387",
    "./src/watcher.js?v=387",
    "./src/vehicle-gates.js?v=387",
    "./src/dungeon-ladder.js?v=387",
    "./src/potions.js?v=387",
    "./src/transit-lattice.js?v=387",
    "./src/late-spells.js?v=387",
    "./src/listener-mirror.js?v=387",
    "./src/hometowns.js?v=387",
    "./src/listener-arena.js?v=387",
    "./src/listener-morph.js?v=387",
    "./src/tyrant-hunt.js?v=387",
    "./src/world-beasts.js?v=387",
    "./src/elders.js?v=387",
    "./src/far-array.js?v=387",
    "./src/combat-visuals.js?v=387",
    "./src/dungeon-framework.js?v=387",
    "./src/elites.js?v=387",
    "./src/random.js?v=387",
    "./src/types.js?v=387",
    "./src/story.js?v=387",
    "./src/foundry.js?v=387",
    "./src/world.js?v=387",
    "./src/deep-dungeons.js?v=387",
    "./src/scenes.js?v=387",
    "./src/arenas.js?v=387",
    "./src/items.js?v=387",
    "./src/combat.js?v=387",
    "./src/interactions.js?v=387",
    "./src/persistence.js?v=387",
    "./src/input.js?v=387",
    "./src/game.js?v=387",
    "./src/renderer.js?v=387",
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
