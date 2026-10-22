const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v289`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=289",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=289",
    "./src/proving-ground.js?v=289",
    "./src/proving-ground-fixtures.js?v=289",
    "./src/proving-ground-labs.js?v=289",
    "./src/dungeon-variation.js?v=289",
    "./src/dungeon-completion.js?v=289",
    "./src/enemy-patterns.js?v=289",
    "./src/monster-pack.js?v=289",
    "./src/monster-render.js?v=289",
    "./src/astral-worm.js?v=289",
    "./src/astral-worm-render.js?v=289",
    "./src/astral-worm-retreat.js?v=289",
    "./src/astral-worm-mount.js?v=289",
    "./src/lightning-giant-render.js?v=289",
    "./src/astral-encounters.js?v=289",
    "./src/astral-world-retreat.js?v=289",
    "./src/landscape.js?v=289",
    "./src/landscape-render.js?v=289",
    "./src/underlands.js?v=289",
    "./src/pattern-dungeons.js?v=289",
    "./src/relay-network.js?v=289",
    "./src/glyphs.js?v=289",
    "./src/echoes.js?v=289",
    "./src/constellation.js?v=289",
    "./src/water-traversal.js?v=289",
    "./src/open-sea.js?v=289",
    "./src/boats.js?v=289",
    "./src/sea-creatures.js?v=289",
    "./src/diving.js?v=289",
    "./src/grottoes.js?v=289",
    "./src/spell-slots.js?v=289",
    "./src/settlements.js?v=289",
    "./src/skirmishes.js?v=289",
    "./src/travelers.js?v=289",
    "./src/diagnostic-probe.js?v=289",
    "./src/questing-beast.js?v=289",
    "./src/recitations.js?v=289",
    "./src/lore.js?v=289",
    "./src/glimpses.js?v=289",
    "./src/glimpse-render.js?v=289",
    "./src/glimpse-paint.js?v=289",
    "./src/glimpse-scenes.js?v=289",
    "./src/glimpse-horror.js?v=289",
    "./src/glimpse-legend.js?v=289",
    "./src/glimpse-hand.js?v=289",
    "./src/atlas-view.js?v=289",
    "./src/strange.js?v=289",
    "./src/linked-dungeons.js?v=289",
    "./src/digging.js?v=289",
    "./src/building.js?v=289",
    "./src/refuge-lands.js?v=289",
    "./src/revenant-horde.js?v=289",
    "./src/stages.js?v=289",
    "./src/watcher.js?v=289",
    "./src/tyrant-hunt.js?v=289",
    "./src/world-beasts.js?v=289",
    "./src/elders.js?v=289",
    "./src/far-array.js?v=289",
    "./src/combat-visuals.js?v=289",
    "./src/dungeon-framework.js?v=289",
    "./src/elites.js?v=289",
    "./src/random.js?v=289",
    "./src/types.js?v=289",
    "./src/story.js?v=289",
    "./src/foundry.js?v=289",
    "./src/world.js?v=289",
    "./src/deep-dungeons.js?v=289",
    "./src/scenes.js?v=289",
    "./src/arenas.js?v=289",
    "./src/items.js?v=289",
    "./src/combat.js?v=289",
    "./src/interactions.js?v=289",
    "./src/persistence.js?v=289",
    "./src/input.js?v=289",
    "./src/game.js?v=289",
    "./src/renderer.js?v=289",
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
