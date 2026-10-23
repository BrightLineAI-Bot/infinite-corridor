const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v345`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=345",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=345",
    "./src/proving-ground.js?v=345",
    "./src/proving-ground-fixtures.js?v=345",
    "./src/proving-ground-labs.js?v=345",
    "./src/dungeon-variation.js?v=345",
    "./src/dungeon-completion.js?v=345",
    "./src/enemy-patterns.js?v=345",
    "./src/monster-pack.js?v=345",
    "./src/monster-render.js?v=345",
    "./src/astral-worm.js?v=345",
    "./src/astral-worm-render.js?v=345",
    "./src/astral-worm-retreat.js?v=345",
    "./src/astral-worm-mount.js?v=345",
    "./src/lightning-giant-render.js?v=345",
    "./src/astral-encounters.js?v=345",
    "./src/astral-world-retreat.js?v=345",
    "./src/landscape.js?v=345",
    "./src/landscape-render.js?v=345",
    "./src/underlands.js?v=345",
    "./src/pattern-dungeons.js?v=345",
    "./src/relay-network.js?v=345",
    "./src/glyphs.js?v=345",
    "./src/echoes.js?v=345",
    "./src/constellation.js?v=345",
    "./src/water-traversal.js?v=345",
    "./src/open-sea.js?v=345",
    "./src/boats.js?v=345",
    "./src/sea-creatures.js?v=345",
    "./src/diving.js?v=345",
    "./src/grottoes.js?v=345",
    "./src/spell-slots.js?v=345",
    "./src/settlements.js?v=345",
    "./src/skirmishes.js?v=345",
    "./src/travelers.js?v=345",
    "./src/diagnostic-probe.js?v=345",
    "./src/questing-beast.js?v=345",
    "./src/recitations.js?v=345",
    "./src/lore.js?v=345",
    "./src/glimpses.js?v=345",
    "./src/glimpse-render.js?v=345",
    "./src/glimpse-paint.js?v=345",
    "./src/glimpse-scenes.js?v=345",
    "./src/glimpse-horror.js?v=345",
    "./src/glimpse-legend.js?v=345",
    "./src/glimpse-hand.js?v=345",
    "./src/atlas-view.js?v=345",
    "./src/strange.js?v=345",
    "./src/linked-dungeons.js?v=345",
    "./src/digging.js?v=345",
    "./src/building.js?v=345",
    "./src/refuge-lands.js?v=345",
    "./src/revenant-horde.js?v=345",
    "./src/stages.js?v=345",
    "./src/watcher.js?v=345",
    "./src/vehicle-gates.js?v=345",
    "./src/dungeon-ladder.js?v=345",
    "./src/potions.js?v=345",
    "./src/tyrant-hunt.js?v=345",
    "./src/world-beasts.js?v=345",
    "./src/elders.js?v=345",
    "./src/far-array.js?v=345",
    "./src/combat-visuals.js?v=345",
    "./src/dungeon-framework.js?v=345",
    "./src/elites.js?v=345",
    "./src/random.js?v=345",
    "./src/types.js?v=345",
    "./src/story.js?v=345",
    "./src/foundry.js?v=345",
    "./src/world.js?v=345",
    "./src/deep-dungeons.js?v=345",
    "./src/scenes.js?v=345",
    "./src/arenas.js?v=345",
    "./src/items.js?v=345",
    "./src/combat.js?v=345",
    "./src/interactions.js?v=345",
    "./src/persistence.js?v=345",
    "./src/input.js?v=345",
    "./src/game.js?v=345",
    "./src/renderer.js?v=345",
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
