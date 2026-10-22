const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v321`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=321",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=321",
    "./src/proving-ground.js?v=321",
    "./src/proving-ground-fixtures.js?v=321",
    "./src/proving-ground-labs.js?v=321",
    "./src/dungeon-variation.js?v=321",
    "./src/dungeon-completion.js?v=321",
    "./src/enemy-patterns.js?v=321",
    "./src/monster-pack.js?v=321",
    "./src/monster-render.js?v=321",
    "./src/astral-worm.js?v=321",
    "./src/astral-worm-render.js?v=321",
    "./src/astral-worm-retreat.js?v=321",
    "./src/astral-worm-mount.js?v=321",
    "./src/lightning-giant-render.js?v=321",
    "./src/astral-encounters.js?v=321",
    "./src/astral-world-retreat.js?v=321",
    "./src/landscape.js?v=321",
    "./src/landscape-render.js?v=321",
    "./src/underlands.js?v=321",
    "./src/pattern-dungeons.js?v=321",
    "./src/relay-network.js?v=321",
    "./src/glyphs.js?v=321",
    "./src/echoes.js?v=321",
    "./src/constellation.js?v=321",
    "./src/water-traversal.js?v=321",
    "./src/open-sea.js?v=321",
    "./src/boats.js?v=321",
    "./src/sea-creatures.js?v=321",
    "./src/diving.js?v=321",
    "./src/grottoes.js?v=321",
    "./src/spell-slots.js?v=321",
    "./src/settlements.js?v=321",
    "./src/skirmishes.js?v=321",
    "./src/travelers.js?v=321",
    "./src/diagnostic-probe.js?v=321",
    "./src/questing-beast.js?v=321",
    "./src/recitations.js?v=321",
    "./src/lore.js?v=321",
    "./src/glimpses.js?v=321",
    "./src/glimpse-render.js?v=321",
    "./src/glimpse-paint.js?v=321",
    "./src/glimpse-scenes.js?v=321",
    "./src/glimpse-horror.js?v=321",
    "./src/glimpse-legend.js?v=321",
    "./src/glimpse-hand.js?v=321",
    "./src/atlas-view.js?v=321",
    "./src/strange.js?v=321",
    "./src/linked-dungeons.js?v=321",
    "./src/digging.js?v=321",
    "./src/building.js?v=321",
    "./src/refuge-lands.js?v=321",
    "./src/revenant-horde.js?v=321",
    "./src/stages.js?v=321",
    "./src/watcher.js?v=321",
    "./src/vehicle-gates.js?v=321",
    "./src/dungeon-ladder.js?v=321",
    "./src/tyrant-hunt.js?v=321",
    "./src/world-beasts.js?v=321",
    "./src/elders.js?v=321",
    "./src/far-array.js?v=321",
    "./src/combat-visuals.js?v=321",
    "./src/dungeon-framework.js?v=321",
    "./src/elites.js?v=321",
    "./src/random.js?v=321",
    "./src/types.js?v=321",
    "./src/story.js?v=321",
    "./src/foundry.js?v=321",
    "./src/world.js?v=321",
    "./src/deep-dungeons.js?v=321",
    "./src/scenes.js?v=321",
    "./src/arenas.js?v=321",
    "./src/items.js?v=321",
    "./src/combat.js?v=321",
    "./src/interactions.js?v=321",
    "./src/persistence.js?v=321",
    "./src/input.js?v=321",
    "./src/game.js?v=321",
    "./src/renderer.js?v=321",
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
