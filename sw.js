const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r279-880fe40d0946`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r279-880fe40d0946",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r279-880fe40d0946",
    "./src/proving-ground.js?v=r279-880fe40d0946",
    "./src/proving-ground-fixtures.js?v=r279-880fe40d0946",
    "./src/proving-ground-labs.js?v=r279-880fe40d0946",
    "./src/dungeon-variation.js?v=r279-880fe40d0946",
    "./src/dungeon-completion.js?v=r279-880fe40d0946",
    "./src/enemy-patterns.js?v=r279-880fe40d0946",
    "./src/monster-pack.js?v=r279-880fe40d0946",
    "./src/monster-render.js?v=r279-880fe40d0946",
    "./src/astral-worm.js?v=r279-880fe40d0946",
    "./src/astral-worm-render.js?v=r279-880fe40d0946",
    "./src/astral-worm-retreat.js?v=r279-880fe40d0946",
    "./src/astral-worm-mount.js?v=r279-880fe40d0946",
    "./src/lightning-giant-render.js?v=r279-880fe40d0946",
    "./src/astral-encounters.js?v=r279-880fe40d0946",
    "./src/astral-world-retreat.js?v=r279-880fe40d0946",
    "./src/landscape.js?v=r279-880fe40d0946",
    "./src/landscape-render.js?v=r279-880fe40d0946",
    "./src/underlands.js?v=r279-880fe40d0946",
    "./src/pattern-dungeons.js?v=r279-880fe40d0946",
    "./src/relay-network.js?v=r279-880fe40d0946",
    "./src/glyphs.js?v=r279-880fe40d0946",
    "./src/echoes.js?v=r279-880fe40d0946",
    "./src/constellation.js?v=r279-880fe40d0946",
    "./src/water-traversal.js?v=r279-880fe40d0946",
    "./src/open-sea.js?v=r279-880fe40d0946",
    "./src/boats.js?v=r279-880fe40d0946",
    "./src/sea-creatures.js?v=r279-880fe40d0946",
    "./src/diving.js?v=r279-880fe40d0946",
    "./src/grottoes.js?v=r279-880fe40d0946",
    "./src/spell-slots.js?v=r279-880fe40d0946",
    "./src/settlements.js?v=r279-880fe40d0946",
    "./src/skirmishes.js?v=r279-880fe40d0946",
    "./src/travelers.js?v=r279-880fe40d0946",
    "./src/diagnostic-probe.js?v=r279-880fe40d0946",
    "./src/questing-beast.js?v=r279-880fe40d0946",
    "./src/recitations.js?v=r279-880fe40d0946",
    "./src/lore.js?v=r279-880fe40d0946",
    "./src/glimpses.js?v=r279-880fe40d0946",
    "./src/glimpse-render.js?v=r279-880fe40d0946",
    "./src/glimpse-paint.js?v=r279-880fe40d0946",
    "./src/glimpse-scenes.js?v=r279-880fe40d0946",
    "./src/glimpse-horror.js?v=r279-880fe40d0946",
    "./src/glimpse-legend.js?v=r279-880fe40d0946",
    "./src/glimpse-hand.js?v=r279-880fe40d0946",
    "./src/atlas-view.js?v=r279-880fe40d0946",
    "./src/strange.js?v=r279-880fe40d0946",
    "./src/linked-dungeons.js?v=r279-880fe40d0946",
    "./src/digging.js?v=r279-880fe40d0946",
    "./src/building.js?v=r279-880fe40d0946",
    "./src/refuge-lands.js?v=r279-880fe40d0946",
    "./src/revenant-horde.js?v=r279-880fe40d0946",
    "./src/stages.js?v=r279-880fe40d0946",
    "./src/tyrant-hunt.js?v=r279-880fe40d0946",
    "./src/world-beasts.js?v=r279-880fe40d0946",
    "./src/elders.js?v=r279-880fe40d0946",
    "./src/far-array.js?v=r279-880fe40d0946",
    "./src/combat-visuals.js?v=r279-880fe40d0946",
    "./src/dungeon-framework.js?v=r279-880fe40d0946",
    "./src/elites.js?v=r279-880fe40d0946",
    "./src/random.js?v=r279-880fe40d0946",
    "./src/types.js?v=r279-880fe40d0946",
    "./src/story.js?v=r279-880fe40d0946",
    "./src/foundry.js?v=r279-880fe40d0946",
    "./src/world.js?v=r279-880fe40d0946",
    "./src/deep-dungeons.js?v=r279-880fe40d0946",
    "./src/scenes.js?v=r279-880fe40d0946",
    "./src/arenas.js?v=r279-880fe40d0946",
    "./src/items.js?v=r279-880fe40d0946",
    "./src/combat.js?v=r279-880fe40d0946",
    "./src/interactions.js?v=r279-880fe40d0946",
    "./src/persistence.js?v=r279-880fe40d0946",
    "./src/input.js?v=r279-880fe40d0946",
    "./src/game.js?v=r279-880fe40d0946",
    "./src/renderer.js?v=r279-880fe40d0946",
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
