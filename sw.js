const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v279`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=279",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=279",
    "./src/proving-ground.js?v=279",
    "./src/proving-ground-fixtures.js?v=279",
    "./src/proving-ground-labs.js?v=279",
    "./src/dungeon-variation.js?v=279",
    "./src/dungeon-completion.js?v=279",
    "./src/enemy-patterns.js?v=279",
    "./src/monster-pack.js?v=279",
    "./src/monster-render.js?v=279",
    "./src/astral-worm.js?v=279",
    "./src/astral-worm-render.js?v=279",
    "./src/astral-worm-retreat.js?v=279",
    "./src/astral-worm-mount.js?v=279",
    "./src/lightning-giant-render.js?v=279",
    "./src/astral-encounters.js?v=279",
    "./src/astral-world-retreat.js?v=279",
    "./src/landscape.js?v=279",
    "./src/landscape-render.js?v=279",
    "./src/underlands.js?v=279",
    "./src/pattern-dungeons.js?v=279",
    "./src/relay-network.js?v=279",
    "./src/glyphs.js?v=279",
    "./src/echoes.js?v=279",
    "./src/constellation.js?v=279",
    "./src/water-traversal.js?v=279",
    "./src/open-sea.js?v=279",
    "./src/boats.js?v=279",
    "./src/sea-creatures.js?v=279",
    "./src/diving.js?v=279",
    "./src/grottoes.js?v=279",
    "./src/spell-slots.js?v=279",
    "./src/settlements.js?v=279",
    "./src/skirmishes.js?v=279",
    "./src/travelers.js?v=279",
    "./src/diagnostic-probe.js?v=279",
    "./src/questing-beast.js?v=279",
    "./src/recitations.js?v=279",
    "./src/lore.js?v=279",
    "./src/glimpses.js?v=279",
    "./src/glimpse-render.js?v=279",
    "./src/glimpse-paint.js?v=279",
    "./src/glimpse-scenes.js?v=279",
    "./src/glimpse-horror.js?v=279",
    "./src/glimpse-legend.js?v=279",
    "./src/glimpse-hand.js?v=279",
    "./src/atlas-view.js?v=279",
    "./src/strange.js?v=279",
    "./src/linked-dungeons.js?v=279",
    "./src/digging.js?v=279",
    "./src/building.js?v=279",
    "./src/refuge-lands.js?v=279",
    "./src/revenant-horde.js?v=279",
    "./src/stages.js?v=279",
    "./src/tyrant-hunt.js?v=279",
    "./src/world-beasts.js?v=279",
    "./src/elders.js?v=279",
    "./src/far-array.js?v=279",
    "./src/combat-visuals.js?v=279",
    "./src/dungeon-framework.js?v=279",
    "./src/elites.js?v=279",
    "./src/random.js?v=279",
    "./src/types.js?v=279",
    "./src/story.js?v=279",
    "./src/foundry.js?v=279",
    "./src/world.js?v=279",
    "./src/deep-dungeons.js?v=279",
    "./src/scenes.js?v=279",
    "./src/arenas.js?v=279",
    "./src/items.js?v=279",
    "./src/combat.js?v=279",
    "./src/interactions.js?v=279",
    "./src/persistence.js?v=279",
    "./src/input.js?v=279",
    "./src/game.js?v=279",
    "./src/renderer.js?v=279",
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
