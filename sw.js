const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v325`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=325",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=325",
    "./src/proving-ground.js?v=325",
    "./src/proving-ground-fixtures.js?v=325",
    "./src/proving-ground-labs.js?v=325",
    "./src/dungeon-variation.js?v=325",
    "./src/dungeon-completion.js?v=325",
    "./src/enemy-patterns.js?v=325",
    "./src/monster-pack.js?v=325",
    "./src/monster-render.js?v=325",
    "./src/astral-worm.js?v=325",
    "./src/astral-worm-render.js?v=325",
    "./src/astral-worm-retreat.js?v=325",
    "./src/astral-worm-mount.js?v=325",
    "./src/lightning-giant-render.js?v=325",
    "./src/astral-encounters.js?v=325",
    "./src/astral-world-retreat.js?v=325",
    "./src/landscape.js?v=325",
    "./src/landscape-render.js?v=325",
    "./src/underlands.js?v=325",
    "./src/pattern-dungeons.js?v=325",
    "./src/relay-network.js?v=325",
    "./src/glyphs.js?v=325",
    "./src/echoes.js?v=325",
    "./src/constellation.js?v=325",
    "./src/water-traversal.js?v=325",
    "./src/open-sea.js?v=325",
    "./src/boats.js?v=325",
    "./src/sea-creatures.js?v=325",
    "./src/diving.js?v=325",
    "./src/grottoes.js?v=325",
    "./src/spell-slots.js?v=325",
    "./src/settlements.js?v=325",
    "./src/skirmishes.js?v=325",
    "./src/travelers.js?v=325",
    "./src/diagnostic-probe.js?v=325",
    "./src/questing-beast.js?v=325",
    "./src/recitations.js?v=325",
    "./src/lore.js?v=325",
    "./src/glimpses.js?v=325",
    "./src/glimpse-render.js?v=325",
    "./src/glimpse-paint.js?v=325",
    "./src/glimpse-scenes.js?v=325",
    "./src/glimpse-horror.js?v=325",
    "./src/glimpse-legend.js?v=325",
    "./src/glimpse-hand.js?v=325",
    "./src/atlas-view.js?v=325",
    "./src/strange.js?v=325",
    "./src/linked-dungeons.js?v=325",
    "./src/digging.js?v=325",
    "./src/building.js?v=325",
    "./src/refuge-lands.js?v=325",
    "./src/revenant-horde.js?v=325",
    "./src/stages.js?v=325",
    "./src/watcher.js?v=325",
    "./src/vehicle-gates.js?v=325",
    "./src/dungeon-ladder.js?v=325",
    "./src/tyrant-hunt.js?v=325",
    "./src/world-beasts.js?v=325",
    "./src/elders.js?v=325",
    "./src/far-array.js?v=325",
    "./src/combat-visuals.js?v=325",
    "./src/dungeon-framework.js?v=325",
    "./src/elites.js?v=325",
    "./src/random.js?v=325",
    "./src/types.js?v=325",
    "./src/story.js?v=325",
    "./src/foundry.js?v=325",
    "./src/world.js?v=325",
    "./src/deep-dungeons.js?v=325",
    "./src/scenes.js?v=325",
    "./src/arenas.js?v=325",
    "./src/items.js?v=325",
    "./src/combat.js?v=325",
    "./src/interactions.js?v=325",
    "./src/persistence.js?v=325",
    "./src/input.js?v=325",
    "./src/game.js?v=325",
    "./src/renderer.js?v=325",
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
