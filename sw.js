const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v359`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=359",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=359",
    "./src/proving-ground.js?v=359",
    "./src/proving-ground-fixtures.js?v=359",
    "./src/proving-ground-labs.js?v=359",
    "./src/dungeon-variation.js?v=359",
    "./src/dungeon-completion.js?v=359",
    "./src/enemy-patterns.js?v=359",
    "./src/monster-pack.js?v=359",
    "./src/monster-render.js?v=359",
    "./src/astral-worm.js?v=359",
    "./src/astral-worm-render.js?v=359",
    "./src/astral-worm-retreat.js?v=359",
    "./src/astral-worm-mount.js?v=359",
    "./src/lightning-giant-render.js?v=359",
    "./src/astral-encounters.js?v=359",
    "./src/astral-world-retreat.js?v=359",
    "./src/landscape.js?v=359",
    "./src/landscape-render.js?v=359",
    "./src/underlands.js?v=359",
    "./src/pattern-dungeons.js?v=359",
    "./src/relay-network.js?v=359",
    "./src/glyphs.js?v=359",
    "./src/echoes.js?v=359",
    "./src/constellation.js?v=359",
    "./src/water-traversal.js?v=359",
    "./src/open-sea.js?v=359",
    "./src/boats.js?v=359",
    "./src/sea-creatures.js?v=359",
    "./src/diving.js?v=359",
    "./src/grottoes.js?v=359",
    "./src/spell-slots.js?v=359",
    "./src/settlements.js?v=359",
    "./src/skirmishes.js?v=359",
    "./src/travelers.js?v=359",
    "./src/diagnostic-probe.js?v=359",
    "./src/questing-beast.js?v=359",
    "./src/recitations.js?v=359",
    "./src/lore.js?v=359",
    "./src/glimpses.js?v=359",
    "./src/glimpse-render.js?v=359",
    "./src/glimpse-paint.js?v=359",
    "./src/glimpse-scenes.js?v=359",
    "./src/glimpse-horror.js?v=359",
    "./src/glimpse-legend.js?v=359",
    "./src/glimpse-hand.js?v=359",
    "./src/atlas-view.js?v=359",
    "./src/strange.js?v=359",
    "./src/linked-dungeons.js?v=359",
    "./src/digging.js?v=359",
    "./src/building.js?v=359",
    "./src/refuge-lands.js?v=359",
    "./src/revenant-horde.js?v=359",
    "./src/stages.js?v=359",
    "./src/watcher.js?v=359",
    "./src/vehicle-gates.js?v=359",
    "./src/dungeon-ladder.js?v=359",
    "./src/potions.js?v=359",
    "./src/tyrant-hunt.js?v=359",
    "./src/world-beasts.js?v=359",
    "./src/elders.js?v=359",
    "./src/far-array.js?v=359",
    "./src/combat-visuals.js?v=359",
    "./src/dungeon-framework.js?v=359",
    "./src/elites.js?v=359",
    "./src/random.js?v=359",
    "./src/types.js?v=359",
    "./src/story.js?v=359",
    "./src/foundry.js?v=359",
    "./src/world.js?v=359",
    "./src/deep-dungeons.js?v=359",
    "./src/scenes.js?v=359",
    "./src/arenas.js?v=359",
    "./src/items.js?v=359",
    "./src/combat.js?v=359",
    "./src/interactions.js?v=359",
    "./src/persistence.js?v=359",
    "./src/input.js?v=359",
    "./src/game.js?v=359",
    "./src/renderer.js?v=359",
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
