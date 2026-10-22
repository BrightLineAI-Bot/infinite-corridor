const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v307`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=307",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=307",
    "./src/proving-ground.js?v=307",
    "./src/proving-ground-fixtures.js?v=307",
    "./src/proving-ground-labs.js?v=307",
    "./src/dungeon-variation.js?v=307",
    "./src/dungeon-completion.js?v=307",
    "./src/enemy-patterns.js?v=307",
    "./src/monster-pack.js?v=307",
    "./src/monster-render.js?v=307",
    "./src/astral-worm.js?v=307",
    "./src/astral-worm-render.js?v=307",
    "./src/astral-worm-retreat.js?v=307",
    "./src/astral-worm-mount.js?v=307",
    "./src/lightning-giant-render.js?v=307",
    "./src/astral-encounters.js?v=307",
    "./src/astral-world-retreat.js?v=307",
    "./src/landscape.js?v=307",
    "./src/landscape-render.js?v=307",
    "./src/underlands.js?v=307",
    "./src/pattern-dungeons.js?v=307",
    "./src/relay-network.js?v=307",
    "./src/glyphs.js?v=307",
    "./src/echoes.js?v=307",
    "./src/constellation.js?v=307",
    "./src/water-traversal.js?v=307",
    "./src/open-sea.js?v=307",
    "./src/boats.js?v=307",
    "./src/sea-creatures.js?v=307",
    "./src/diving.js?v=307",
    "./src/grottoes.js?v=307",
    "./src/spell-slots.js?v=307",
    "./src/settlements.js?v=307",
    "./src/skirmishes.js?v=307",
    "./src/travelers.js?v=307",
    "./src/diagnostic-probe.js?v=307",
    "./src/questing-beast.js?v=307",
    "./src/recitations.js?v=307",
    "./src/lore.js?v=307",
    "./src/glimpses.js?v=307",
    "./src/glimpse-render.js?v=307",
    "./src/glimpse-paint.js?v=307",
    "./src/glimpse-scenes.js?v=307",
    "./src/glimpse-horror.js?v=307",
    "./src/glimpse-legend.js?v=307",
    "./src/glimpse-hand.js?v=307",
    "./src/atlas-view.js?v=307",
    "./src/strange.js?v=307",
    "./src/linked-dungeons.js?v=307",
    "./src/digging.js?v=307",
    "./src/building.js?v=307",
    "./src/refuge-lands.js?v=307",
    "./src/revenant-horde.js?v=307",
    "./src/stages.js?v=307",
    "./src/watcher.js?v=307",
    "./src/tyrant-hunt.js?v=307",
    "./src/world-beasts.js?v=307",
    "./src/elders.js?v=307",
    "./src/far-array.js?v=307",
    "./src/combat-visuals.js?v=307",
    "./src/dungeon-framework.js?v=307",
    "./src/elites.js?v=307",
    "./src/random.js?v=307",
    "./src/types.js?v=307",
    "./src/story.js?v=307",
    "./src/foundry.js?v=307",
    "./src/world.js?v=307",
    "./src/deep-dungeons.js?v=307",
    "./src/scenes.js?v=307",
    "./src/arenas.js?v=307",
    "./src/items.js?v=307",
    "./src/combat.js?v=307",
    "./src/interactions.js?v=307",
    "./src/persistence.js?v=307",
    "./src/input.js?v=307",
    "./src/game.js?v=307",
    "./src/renderer.js?v=307",
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
