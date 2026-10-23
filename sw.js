const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v333`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=333",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=333",
    "./src/proving-ground.js?v=333",
    "./src/proving-ground-fixtures.js?v=333",
    "./src/proving-ground-labs.js?v=333",
    "./src/dungeon-variation.js?v=333",
    "./src/dungeon-completion.js?v=333",
    "./src/enemy-patterns.js?v=333",
    "./src/monster-pack.js?v=333",
    "./src/monster-render.js?v=333",
    "./src/astral-worm.js?v=333",
    "./src/astral-worm-render.js?v=333",
    "./src/astral-worm-retreat.js?v=333",
    "./src/astral-worm-mount.js?v=333",
    "./src/lightning-giant-render.js?v=333",
    "./src/astral-encounters.js?v=333",
    "./src/astral-world-retreat.js?v=333",
    "./src/landscape.js?v=333",
    "./src/landscape-render.js?v=333",
    "./src/underlands.js?v=333",
    "./src/pattern-dungeons.js?v=333",
    "./src/relay-network.js?v=333",
    "./src/glyphs.js?v=333",
    "./src/echoes.js?v=333",
    "./src/constellation.js?v=333",
    "./src/water-traversal.js?v=333",
    "./src/open-sea.js?v=333",
    "./src/boats.js?v=333",
    "./src/sea-creatures.js?v=333",
    "./src/diving.js?v=333",
    "./src/grottoes.js?v=333",
    "./src/spell-slots.js?v=333",
    "./src/settlements.js?v=333",
    "./src/skirmishes.js?v=333",
    "./src/travelers.js?v=333",
    "./src/diagnostic-probe.js?v=333",
    "./src/questing-beast.js?v=333",
    "./src/recitations.js?v=333",
    "./src/lore.js?v=333",
    "./src/glimpses.js?v=333",
    "./src/glimpse-render.js?v=333",
    "./src/glimpse-paint.js?v=333",
    "./src/glimpse-scenes.js?v=333",
    "./src/glimpse-horror.js?v=333",
    "./src/glimpse-legend.js?v=333",
    "./src/glimpse-hand.js?v=333",
    "./src/atlas-view.js?v=333",
    "./src/strange.js?v=333",
    "./src/linked-dungeons.js?v=333",
    "./src/digging.js?v=333",
    "./src/building.js?v=333",
    "./src/refuge-lands.js?v=333",
    "./src/revenant-horde.js?v=333",
    "./src/stages.js?v=333",
    "./src/watcher.js?v=333",
    "./src/vehicle-gates.js?v=333",
    "./src/dungeon-ladder.js?v=333",
    "./src/tyrant-hunt.js?v=333",
    "./src/world-beasts.js?v=333",
    "./src/elders.js?v=333",
    "./src/far-array.js?v=333",
    "./src/combat-visuals.js?v=333",
    "./src/dungeon-framework.js?v=333",
    "./src/elites.js?v=333",
    "./src/random.js?v=333",
    "./src/types.js?v=333",
    "./src/story.js?v=333",
    "./src/foundry.js?v=333",
    "./src/world.js?v=333",
    "./src/deep-dungeons.js?v=333",
    "./src/scenes.js?v=333",
    "./src/arenas.js?v=333",
    "./src/items.js?v=333",
    "./src/combat.js?v=333",
    "./src/interactions.js?v=333",
    "./src/persistence.js?v=333",
    "./src/input.js?v=333",
    "./src/game.js?v=333",
    "./src/renderer.js?v=333",
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
