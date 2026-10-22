const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v291`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=291",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=291",
    "./src/proving-ground.js?v=291",
    "./src/proving-ground-fixtures.js?v=291",
    "./src/proving-ground-labs.js?v=291",
    "./src/dungeon-variation.js?v=291",
    "./src/dungeon-completion.js?v=291",
    "./src/enemy-patterns.js?v=291",
    "./src/monster-pack.js?v=291",
    "./src/monster-render.js?v=291",
    "./src/astral-worm.js?v=291",
    "./src/astral-worm-render.js?v=291",
    "./src/astral-worm-retreat.js?v=291",
    "./src/astral-worm-mount.js?v=291",
    "./src/lightning-giant-render.js?v=291",
    "./src/astral-encounters.js?v=291",
    "./src/astral-world-retreat.js?v=291",
    "./src/landscape.js?v=291",
    "./src/landscape-render.js?v=291",
    "./src/underlands.js?v=291",
    "./src/pattern-dungeons.js?v=291",
    "./src/relay-network.js?v=291",
    "./src/glyphs.js?v=291",
    "./src/echoes.js?v=291",
    "./src/constellation.js?v=291",
    "./src/water-traversal.js?v=291",
    "./src/open-sea.js?v=291",
    "./src/boats.js?v=291",
    "./src/sea-creatures.js?v=291",
    "./src/diving.js?v=291",
    "./src/grottoes.js?v=291",
    "./src/spell-slots.js?v=291",
    "./src/settlements.js?v=291",
    "./src/skirmishes.js?v=291",
    "./src/travelers.js?v=291",
    "./src/diagnostic-probe.js?v=291",
    "./src/questing-beast.js?v=291",
    "./src/recitations.js?v=291",
    "./src/lore.js?v=291",
    "./src/glimpses.js?v=291",
    "./src/glimpse-render.js?v=291",
    "./src/glimpse-paint.js?v=291",
    "./src/glimpse-scenes.js?v=291",
    "./src/glimpse-horror.js?v=291",
    "./src/glimpse-legend.js?v=291",
    "./src/glimpse-hand.js?v=291",
    "./src/atlas-view.js?v=291",
    "./src/strange.js?v=291",
    "./src/linked-dungeons.js?v=291",
    "./src/digging.js?v=291",
    "./src/building.js?v=291",
    "./src/refuge-lands.js?v=291",
    "./src/revenant-horde.js?v=291",
    "./src/stages.js?v=291",
    "./src/watcher.js?v=291",
    "./src/tyrant-hunt.js?v=291",
    "./src/world-beasts.js?v=291",
    "./src/elders.js?v=291",
    "./src/far-array.js?v=291",
    "./src/combat-visuals.js?v=291",
    "./src/dungeon-framework.js?v=291",
    "./src/elites.js?v=291",
    "./src/random.js?v=291",
    "./src/types.js?v=291",
    "./src/story.js?v=291",
    "./src/foundry.js?v=291",
    "./src/world.js?v=291",
    "./src/deep-dungeons.js?v=291",
    "./src/scenes.js?v=291",
    "./src/arenas.js?v=291",
    "./src/items.js?v=291",
    "./src/combat.js?v=291",
    "./src/interactions.js?v=291",
    "./src/persistence.js?v=291",
    "./src/input.js?v=291",
    "./src/game.js?v=291",
    "./src/renderer.js?v=291",
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
