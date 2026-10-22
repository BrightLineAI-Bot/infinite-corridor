const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v293`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=293",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=293",
    "./src/proving-ground.js?v=293",
    "./src/proving-ground-fixtures.js?v=293",
    "./src/proving-ground-labs.js?v=293",
    "./src/dungeon-variation.js?v=293",
    "./src/dungeon-completion.js?v=293",
    "./src/enemy-patterns.js?v=293",
    "./src/monster-pack.js?v=293",
    "./src/monster-render.js?v=293",
    "./src/astral-worm.js?v=293",
    "./src/astral-worm-render.js?v=293",
    "./src/astral-worm-retreat.js?v=293",
    "./src/astral-worm-mount.js?v=293",
    "./src/lightning-giant-render.js?v=293",
    "./src/astral-encounters.js?v=293",
    "./src/astral-world-retreat.js?v=293",
    "./src/landscape.js?v=293",
    "./src/landscape-render.js?v=293",
    "./src/underlands.js?v=293",
    "./src/pattern-dungeons.js?v=293",
    "./src/relay-network.js?v=293",
    "./src/glyphs.js?v=293",
    "./src/echoes.js?v=293",
    "./src/constellation.js?v=293",
    "./src/water-traversal.js?v=293",
    "./src/open-sea.js?v=293",
    "./src/boats.js?v=293",
    "./src/sea-creatures.js?v=293",
    "./src/diving.js?v=293",
    "./src/grottoes.js?v=293",
    "./src/spell-slots.js?v=293",
    "./src/settlements.js?v=293",
    "./src/skirmishes.js?v=293",
    "./src/travelers.js?v=293",
    "./src/diagnostic-probe.js?v=293",
    "./src/questing-beast.js?v=293",
    "./src/recitations.js?v=293",
    "./src/lore.js?v=293",
    "./src/glimpses.js?v=293",
    "./src/glimpse-render.js?v=293",
    "./src/glimpse-paint.js?v=293",
    "./src/glimpse-scenes.js?v=293",
    "./src/glimpse-horror.js?v=293",
    "./src/glimpse-legend.js?v=293",
    "./src/glimpse-hand.js?v=293",
    "./src/atlas-view.js?v=293",
    "./src/strange.js?v=293",
    "./src/linked-dungeons.js?v=293",
    "./src/digging.js?v=293",
    "./src/building.js?v=293",
    "./src/refuge-lands.js?v=293",
    "./src/revenant-horde.js?v=293",
    "./src/stages.js?v=293",
    "./src/watcher.js?v=293",
    "./src/tyrant-hunt.js?v=293",
    "./src/world-beasts.js?v=293",
    "./src/elders.js?v=293",
    "./src/far-array.js?v=293",
    "./src/combat-visuals.js?v=293",
    "./src/dungeon-framework.js?v=293",
    "./src/elites.js?v=293",
    "./src/random.js?v=293",
    "./src/types.js?v=293",
    "./src/story.js?v=293",
    "./src/foundry.js?v=293",
    "./src/world.js?v=293",
    "./src/deep-dungeons.js?v=293",
    "./src/scenes.js?v=293",
    "./src/arenas.js?v=293",
    "./src/items.js?v=293",
    "./src/combat.js?v=293",
    "./src/interactions.js?v=293",
    "./src/persistence.js?v=293",
    "./src/input.js?v=293",
    "./src/game.js?v=293",
    "./src/renderer.js?v=293",
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
