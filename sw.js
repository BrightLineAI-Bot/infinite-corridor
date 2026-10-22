const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v277`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=277",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=277",
    "./src/proving-ground.js?v=277",
    "./src/proving-ground-fixtures.js?v=277",
    "./src/proving-ground-labs.js?v=277",
    "./src/dungeon-variation.js?v=277",
    "./src/dungeon-completion.js?v=277",
    "./src/enemy-patterns.js?v=277",
    "./src/monster-pack.js?v=277",
    "./src/monster-render.js?v=277",
    "./src/astral-worm.js?v=277",
    "./src/astral-worm-render.js?v=277",
    "./src/astral-worm-retreat.js?v=277",
    "./src/astral-worm-mount.js?v=277",
    "./src/lightning-giant-render.js?v=277",
    "./src/astral-encounters.js?v=277",
    "./src/astral-world-retreat.js?v=277",
    "./src/landscape.js?v=277",
    "./src/landscape-render.js?v=277",
    "./src/underlands.js?v=277",
    "./src/pattern-dungeons.js?v=277",
    "./src/relay-network.js?v=277",
    "./src/glyphs.js?v=277",
    "./src/echoes.js?v=277",
    "./src/constellation.js?v=277",
    "./src/water-traversal.js?v=277",
    "./src/open-sea.js?v=277",
    "./src/boats.js?v=277",
    "./src/sea-creatures.js?v=277",
    "./src/diving.js?v=277",
    "./src/grottoes.js?v=277",
    "./src/spell-slots.js?v=277",
    "./src/settlements.js?v=277",
    "./src/skirmishes.js?v=277",
    "./src/travelers.js?v=277",
    "./src/diagnostic-probe.js?v=277",
    "./src/questing-beast.js?v=277",
    "./src/recitations.js?v=277",
    "./src/lore.js?v=277",
    "./src/glimpses.js?v=277",
    "./src/glimpse-render.js?v=277",
    "./src/glimpse-paint.js?v=277",
    "./src/glimpse-scenes.js?v=277",
    "./src/glimpse-horror.js?v=277",
    "./src/glimpse-legend.js?v=277",
    "./src/glimpse-hand.js?v=277",
    "./src/atlas-view.js?v=277",
    "./src/strange.js?v=277",
    "./src/linked-dungeons.js?v=277",
    "./src/digging.js?v=277",
    "./src/building.js?v=277",
    "./src/refuge-lands.js?v=277",
    "./src/revenant-horde.js?v=277",
    "./src/stages.js?v=277",
    "./src/tyrant-hunt.js?v=277",
    "./src/world-beasts.js?v=277",
    "./src/elders.js?v=277",
    "./src/far-array.js?v=277",
    "./src/combat-visuals.js?v=277",
    "./src/dungeon-framework.js?v=277",
    "./src/elites.js?v=277",
    "./src/random.js?v=277",
    "./src/types.js?v=277",
    "./src/story.js?v=277",
    "./src/foundry.js?v=277",
    "./src/world.js?v=277",
    "./src/deep-dungeons.js?v=277",
    "./src/scenes.js?v=277",
    "./src/arenas.js?v=277",
    "./src/items.js?v=277",
    "./src/combat.js?v=277",
    "./src/interactions.js?v=277",
    "./src/persistence.js?v=277",
    "./src/input.js?v=277",
    "./src/game.js?v=277",
    "./src/renderer.js?v=277",
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
