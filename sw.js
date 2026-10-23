const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v361`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=361",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=361",
    "./src/proving-ground.js?v=361",
    "./src/proving-ground-fixtures.js?v=361",
    "./src/proving-ground-labs.js?v=361",
    "./src/dungeon-variation.js?v=361",
    "./src/dungeon-completion.js?v=361",
    "./src/enemy-patterns.js?v=361",
    "./src/monster-pack.js?v=361",
    "./src/monster-render.js?v=361",
    "./src/astral-worm.js?v=361",
    "./src/astral-worm-render.js?v=361",
    "./src/astral-worm-retreat.js?v=361",
    "./src/astral-worm-mount.js?v=361",
    "./src/lightning-giant-render.js?v=361",
    "./src/astral-encounters.js?v=361",
    "./src/astral-world-retreat.js?v=361",
    "./src/landscape.js?v=361",
    "./src/landscape-render.js?v=361",
    "./src/underlands.js?v=361",
    "./src/pattern-dungeons.js?v=361",
    "./src/relay-network.js?v=361",
    "./src/glyphs.js?v=361",
    "./src/echoes.js?v=361",
    "./src/constellation.js?v=361",
    "./src/water-traversal.js?v=361",
    "./src/open-sea.js?v=361",
    "./src/boats.js?v=361",
    "./src/sea-creatures.js?v=361",
    "./src/diving.js?v=361",
    "./src/grottoes.js?v=361",
    "./src/spell-slots.js?v=361",
    "./src/settlements.js?v=361",
    "./src/skirmishes.js?v=361",
    "./src/travelers.js?v=361",
    "./src/diagnostic-probe.js?v=361",
    "./src/questing-beast.js?v=361",
    "./src/recitations.js?v=361",
    "./src/lore.js?v=361",
    "./src/glimpses.js?v=361",
    "./src/glimpse-render.js?v=361",
    "./src/glimpse-paint.js?v=361",
    "./src/glimpse-scenes.js?v=361",
    "./src/glimpse-horror.js?v=361",
    "./src/glimpse-legend.js?v=361",
    "./src/glimpse-hand.js?v=361",
    "./src/atlas-view.js?v=361",
    "./src/strange.js?v=361",
    "./src/linked-dungeons.js?v=361",
    "./src/digging.js?v=361",
    "./src/building.js?v=361",
    "./src/refuge-lands.js?v=361",
    "./src/revenant-horde.js?v=361",
    "./src/stages.js?v=361",
    "./src/watcher.js?v=361",
    "./src/vehicle-gates.js?v=361",
    "./src/dungeon-ladder.js?v=361",
    "./src/potions.js?v=361",
    "./src/tyrant-hunt.js?v=361",
    "./src/world-beasts.js?v=361",
    "./src/elders.js?v=361",
    "./src/far-array.js?v=361",
    "./src/combat-visuals.js?v=361",
    "./src/dungeon-framework.js?v=361",
    "./src/elites.js?v=361",
    "./src/random.js?v=361",
    "./src/types.js?v=361",
    "./src/story.js?v=361",
    "./src/foundry.js?v=361",
    "./src/world.js?v=361",
    "./src/deep-dungeons.js?v=361",
    "./src/scenes.js?v=361",
    "./src/arenas.js?v=361",
    "./src/items.js?v=361",
    "./src/combat.js?v=361",
    "./src/interactions.js?v=361",
    "./src/persistence.js?v=361",
    "./src/input.js?v=361",
    "./src/game.js?v=361",
    "./src/renderer.js?v=361",
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
