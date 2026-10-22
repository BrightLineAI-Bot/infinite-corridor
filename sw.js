const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r311-f82b84f1e1d4`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r311-f82b84f1e1d4",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r311-f82b84f1e1d4",
    "./src/proving-ground.js?v=r311-f82b84f1e1d4",
    "./src/proving-ground-fixtures.js?v=r311-f82b84f1e1d4",
    "./src/proving-ground-labs.js?v=r311-f82b84f1e1d4",
    "./src/dungeon-variation.js?v=r311-f82b84f1e1d4",
    "./src/dungeon-completion.js?v=r311-f82b84f1e1d4",
    "./src/enemy-patterns.js?v=r311-f82b84f1e1d4",
    "./src/monster-pack.js?v=r311-f82b84f1e1d4",
    "./src/monster-render.js?v=r311-f82b84f1e1d4",
    "./src/astral-worm.js?v=r311-f82b84f1e1d4",
    "./src/astral-worm-render.js?v=r311-f82b84f1e1d4",
    "./src/astral-worm-retreat.js?v=r311-f82b84f1e1d4",
    "./src/astral-worm-mount.js?v=r311-f82b84f1e1d4",
    "./src/lightning-giant-render.js?v=r311-f82b84f1e1d4",
    "./src/astral-encounters.js?v=r311-f82b84f1e1d4",
    "./src/astral-world-retreat.js?v=r311-f82b84f1e1d4",
    "./src/landscape.js?v=r311-f82b84f1e1d4",
    "./src/landscape-render.js?v=r311-f82b84f1e1d4",
    "./src/underlands.js?v=r311-f82b84f1e1d4",
    "./src/pattern-dungeons.js?v=r311-f82b84f1e1d4",
    "./src/relay-network.js?v=r311-f82b84f1e1d4",
    "./src/glyphs.js?v=r311-f82b84f1e1d4",
    "./src/echoes.js?v=r311-f82b84f1e1d4",
    "./src/constellation.js?v=r311-f82b84f1e1d4",
    "./src/water-traversal.js?v=r311-f82b84f1e1d4",
    "./src/open-sea.js?v=r311-f82b84f1e1d4",
    "./src/boats.js?v=r311-f82b84f1e1d4",
    "./src/sea-creatures.js?v=r311-f82b84f1e1d4",
    "./src/diving.js?v=r311-f82b84f1e1d4",
    "./src/grottoes.js?v=r311-f82b84f1e1d4",
    "./src/spell-slots.js?v=r311-f82b84f1e1d4",
    "./src/settlements.js?v=r311-f82b84f1e1d4",
    "./src/skirmishes.js?v=r311-f82b84f1e1d4",
    "./src/travelers.js?v=r311-f82b84f1e1d4",
    "./src/diagnostic-probe.js?v=r311-f82b84f1e1d4",
    "./src/questing-beast.js?v=r311-f82b84f1e1d4",
    "./src/recitations.js?v=r311-f82b84f1e1d4",
    "./src/lore.js?v=r311-f82b84f1e1d4",
    "./src/glimpses.js?v=r311-f82b84f1e1d4",
    "./src/glimpse-render.js?v=r311-f82b84f1e1d4",
    "./src/glimpse-paint.js?v=r311-f82b84f1e1d4",
    "./src/glimpse-scenes.js?v=r311-f82b84f1e1d4",
    "./src/glimpse-horror.js?v=r311-f82b84f1e1d4",
    "./src/glimpse-legend.js?v=r311-f82b84f1e1d4",
    "./src/glimpse-hand.js?v=r311-f82b84f1e1d4",
    "./src/atlas-view.js?v=r311-f82b84f1e1d4",
    "./src/strange.js?v=r311-f82b84f1e1d4",
    "./src/linked-dungeons.js?v=r311-f82b84f1e1d4",
    "./src/digging.js?v=r311-f82b84f1e1d4",
    "./src/building.js?v=r311-f82b84f1e1d4",
    "./src/refuge-lands.js?v=r311-f82b84f1e1d4",
    "./src/revenant-horde.js?v=r311-f82b84f1e1d4",
    "./src/stages.js?v=r311-f82b84f1e1d4",
    "./src/watcher.js?v=r311-f82b84f1e1d4",
    "./src/tyrant-hunt.js?v=r311-f82b84f1e1d4",
    "./src/world-beasts.js?v=r311-f82b84f1e1d4",
    "./src/elders.js?v=r311-f82b84f1e1d4",
    "./src/far-array.js?v=r311-f82b84f1e1d4",
    "./src/combat-visuals.js?v=r311-f82b84f1e1d4",
    "./src/dungeon-framework.js?v=r311-f82b84f1e1d4",
    "./src/elites.js?v=r311-f82b84f1e1d4",
    "./src/random.js?v=r311-f82b84f1e1d4",
    "./src/types.js?v=r311-f82b84f1e1d4",
    "./src/story.js?v=r311-f82b84f1e1d4",
    "./src/foundry.js?v=r311-f82b84f1e1d4",
    "./src/world.js?v=r311-f82b84f1e1d4",
    "./src/deep-dungeons.js?v=r311-f82b84f1e1d4",
    "./src/scenes.js?v=r311-f82b84f1e1d4",
    "./src/arenas.js?v=r311-f82b84f1e1d4",
    "./src/items.js?v=r311-f82b84f1e1d4",
    "./src/combat.js?v=r311-f82b84f1e1d4",
    "./src/interactions.js?v=r311-f82b84f1e1d4",
    "./src/persistence.js?v=r311-f82b84f1e1d4",
    "./src/input.js?v=r311-f82b84f1e1d4",
    "./src/game.js?v=r311-f82b84f1e1d4",
    "./src/renderer.js?v=r311-f82b84f1e1d4",
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
