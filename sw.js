const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v285`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=285",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=285",
    "./src/proving-ground.js?v=285",
    "./src/proving-ground-fixtures.js?v=285",
    "./src/proving-ground-labs.js?v=285",
    "./src/dungeon-variation.js?v=285",
    "./src/dungeon-completion.js?v=285",
    "./src/enemy-patterns.js?v=285",
    "./src/monster-pack.js?v=285",
    "./src/monster-render.js?v=285",
    "./src/astral-worm.js?v=285",
    "./src/astral-worm-render.js?v=285",
    "./src/astral-worm-retreat.js?v=285",
    "./src/astral-worm-mount.js?v=285",
    "./src/lightning-giant-render.js?v=285",
    "./src/astral-encounters.js?v=285",
    "./src/astral-world-retreat.js?v=285",
    "./src/landscape.js?v=285",
    "./src/landscape-render.js?v=285",
    "./src/underlands.js?v=285",
    "./src/pattern-dungeons.js?v=285",
    "./src/relay-network.js?v=285",
    "./src/glyphs.js?v=285",
    "./src/echoes.js?v=285",
    "./src/constellation.js?v=285",
    "./src/water-traversal.js?v=285",
    "./src/open-sea.js?v=285",
    "./src/boats.js?v=285",
    "./src/sea-creatures.js?v=285",
    "./src/diving.js?v=285",
    "./src/grottoes.js?v=285",
    "./src/spell-slots.js?v=285",
    "./src/settlements.js?v=285",
    "./src/skirmishes.js?v=285",
    "./src/travelers.js?v=285",
    "./src/diagnostic-probe.js?v=285",
    "./src/questing-beast.js?v=285",
    "./src/recitations.js?v=285",
    "./src/lore.js?v=285",
    "./src/glimpses.js?v=285",
    "./src/glimpse-render.js?v=285",
    "./src/glimpse-paint.js?v=285",
    "./src/glimpse-scenes.js?v=285",
    "./src/glimpse-horror.js?v=285",
    "./src/glimpse-legend.js?v=285",
    "./src/glimpse-hand.js?v=285",
    "./src/atlas-view.js?v=285",
    "./src/strange.js?v=285",
    "./src/linked-dungeons.js?v=285",
    "./src/digging.js?v=285",
    "./src/building.js?v=285",
    "./src/refuge-lands.js?v=285",
    "./src/revenant-horde.js?v=285",
    "./src/stages.js?v=285",
    "./src/tyrant-hunt.js?v=285",
    "./src/world-beasts.js?v=285",
    "./src/elders.js?v=285",
    "./src/far-array.js?v=285",
    "./src/combat-visuals.js?v=285",
    "./src/dungeon-framework.js?v=285",
    "./src/elites.js?v=285",
    "./src/random.js?v=285",
    "./src/types.js?v=285",
    "./src/story.js?v=285",
    "./src/foundry.js?v=285",
    "./src/world.js?v=285",
    "./src/deep-dungeons.js?v=285",
    "./src/scenes.js?v=285",
    "./src/arenas.js?v=285",
    "./src/items.js?v=285",
    "./src/combat.js?v=285",
    "./src/interactions.js?v=285",
    "./src/persistence.js?v=285",
    "./src/input.js?v=285",
    "./src/game.js?v=285",
    "./src/renderer.js?v=285",
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
