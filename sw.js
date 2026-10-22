const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v315`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=315",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=315",
    "./src/proving-ground.js?v=315",
    "./src/proving-ground-fixtures.js?v=315",
    "./src/proving-ground-labs.js?v=315",
    "./src/dungeon-variation.js?v=315",
    "./src/dungeon-completion.js?v=315",
    "./src/enemy-patterns.js?v=315",
    "./src/monster-pack.js?v=315",
    "./src/monster-render.js?v=315",
    "./src/astral-worm.js?v=315",
    "./src/astral-worm-render.js?v=315",
    "./src/astral-worm-retreat.js?v=315",
    "./src/astral-worm-mount.js?v=315",
    "./src/lightning-giant-render.js?v=315",
    "./src/astral-encounters.js?v=315",
    "./src/astral-world-retreat.js?v=315",
    "./src/landscape.js?v=315",
    "./src/landscape-render.js?v=315",
    "./src/underlands.js?v=315",
    "./src/pattern-dungeons.js?v=315",
    "./src/relay-network.js?v=315",
    "./src/glyphs.js?v=315",
    "./src/echoes.js?v=315",
    "./src/constellation.js?v=315",
    "./src/water-traversal.js?v=315",
    "./src/open-sea.js?v=315",
    "./src/boats.js?v=315",
    "./src/sea-creatures.js?v=315",
    "./src/diving.js?v=315",
    "./src/grottoes.js?v=315",
    "./src/spell-slots.js?v=315",
    "./src/settlements.js?v=315",
    "./src/skirmishes.js?v=315",
    "./src/travelers.js?v=315",
    "./src/diagnostic-probe.js?v=315",
    "./src/questing-beast.js?v=315",
    "./src/recitations.js?v=315",
    "./src/lore.js?v=315",
    "./src/glimpses.js?v=315",
    "./src/glimpse-render.js?v=315",
    "./src/glimpse-paint.js?v=315",
    "./src/glimpse-scenes.js?v=315",
    "./src/glimpse-horror.js?v=315",
    "./src/glimpse-legend.js?v=315",
    "./src/glimpse-hand.js?v=315",
    "./src/atlas-view.js?v=315",
    "./src/strange.js?v=315",
    "./src/linked-dungeons.js?v=315",
    "./src/digging.js?v=315",
    "./src/building.js?v=315",
    "./src/refuge-lands.js?v=315",
    "./src/revenant-horde.js?v=315",
    "./src/stages.js?v=315",
    "./src/watcher.js?v=315",
    "./src/vehicle-gates.js?v=315",
    "./src/tyrant-hunt.js?v=315",
    "./src/world-beasts.js?v=315",
    "./src/elders.js?v=315",
    "./src/far-array.js?v=315",
    "./src/combat-visuals.js?v=315",
    "./src/dungeon-framework.js?v=315",
    "./src/elites.js?v=315",
    "./src/random.js?v=315",
    "./src/types.js?v=315",
    "./src/story.js?v=315",
    "./src/foundry.js?v=315",
    "./src/world.js?v=315",
    "./src/deep-dungeons.js?v=315",
    "./src/scenes.js?v=315",
    "./src/arenas.js?v=315",
    "./src/items.js?v=315",
    "./src/combat.js?v=315",
    "./src/interactions.js?v=315",
    "./src/persistence.js?v=315",
    "./src/input.js?v=315",
    "./src/game.js?v=315",
    "./src/renderer.js?v=315",
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
