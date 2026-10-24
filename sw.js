const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v389`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=389",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=389",
    "./src/proving-ground.js?v=389",
    "./src/proving-ground-fixtures.js?v=389",
    "./src/proving-ground-labs.js?v=389",
    "./src/dungeon-variation.js?v=389",
    "./src/dungeon-completion.js?v=389",
    "./src/enemy-patterns.js?v=389",
    "./src/monster-pack.js?v=389",
    "./src/monster-render.js?v=389",
    "./src/astral-worm.js?v=389",
    "./src/astral-worm-render.js?v=389",
    "./src/astral-worm-retreat.js?v=389",
    "./src/astral-worm-mount.js?v=389",
    "./src/lightning-giant-render.js?v=389",
    "./src/astral-encounters.js?v=389",
    "./src/astral-world-retreat.js?v=389",
    "./src/landscape.js?v=389",
    "./src/landscape-render.js?v=389",
    "./src/underlands.js?v=389",
    "./src/pattern-dungeons.js?v=389",
    "./src/relay-network.js?v=389",
    "./src/glyphs.js?v=389",
    "./src/echoes.js?v=389",
    "./src/constellation.js?v=389",
    "./src/water-traversal.js?v=389",
    "./src/open-sea.js?v=389",
    "./src/boats.js?v=389",
    "./src/sea-creatures.js?v=389",
    "./src/diving.js?v=389",
    "./src/grottoes.js?v=389",
    "./src/spell-slots.js?v=389",
    "./src/settlements.js?v=389",
    "./src/skirmishes.js?v=389",
    "./src/travelers.js?v=389",
    "./src/diagnostic-probe.js?v=389",
    "./src/questing-beast.js?v=389",
    "./src/recitations.js?v=389",
    "./src/lore.js?v=389",
    "./src/glimpses.js?v=389",
    "./src/glimpse-render.js?v=389",
    "./src/glimpse-paint.js?v=389",
    "./src/glimpse-scenes.js?v=389",
    "./src/glimpse-horror.js?v=389",
    "./src/glimpse-legend.js?v=389",
    "./src/glimpse-hand.js?v=389",
    "./src/atlas-view.js?v=389",
    "./src/strange.js?v=389",
    "./src/linked-dungeons.js?v=389",
    "./src/digging.js?v=389",
    "./src/building.js?v=389",
    "./src/refuge-lands.js?v=389",
    "./src/revenant-horde.js?v=389",
    "./src/stages.js?v=389",
    "./src/watcher.js?v=389",
    "./src/vehicle-gates.js?v=389",
    "./src/dungeon-ladder.js?v=389",
    "./src/potions.js?v=389",
    "./src/transit-lattice.js?v=389",
    "./src/late-spells.js?v=389",
    "./src/listener-mirror.js?v=389",
    "./src/hometowns.js?v=389",
    "./src/listener-arena.js?v=389",
    "./src/listener-morph.js?v=389",
    "./src/tyrant-hunt.js?v=389",
    "./src/world-beasts.js?v=389",
    "./src/elders.js?v=389",
    "./src/far-array.js?v=389",
    "./src/combat-visuals.js?v=389",
    "./src/dungeon-framework.js?v=389",
    "./src/elites.js?v=389",
    "./src/random.js?v=389",
    "./src/types.js?v=389",
    "./src/story.js?v=389",
    "./src/foundry.js?v=389",
    "./src/world.js?v=389",
    "./src/deep-dungeons.js?v=389",
    "./src/scenes.js?v=389",
    "./src/arenas.js?v=389",
    "./src/items.js?v=389",
    "./src/combat.js?v=389",
    "./src/interactions.js?v=389",
    "./src/persistence.js?v=389",
    "./src/input.js?v=389",
    "./src/game.js?v=389",
    "./src/renderer.js?v=389",
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
