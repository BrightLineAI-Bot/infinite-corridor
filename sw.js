const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r317-0212d6f3ae04`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r317-0212d6f3ae04",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r317-0212d6f3ae04",
    "./src/proving-ground.js?v=r317-0212d6f3ae04",
    "./src/proving-ground-fixtures.js?v=r317-0212d6f3ae04",
    "./src/proving-ground-labs.js?v=r317-0212d6f3ae04",
    "./src/dungeon-variation.js?v=r317-0212d6f3ae04",
    "./src/dungeon-completion.js?v=r317-0212d6f3ae04",
    "./src/enemy-patterns.js?v=r317-0212d6f3ae04",
    "./src/monster-pack.js?v=r317-0212d6f3ae04",
    "./src/monster-render.js?v=r317-0212d6f3ae04",
    "./src/astral-worm.js?v=r317-0212d6f3ae04",
    "./src/astral-worm-render.js?v=r317-0212d6f3ae04",
    "./src/astral-worm-retreat.js?v=r317-0212d6f3ae04",
    "./src/astral-worm-mount.js?v=r317-0212d6f3ae04",
    "./src/lightning-giant-render.js?v=r317-0212d6f3ae04",
    "./src/astral-encounters.js?v=r317-0212d6f3ae04",
    "./src/astral-world-retreat.js?v=r317-0212d6f3ae04",
    "./src/landscape.js?v=r317-0212d6f3ae04",
    "./src/landscape-render.js?v=r317-0212d6f3ae04",
    "./src/underlands.js?v=r317-0212d6f3ae04",
    "./src/pattern-dungeons.js?v=r317-0212d6f3ae04",
    "./src/relay-network.js?v=r317-0212d6f3ae04",
    "./src/glyphs.js?v=r317-0212d6f3ae04",
    "./src/echoes.js?v=r317-0212d6f3ae04",
    "./src/constellation.js?v=r317-0212d6f3ae04",
    "./src/water-traversal.js?v=r317-0212d6f3ae04",
    "./src/open-sea.js?v=r317-0212d6f3ae04",
    "./src/boats.js?v=r317-0212d6f3ae04",
    "./src/sea-creatures.js?v=r317-0212d6f3ae04",
    "./src/diving.js?v=r317-0212d6f3ae04",
    "./src/grottoes.js?v=r317-0212d6f3ae04",
    "./src/spell-slots.js?v=r317-0212d6f3ae04",
    "./src/settlements.js?v=r317-0212d6f3ae04",
    "./src/skirmishes.js?v=r317-0212d6f3ae04",
    "./src/travelers.js?v=r317-0212d6f3ae04",
    "./src/diagnostic-probe.js?v=r317-0212d6f3ae04",
    "./src/questing-beast.js?v=r317-0212d6f3ae04",
    "./src/recitations.js?v=r317-0212d6f3ae04",
    "./src/lore.js?v=r317-0212d6f3ae04",
    "./src/glimpses.js?v=r317-0212d6f3ae04",
    "./src/glimpse-render.js?v=r317-0212d6f3ae04",
    "./src/glimpse-paint.js?v=r317-0212d6f3ae04",
    "./src/glimpse-scenes.js?v=r317-0212d6f3ae04",
    "./src/glimpse-horror.js?v=r317-0212d6f3ae04",
    "./src/glimpse-legend.js?v=r317-0212d6f3ae04",
    "./src/glimpse-hand.js?v=r317-0212d6f3ae04",
    "./src/atlas-view.js?v=r317-0212d6f3ae04",
    "./src/strange.js?v=r317-0212d6f3ae04",
    "./src/linked-dungeons.js?v=r317-0212d6f3ae04",
    "./src/digging.js?v=r317-0212d6f3ae04",
    "./src/building.js?v=r317-0212d6f3ae04",
    "./src/refuge-lands.js?v=r317-0212d6f3ae04",
    "./src/revenant-horde.js?v=r317-0212d6f3ae04",
    "./src/stages.js?v=r317-0212d6f3ae04",
    "./src/watcher.js?v=r317-0212d6f3ae04",
    "./src/vehicle-gates.js?v=r317-0212d6f3ae04",
    "./src/tyrant-hunt.js?v=r317-0212d6f3ae04",
    "./src/world-beasts.js?v=r317-0212d6f3ae04",
    "./src/elders.js?v=r317-0212d6f3ae04",
    "./src/far-array.js?v=r317-0212d6f3ae04",
    "./src/combat-visuals.js?v=r317-0212d6f3ae04",
    "./src/dungeon-framework.js?v=r317-0212d6f3ae04",
    "./src/elites.js?v=r317-0212d6f3ae04",
    "./src/random.js?v=r317-0212d6f3ae04",
    "./src/types.js?v=r317-0212d6f3ae04",
    "./src/story.js?v=r317-0212d6f3ae04",
    "./src/foundry.js?v=r317-0212d6f3ae04",
    "./src/world.js?v=r317-0212d6f3ae04",
    "./src/deep-dungeons.js?v=r317-0212d6f3ae04",
    "./src/scenes.js?v=r317-0212d6f3ae04",
    "./src/arenas.js?v=r317-0212d6f3ae04",
    "./src/items.js?v=r317-0212d6f3ae04",
    "./src/combat.js?v=r317-0212d6f3ae04",
    "./src/interactions.js?v=r317-0212d6f3ae04",
    "./src/persistence.js?v=r317-0212d6f3ae04",
    "./src/input.js?v=r317-0212d6f3ae04",
    "./src/game.js?v=r317-0212d6f3ae04",
    "./src/renderer.js?v=r317-0212d6f3ae04",
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
