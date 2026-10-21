const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v271`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=271",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=271",
    "./src/proving-ground.js?v=271",
    "./src/proving-ground-fixtures.js?v=271",
    "./src/proving-ground-labs.js?v=271",
    "./src/dungeon-variation.js?v=271",
    "./src/dungeon-completion.js?v=271",
    "./src/enemy-patterns.js?v=271",
    "./src/monster-pack.js?v=271",
    "./src/monster-render.js?v=271",
    "./src/astral-worm.js?v=271",
    "./src/astral-worm-render.js?v=271",
    "./src/astral-worm-retreat.js?v=271",
    "./src/astral-worm-mount.js?v=271",
    "./src/lightning-giant-render.js?v=271",
    "./src/astral-encounters.js?v=271",
    "./src/astral-world-retreat.js?v=271",
    "./src/landscape.js?v=271",
    "./src/landscape-render.js?v=271",
    "./src/underlands.js?v=271",
    "./src/pattern-dungeons.js?v=271",
    "./src/relay-network.js?v=271",
    "./src/glyphs.js?v=271",
    "./src/echoes.js?v=271",
    "./src/constellation.js?v=271",
    "./src/water-traversal.js?v=271",
    "./src/open-sea.js?v=271",
    "./src/boats.js?v=271",
    "./src/sea-creatures.js?v=271",
    "./src/diving.js?v=271",
    "./src/grottoes.js?v=271",
    "./src/spell-slots.js?v=271",
    "./src/settlements.js?v=271",
    "./src/skirmishes.js?v=271",
    "./src/travelers.js?v=271",
    "./src/diagnostic-probe.js?v=271",
    "./src/questing-beast.js?v=271",
    "./src/recitations.js?v=271",
    "./src/lore.js?v=271",
    "./src/glimpses.js?v=271",
    "./src/glimpse-render.js?v=271",
    "./src/glimpse-paint.js?v=271",
    "./src/glimpse-scenes.js?v=271",
    "./src/glimpse-horror.js?v=271",
    "./src/glimpse-legend.js?v=271",
    "./src/glimpse-hand.js?v=271",
    "./src/atlas-view.js?v=271",
    "./src/strange.js?v=271",
    "./src/linked-dungeons.js?v=271",
    "./src/digging.js?v=271",
    "./src/building.js?v=271",
    "./src/refuge-lands.js?v=271",
    "./src/revenant-horde.js?v=271",
    "./src/tyrant-hunt.js?v=271",
    "./src/world-beasts.js?v=271",
    "./src/elders.js?v=271",
    "./src/far-array.js?v=271",
    "./src/combat-visuals.js?v=271",
    "./src/dungeon-framework.js?v=271",
    "./src/elites.js?v=271",
    "./src/random.js?v=271",
    "./src/types.js?v=271",
    "./src/story.js?v=271",
    "./src/foundry.js?v=271",
    "./src/world.js?v=271",
    "./src/deep-dungeons.js?v=271",
    "./src/scenes.js?v=271",
    "./src/arenas.js?v=271",
    "./src/items.js?v=271",
    "./src/combat.js?v=271",
    "./src/interactions.js?v=271",
    "./src/persistence.js?v=271",
    "./src/input.js?v=271",
    "./src/game.js?v=271",
    "./src/renderer.js?v=271",
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
