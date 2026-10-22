const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v329`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=329",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=329",
    "./src/proving-ground.js?v=329",
    "./src/proving-ground-fixtures.js?v=329",
    "./src/proving-ground-labs.js?v=329",
    "./src/dungeon-variation.js?v=329",
    "./src/dungeon-completion.js?v=329",
    "./src/enemy-patterns.js?v=329",
    "./src/monster-pack.js?v=329",
    "./src/monster-render.js?v=329",
    "./src/astral-worm.js?v=329",
    "./src/astral-worm-render.js?v=329",
    "./src/astral-worm-retreat.js?v=329",
    "./src/astral-worm-mount.js?v=329",
    "./src/lightning-giant-render.js?v=329",
    "./src/astral-encounters.js?v=329",
    "./src/astral-world-retreat.js?v=329",
    "./src/landscape.js?v=329",
    "./src/landscape-render.js?v=329",
    "./src/underlands.js?v=329",
    "./src/pattern-dungeons.js?v=329",
    "./src/relay-network.js?v=329",
    "./src/glyphs.js?v=329",
    "./src/echoes.js?v=329",
    "./src/constellation.js?v=329",
    "./src/water-traversal.js?v=329",
    "./src/open-sea.js?v=329",
    "./src/boats.js?v=329",
    "./src/sea-creatures.js?v=329",
    "./src/diving.js?v=329",
    "./src/grottoes.js?v=329",
    "./src/spell-slots.js?v=329",
    "./src/settlements.js?v=329",
    "./src/skirmishes.js?v=329",
    "./src/travelers.js?v=329",
    "./src/diagnostic-probe.js?v=329",
    "./src/questing-beast.js?v=329",
    "./src/recitations.js?v=329",
    "./src/lore.js?v=329",
    "./src/glimpses.js?v=329",
    "./src/glimpse-render.js?v=329",
    "./src/glimpse-paint.js?v=329",
    "./src/glimpse-scenes.js?v=329",
    "./src/glimpse-horror.js?v=329",
    "./src/glimpse-legend.js?v=329",
    "./src/glimpse-hand.js?v=329",
    "./src/atlas-view.js?v=329",
    "./src/strange.js?v=329",
    "./src/linked-dungeons.js?v=329",
    "./src/digging.js?v=329",
    "./src/building.js?v=329",
    "./src/refuge-lands.js?v=329",
    "./src/revenant-horde.js?v=329",
    "./src/stages.js?v=329",
    "./src/watcher.js?v=329",
    "./src/vehicle-gates.js?v=329",
    "./src/dungeon-ladder.js?v=329",
    "./src/tyrant-hunt.js?v=329",
    "./src/world-beasts.js?v=329",
    "./src/elders.js?v=329",
    "./src/far-array.js?v=329",
    "./src/combat-visuals.js?v=329",
    "./src/dungeon-framework.js?v=329",
    "./src/elites.js?v=329",
    "./src/random.js?v=329",
    "./src/types.js?v=329",
    "./src/story.js?v=329",
    "./src/foundry.js?v=329",
    "./src/world.js?v=329",
    "./src/deep-dungeons.js?v=329",
    "./src/scenes.js?v=329",
    "./src/arenas.js?v=329",
    "./src/items.js?v=329",
    "./src/combat.js?v=329",
    "./src/interactions.js?v=329",
    "./src/persistence.js?v=329",
    "./src/input.js?v=329",
    "./src/game.js?v=329",
    "./src/renderer.js?v=329",
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
