const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v353`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=353",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=353",
    "./src/proving-ground.js?v=353",
    "./src/proving-ground-fixtures.js?v=353",
    "./src/proving-ground-labs.js?v=353",
    "./src/dungeon-variation.js?v=353",
    "./src/dungeon-completion.js?v=353",
    "./src/enemy-patterns.js?v=353",
    "./src/monster-pack.js?v=353",
    "./src/monster-render.js?v=353",
    "./src/astral-worm.js?v=353",
    "./src/astral-worm-render.js?v=353",
    "./src/astral-worm-retreat.js?v=353",
    "./src/astral-worm-mount.js?v=353",
    "./src/lightning-giant-render.js?v=353",
    "./src/astral-encounters.js?v=353",
    "./src/astral-world-retreat.js?v=353",
    "./src/landscape.js?v=353",
    "./src/landscape-render.js?v=353",
    "./src/underlands.js?v=353",
    "./src/pattern-dungeons.js?v=353",
    "./src/relay-network.js?v=353",
    "./src/glyphs.js?v=353",
    "./src/echoes.js?v=353",
    "./src/constellation.js?v=353",
    "./src/water-traversal.js?v=353",
    "./src/open-sea.js?v=353",
    "./src/boats.js?v=353",
    "./src/sea-creatures.js?v=353",
    "./src/diving.js?v=353",
    "./src/grottoes.js?v=353",
    "./src/spell-slots.js?v=353",
    "./src/settlements.js?v=353",
    "./src/skirmishes.js?v=353",
    "./src/travelers.js?v=353",
    "./src/diagnostic-probe.js?v=353",
    "./src/questing-beast.js?v=353",
    "./src/recitations.js?v=353",
    "./src/lore.js?v=353",
    "./src/glimpses.js?v=353",
    "./src/glimpse-render.js?v=353",
    "./src/glimpse-paint.js?v=353",
    "./src/glimpse-scenes.js?v=353",
    "./src/glimpse-horror.js?v=353",
    "./src/glimpse-legend.js?v=353",
    "./src/glimpse-hand.js?v=353",
    "./src/atlas-view.js?v=353",
    "./src/strange.js?v=353",
    "./src/linked-dungeons.js?v=353",
    "./src/digging.js?v=353",
    "./src/building.js?v=353",
    "./src/refuge-lands.js?v=353",
    "./src/revenant-horde.js?v=353",
    "./src/stages.js?v=353",
    "./src/watcher.js?v=353",
    "./src/vehicle-gates.js?v=353",
    "./src/dungeon-ladder.js?v=353",
    "./src/potions.js?v=353",
    "./src/tyrant-hunt.js?v=353",
    "./src/world-beasts.js?v=353",
    "./src/elders.js?v=353",
    "./src/far-array.js?v=353",
    "./src/combat-visuals.js?v=353",
    "./src/dungeon-framework.js?v=353",
    "./src/elites.js?v=353",
    "./src/random.js?v=353",
    "./src/types.js?v=353",
    "./src/story.js?v=353",
    "./src/foundry.js?v=353",
    "./src/world.js?v=353",
    "./src/deep-dungeons.js?v=353",
    "./src/scenes.js?v=353",
    "./src/arenas.js?v=353",
    "./src/items.js?v=353",
    "./src/combat.js?v=353",
    "./src/interactions.js?v=353",
    "./src/persistence.js?v=353",
    "./src/input.js?v=353",
    "./src/game.js?v=353",
    "./src/renderer.js?v=353",
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
