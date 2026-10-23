const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v331`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=331",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=331",
    "./src/proving-ground.js?v=331",
    "./src/proving-ground-fixtures.js?v=331",
    "./src/proving-ground-labs.js?v=331",
    "./src/dungeon-variation.js?v=331",
    "./src/dungeon-completion.js?v=331",
    "./src/enemy-patterns.js?v=331",
    "./src/monster-pack.js?v=331",
    "./src/monster-render.js?v=331",
    "./src/astral-worm.js?v=331",
    "./src/astral-worm-render.js?v=331",
    "./src/astral-worm-retreat.js?v=331",
    "./src/astral-worm-mount.js?v=331",
    "./src/lightning-giant-render.js?v=331",
    "./src/astral-encounters.js?v=331",
    "./src/astral-world-retreat.js?v=331",
    "./src/landscape.js?v=331",
    "./src/landscape-render.js?v=331",
    "./src/underlands.js?v=331",
    "./src/pattern-dungeons.js?v=331",
    "./src/relay-network.js?v=331",
    "./src/glyphs.js?v=331",
    "./src/echoes.js?v=331",
    "./src/constellation.js?v=331",
    "./src/water-traversal.js?v=331",
    "./src/open-sea.js?v=331",
    "./src/boats.js?v=331",
    "./src/sea-creatures.js?v=331",
    "./src/diving.js?v=331",
    "./src/grottoes.js?v=331",
    "./src/spell-slots.js?v=331",
    "./src/settlements.js?v=331",
    "./src/skirmishes.js?v=331",
    "./src/travelers.js?v=331",
    "./src/diagnostic-probe.js?v=331",
    "./src/questing-beast.js?v=331",
    "./src/recitations.js?v=331",
    "./src/lore.js?v=331",
    "./src/glimpses.js?v=331",
    "./src/glimpse-render.js?v=331",
    "./src/glimpse-paint.js?v=331",
    "./src/glimpse-scenes.js?v=331",
    "./src/glimpse-horror.js?v=331",
    "./src/glimpse-legend.js?v=331",
    "./src/glimpse-hand.js?v=331",
    "./src/atlas-view.js?v=331",
    "./src/strange.js?v=331",
    "./src/linked-dungeons.js?v=331",
    "./src/digging.js?v=331",
    "./src/building.js?v=331",
    "./src/refuge-lands.js?v=331",
    "./src/revenant-horde.js?v=331",
    "./src/stages.js?v=331",
    "./src/watcher.js?v=331",
    "./src/vehicle-gates.js?v=331",
    "./src/dungeon-ladder.js?v=331",
    "./src/tyrant-hunt.js?v=331",
    "./src/world-beasts.js?v=331",
    "./src/elders.js?v=331",
    "./src/far-array.js?v=331",
    "./src/combat-visuals.js?v=331",
    "./src/dungeon-framework.js?v=331",
    "./src/elites.js?v=331",
    "./src/random.js?v=331",
    "./src/types.js?v=331",
    "./src/story.js?v=331",
    "./src/foundry.js?v=331",
    "./src/world.js?v=331",
    "./src/deep-dungeons.js?v=331",
    "./src/scenes.js?v=331",
    "./src/arenas.js?v=331",
    "./src/items.js?v=331",
    "./src/combat.js?v=331",
    "./src/interactions.js?v=331",
    "./src/persistence.js?v=331",
    "./src/input.js?v=331",
    "./src/game.js?v=331",
    "./src/renderer.js?v=331",
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
