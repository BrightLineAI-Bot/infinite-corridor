const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r271-ad06c7fbd51e`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r271-ad06c7fbd51e",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r271-ad06c7fbd51e",
    "./src/proving-ground.js?v=r271-ad06c7fbd51e",
    "./src/proving-ground-fixtures.js?v=r271-ad06c7fbd51e",
    "./src/proving-ground-labs.js?v=r271-ad06c7fbd51e",
    "./src/dungeon-variation.js?v=r271-ad06c7fbd51e",
    "./src/dungeon-completion.js?v=r271-ad06c7fbd51e",
    "./src/enemy-patterns.js?v=r271-ad06c7fbd51e",
    "./src/monster-pack.js?v=r271-ad06c7fbd51e",
    "./src/monster-render.js?v=r271-ad06c7fbd51e",
    "./src/astral-worm.js?v=r271-ad06c7fbd51e",
    "./src/astral-worm-render.js?v=r271-ad06c7fbd51e",
    "./src/astral-worm-retreat.js?v=r271-ad06c7fbd51e",
    "./src/astral-worm-mount.js?v=r271-ad06c7fbd51e",
    "./src/lightning-giant-render.js?v=r271-ad06c7fbd51e",
    "./src/astral-encounters.js?v=r271-ad06c7fbd51e",
    "./src/astral-world-retreat.js?v=r271-ad06c7fbd51e",
    "./src/landscape.js?v=r271-ad06c7fbd51e",
    "./src/landscape-render.js?v=r271-ad06c7fbd51e",
    "./src/underlands.js?v=r271-ad06c7fbd51e",
    "./src/pattern-dungeons.js?v=r271-ad06c7fbd51e",
    "./src/relay-network.js?v=r271-ad06c7fbd51e",
    "./src/glyphs.js?v=r271-ad06c7fbd51e",
    "./src/echoes.js?v=r271-ad06c7fbd51e",
    "./src/constellation.js?v=r271-ad06c7fbd51e",
    "./src/water-traversal.js?v=r271-ad06c7fbd51e",
    "./src/open-sea.js?v=r271-ad06c7fbd51e",
    "./src/boats.js?v=r271-ad06c7fbd51e",
    "./src/sea-creatures.js?v=r271-ad06c7fbd51e",
    "./src/diving.js?v=r271-ad06c7fbd51e",
    "./src/grottoes.js?v=r271-ad06c7fbd51e",
    "./src/spell-slots.js?v=r271-ad06c7fbd51e",
    "./src/settlements.js?v=r271-ad06c7fbd51e",
    "./src/skirmishes.js?v=r271-ad06c7fbd51e",
    "./src/travelers.js?v=r271-ad06c7fbd51e",
    "./src/diagnostic-probe.js?v=r271-ad06c7fbd51e",
    "./src/questing-beast.js?v=r271-ad06c7fbd51e",
    "./src/recitations.js?v=r271-ad06c7fbd51e",
    "./src/lore.js?v=r271-ad06c7fbd51e",
    "./src/glimpses.js?v=r271-ad06c7fbd51e",
    "./src/glimpse-render.js?v=r271-ad06c7fbd51e",
    "./src/glimpse-paint.js?v=r271-ad06c7fbd51e",
    "./src/glimpse-scenes.js?v=r271-ad06c7fbd51e",
    "./src/glimpse-horror.js?v=r271-ad06c7fbd51e",
    "./src/glimpse-legend.js?v=r271-ad06c7fbd51e",
    "./src/glimpse-hand.js?v=r271-ad06c7fbd51e",
    "./src/atlas-view.js?v=r271-ad06c7fbd51e",
    "./src/strange.js?v=r271-ad06c7fbd51e",
    "./src/linked-dungeons.js?v=r271-ad06c7fbd51e",
    "./src/digging.js?v=r271-ad06c7fbd51e",
    "./src/building.js?v=r271-ad06c7fbd51e",
    "./src/refuge-lands.js?v=r271-ad06c7fbd51e",
    "./src/revenant-horde.js?v=r271-ad06c7fbd51e",
    "./src/tyrant-hunt.js?v=r271-ad06c7fbd51e",
    "./src/world-beasts.js?v=r271-ad06c7fbd51e",
    "./src/elders.js?v=r271-ad06c7fbd51e",
    "./src/far-array.js?v=r271-ad06c7fbd51e",
    "./src/combat-visuals.js?v=r271-ad06c7fbd51e",
    "./src/dungeon-framework.js?v=r271-ad06c7fbd51e",
    "./src/elites.js?v=r271-ad06c7fbd51e",
    "./src/random.js?v=r271-ad06c7fbd51e",
    "./src/types.js?v=r271-ad06c7fbd51e",
    "./src/story.js?v=r271-ad06c7fbd51e",
    "./src/foundry.js?v=r271-ad06c7fbd51e",
    "./src/world.js?v=r271-ad06c7fbd51e",
    "./src/deep-dungeons.js?v=r271-ad06c7fbd51e",
    "./src/scenes.js?v=r271-ad06c7fbd51e",
    "./src/arenas.js?v=r271-ad06c7fbd51e",
    "./src/items.js?v=r271-ad06c7fbd51e",
    "./src/combat.js?v=r271-ad06c7fbd51e",
    "./src/interactions.js?v=r271-ad06c7fbd51e",
    "./src/persistence.js?v=r271-ad06c7fbd51e",
    "./src/input.js?v=r271-ad06c7fbd51e",
    "./src/game.js?v=r271-ad06c7fbd51e",
    "./src/renderer.js?v=r271-ad06c7fbd51e",
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
