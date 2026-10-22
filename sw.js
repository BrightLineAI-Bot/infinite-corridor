const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r327-ae92ea7193c7`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r327-ae92ea7193c7",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r327-ae92ea7193c7",
    "./src/proving-ground.js?v=r327-ae92ea7193c7",
    "./src/proving-ground-fixtures.js?v=r327-ae92ea7193c7",
    "./src/proving-ground-labs.js?v=r327-ae92ea7193c7",
    "./src/dungeon-variation.js?v=r327-ae92ea7193c7",
    "./src/dungeon-completion.js?v=r327-ae92ea7193c7",
    "./src/enemy-patterns.js?v=r327-ae92ea7193c7",
    "./src/monster-pack.js?v=r327-ae92ea7193c7",
    "./src/monster-render.js?v=r327-ae92ea7193c7",
    "./src/astral-worm.js?v=r327-ae92ea7193c7",
    "./src/astral-worm-render.js?v=r327-ae92ea7193c7",
    "./src/astral-worm-retreat.js?v=r327-ae92ea7193c7",
    "./src/astral-worm-mount.js?v=r327-ae92ea7193c7",
    "./src/lightning-giant-render.js?v=r327-ae92ea7193c7",
    "./src/astral-encounters.js?v=r327-ae92ea7193c7",
    "./src/astral-world-retreat.js?v=r327-ae92ea7193c7",
    "./src/landscape.js?v=r327-ae92ea7193c7",
    "./src/landscape-render.js?v=r327-ae92ea7193c7",
    "./src/underlands.js?v=r327-ae92ea7193c7",
    "./src/pattern-dungeons.js?v=r327-ae92ea7193c7",
    "./src/relay-network.js?v=r327-ae92ea7193c7",
    "./src/glyphs.js?v=r327-ae92ea7193c7",
    "./src/echoes.js?v=r327-ae92ea7193c7",
    "./src/constellation.js?v=r327-ae92ea7193c7",
    "./src/water-traversal.js?v=r327-ae92ea7193c7",
    "./src/open-sea.js?v=r327-ae92ea7193c7",
    "./src/boats.js?v=r327-ae92ea7193c7",
    "./src/sea-creatures.js?v=r327-ae92ea7193c7",
    "./src/diving.js?v=r327-ae92ea7193c7",
    "./src/grottoes.js?v=r327-ae92ea7193c7",
    "./src/spell-slots.js?v=r327-ae92ea7193c7",
    "./src/settlements.js?v=r327-ae92ea7193c7",
    "./src/skirmishes.js?v=r327-ae92ea7193c7",
    "./src/travelers.js?v=r327-ae92ea7193c7",
    "./src/diagnostic-probe.js?v=r327-ae92ea7193c7",
    "./src/questing-beast.js?v=r327-ae92ea7193c7",
    "./src/recitations.js?v=r327-ae92ea7193c7",
    "./src/lore.js?v=r327-ae92ea7193c7",
    "./src/glimpses.js?v=r327-ae92ea7193c7",
    "./src/glimpse-render.js?v=r327-ae92ea7193c7",
    "./src/glimpse-paint.js?v=r327-ae92ea7193c7",
    "./src/glimpse-scenes.js?v=r327-ae92ea7193c7",
    "./src/glimpse-horror.js?v=r327-ae92ea7193c7",
    "./src/glimpse-legend.js?v=r327-ae92ea7193c7",
    "./src/glimpse-hand.js?v=r327-ae92ea7193c7",
    "./src/atlas-view.js?v=r327-ae92ea7193c7",
    "./src/strange.js?v=r327-ae92ea7193c7",
    "./src/linked-dungeons.js?v=r327-ae92ea7193c7",
    "./src/digging.js?v=r327-ae92ea7193c7",
    "./src/building.js?v=r327-ae92ea7193c7",
    "./src/refuge-lands.js?v=r327-ae92ea7193c7",
    "./src/revenant-horde.js?v=r327-ae92ea7193c7",
    "./src/stages.js?v=r327-ae92ea7193c7",
    "./src/watcher.js?v=r327-ae92ea7193c7",
    "./src/vehicle-gates.js?v=r327-ae92ea7193c7",
    "./src/dungeon-ladder.js?v=r327-ae92ea7193c7",
    "./src/tyrant-hunt.js?v=r327-ae92ea7193c7",
    "./src/world-beasts.js?v=r327-ae92ea7193c7",
    "./src/elders.js?v=r327-ae92ea7193c7",
    "./src/far-array.js?v=r327-ae92ea7193c7",
    "./src/combat-visuals.js?v=r327-ae92ea7193c7",
    "./src/dungeon-framework.js?v=r327-ae92ea7193c7",
    "./src/elites.js?v=r327-ae92ea7193c7",
    "./src/random.js?v=r327-ae92ea7193c7",
    "./src/types.js?v=r327-ae92ea7193c7",
    "./src/story.js?v=r327-ae92ea7193c7",
    "./src/foundry.js?v=r327-ae92ea7193c7",
    "./src/world.js?v=r327-ae92ea7193c7",
    "./src/deep-dungeons.js?v=r327-ae92ea7193c7",
    "./src/scenes.js?v=r327-ae92ea7193c7",
    "./src/arenas.js?v=r327-ae92ea7193c7",
    "./src/items.js?v=r327-ae92ea7193c7",
    "./src/combat.js?v=r327-ae92ea7193c7",
    "./src/interactions.js?v=r327-ae92ea7193c7",
    "./src/persistence.js?v=r327-ae92ea7193c7",
    "./src/input.js?v=r327-ae92ea7193c7",
    "./src/game.js?v=r327-ae92ea7193c7",
    "./src/renderer.js?v=r327-ae92ea7193c7",
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
