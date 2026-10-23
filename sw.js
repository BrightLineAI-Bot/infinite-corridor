const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v355`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=355",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=355",
    "./src/proving-ground.js?v=355",
    "./src/proving-ground-fixtures.js?v=355",
    "./src/proving-ground-labs.js?v=355",
    "./src/dungeon-variation.js?v=355",
    "./src/dungeon-completion.js?v=355",
    "./src/enemy-patterns.js?v=355",
    "./src/monster-pack.js?v=355",
    "./src/monster-render.js?v=355",
    "./src/astral-worm.js?v=355",
    "./src/astral-worm-render.js?v=355",
    "./src/astral-worm-retreat.js?v=355",
    "./src/astral-worm-mount.js?v=355",
    "./src/lightning-giant-render.js?v=355",
    "./src/astral-encounters.js?v=355",
    "./src/astral-world-retreat.js?v=355",
    "./src/landscape.js?v=355",
    "./src/landscape-render.js?v=355",
    "./src/underlands.js?v=355",
    "./src/pattern-dungeons.js?v=355",
    "./src/relay-network.js?v=355",
    "./src/glyphs.js?v=355",
    "./src/echoes.js?v=355",
    "./src/constellation.js?v=355",
    "./src/water-traversal.js?v=355",
    "./src/open-sea.js?v=355",
    "./src/boats.js?v=355",
    "./src/sea-creatures.js?v=355",
    "./src/diving.js?v=355",
    "./src/grottoes.js?v=355",
    "./src/spell-slots.js?v=355",
    "./src/settlements.js?v=355",
    "./src/skirmishes.js?v=355",
    "./src/travelers.js?v=355",
    "./src/diagnostic-probe.js?v=355",
    "./src/questing-beast.js?v=355",
    "./src/recitations.js?v=355",
    "./src/lore.js?v=355",
    "./src/glimpses.js?v=355",
    "./src/glimpse-render.js?v=355",
    "./src/glimpse-paint.js?v=355",
    "./src/glimpse-scenes.js?v=355",
    "./src/glimpse-horror.js?v=355",
    "./src/glimpse-legend.js?v=355",
    "./src/glimpse-hand.js?v=355",
    "./src/atlas-view.js?v=355",
    "./src/strange.js?v=355",
    "./src/linked-dungeons.js?v=355",
    "./src/digging.js?v=355",
    "./src/building.js?v=355",
    "./src/refuge-lands.js?v=355",
    "./src/revenant-horde.js?v=355",
    "./src/stages.js?v=355",
    "./src/watcher.js?v=355",
    "./src/vehicle-gates.js?v=355",
    "./src/dungeon-ladder.js?v=355",
    "./src/potions.js?v=355",
    "./src/tyrant-hunt.js?v=355",
    "./src/world-beasts.js?v=355",
    "./src/elders.js?v=355",
    "./src/far-array.js?v=355",
    "./src/combat-visuals.js?v=355",
    "./src/dungeon-framework.js?v=355",
    "./src/elites.js?v=355",
    "./src/random.js?v=355",
    "./src/types.js?v=355",
    "./src/story.js?v=355",
    "./src/foundry.js?v=355",
    "./src/world.js?v=355",
    "./src/deep-dungeons.js?v=355",
    "./src/scenes.js?v=355",
    "./src/arenas.js?v=355",
    "./src/items.js?v=355",
    "./src/combat.js?v=355",
    "./src/interactions.js?v=355",
    "./src/persistence.js?v=355",
    "./src/input.js?v=355",
    "./src/game.js?v=355",
    "./src/renderer.js?v=355",
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
