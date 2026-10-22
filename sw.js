const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v327`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=327",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=327",
    "./src/proving-ground.js?v=327",
    "./src/proving-ground-fixtures.js?v=327",
    "./src/proving-ground-labs.js?v=327",
    "./src/dungeon-variation.js?v=327",
    "./src/dungeon-completion.js?v=327",
    "./src/enemy-patterns.js?v=327",
    "./src/monster-pack.js?v=327",
    "./src/monster-render.js?v=327",
    "./src/astral-worm.js?v=327",
    "./src/astral-worm-render.js?v=327",
    "./src/astral-worm-retreat.js?v=327",
    "./src/astral-worm-mount.js?v=327",
    "./src/lightning-giant-render.js?v=327",
    "./src/astral-encounters.js?v=327",
    "./src/astral-world-retreat.js?v=327",
    "./src/landscape.js?v=327",
    "./src/landscape-render.js?v=327",
    "./src/underlands.js?v=327",
    "./src/pattern-dungeons.js?v=327",
    "./src/relay-network.js?v=327",
    "./src/glyphs.js?v=327",
    "./src/echoes.js?v=327",
    "./src/constellation.js?v=327",
    "./src/water-traversal.js?v=327",
    "./src/open-sea.js?v=327",
    "./src/boats.js?v=327",
    "./src/sea-creatures.js?v=327",
    "./src/diving.js?v=327",
    "./src/grottoes.js?v=327",
    "./src/spell-slots.js?v=327",
    "./src/settlements.js?v=327",
    "./src/skirmishes.js?v=327",
    "./src/travelers.js?v=327",
    "./src/diagnostic-probe.js?v=327",
    "./src/questing-beast.js?v=327",
    "./src/recitations.js?v=327",
    "./src/lore.js?v=327",
    "./src/glimpses.js?v=327",
    "./src/glimpse-render.js?v=327",
    "./src/glimpse-paint.js?v=327",
    "./src/glimpse-scenes.js?v=327",
    "./src/glimpse-horror.js?v=327",
    "./src/glimpse-legend.js?v=327",
    "./src/glimpse-hand.js?v=327",
    "./src/atlas-view.js?v=327",
    "./src/strange.js?v=327",
    "./src/linked-dungeons.js?v=327",
    "./src/digging.js?v=327",
    "./src/building.js?v=327",
    "./src/refuge-lands.js?v=327",
    "./src/revenant-horde.js?v=327",
    "./src/stages.js?v=327",
    "./src/watcher.js?v=327",
    "./src/vehicle-gates.js?v=327",
    "./src/dungeon-ladder.js?v=327",
    "./src/tyrant-hunt.js?v=327",
    "./src/world-beasts.js?v=327",
    "./src/elders.js?v=327",
    "./src/far-array.js?v=327",
    "./src/combat-visuals.js?v=327",
    "./src/dungeon-framework.js?v=327",
    "./src/elites.js?v=327",
    "./src/random.js?v=327",
    "./src/types.js?v=327",
    "./src/story.js?v=327",
    "./src/foundry.js?v=327",
    "./src/world.js?v=327",
    "./src/deep-dungeons.js?v=327",
    "./src/scenes.js?v=327",
    "./src/arenas.js?v=327",
    "./src/items.js?v=327",
    "./src/combat.js?v=327",
    "./src/interactions.js?v=327",
    "./src/persistence.js?v=327",
    "./src/input.js?v=327",
    "./src/game.js?v=327",
    "./src/renderer.js?v=327",
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
