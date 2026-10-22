const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v297`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=297",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=297",
    "./src/proving-ground.js?v=297",
    "./src/proving-ground-fixtures.js?v=297",
    "./src/proving-ground-labs.js?v=297",
    "./src/dungeon-variation.js?v=297",
    "./src/dungeon-completion.js?v=297",
    "./src/enemy-patterns.js?v=297",
    "./src/monster-pack.js?v=297",
    "./src/monster-render.js?v=297",
    "./src/astral-worm.js?v=297",
    "./src/astral-worm-render.js?v=297",
    "./src/astral-worm-retreat.js?v=297",
    "./src/astral-worm-mount.js?v=297",
    "./src/lightning-giant-render.js?v=297",
    "./src/astral-encounters.js?v=297",
    "./src/astral-world-retreat.js?v=297",
    "./src/landscape.js?v=297",
    "./src/landscape-render.js?v=297",
    "./src/underlands.js?v=297",
    "./src/pattern-dungeons.js?v=297",
    "./src/relay-network.js?v=297",
    "./src/glyphs.js?v=297",
    "./src/echoes.js?v=297",
    "./src/constellation.js?v=297",
    "./src/water-traversal.js?v=297",
    "./src/open-sea.js?v=297",
    "./src/boats.js?v=297",
    "./src/sea-creatures.js?v=297",
    "./src/diving.js?v=297",
    "./src/grottoes.js?v=297",
    "./src/spell-slots.js?v=297",
    "./src/settlements.js?v=297",
    "./src/skirmishes.js?v=297",
    "./src/travelers.js?v=297",
    "./src/diagnostic-probe.js?v=297",
    "./src/questing-beast.js?v=297",
    "./src/recitations.js?v=297",
    "./src/lore.js?v=297",
    "./src/glimpses.js?v=297",
    "./src/glimpse-render.js?v=297",
    "./src/glimpse-paint.js?v=297",
    "./src/glimpse-scenes.js?v=297",
    "./src/glimpse-horror.js?v=297",
    "./src/glimpse-legend.js?v=297",
    "./src/glimpse-hand.js?v=297",
    "./src/atlas-view.js?v=297",
    "./src/strange.js?v=297",
    "./src/linked-dungeons.js?v=297",
    "./src/digging.js?v=297",
    "./src/building.js?v=297",
    "./src/refuge-lands.js?v=297",
    "./src/revenant-horde.js?v=297",
    "./src/stages.js?v=297",
    "./src/watcher.js?v=297",
    "./src/tyrant-hunt.js?v=297",
    "./src/world-beasts.js?v=297",
    "./src/elders.js?v=297",
    "./src/far-array.js?v=297",
    "./src/combat-visuals.js?v=297",
    "./src/dungeon-framework.js?v=297",
    "./src/elites.js?v=297",
    "./src/random.js?v=297",
    "./src/types.js?v=297",
    "./src/story.js?v=297",
    "./src/foundry.js?v=297",
    "./src/world.js?v=297",
    "./src/deep-dungeons.js?v=297",
    "./src/scenes.js?v=297",
    "./src/arenas.js?v=297",
    "./src/items.js?v=297",
    "./src/combat.js?v=297",
    "./src/interactions.js?v=297",
    "./src/persistence.js?v=297",
    "./src/input.js?v=297",
    "./src/game.js?v=297",
    "./src/renderer.js?v=297",
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
