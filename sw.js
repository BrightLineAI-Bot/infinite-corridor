const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v309`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=309",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=309",
    "./src/proving-ground.js?v=309",
    "./src/proving-ground-fixtures.js?v=309",
    "./src/proving-ground-labs.js?v=309",
    "./src/dungeon-variation.js?v=309",
    "./src/dungeon-completion.js?v=309",
    "./src/enemy-patterns.js?v=309",
    "./src/monster-pack.js?v=309",
    "./src/monster-render.js?v=309",
    "./src/astral-worm.js?v=309",
    "./src/astral-worm-render.js?v=309",
    "./src/astral-worm-retreat.js?v=309",
    "./src/astral-worm-mount.js?v=309",
    "./src/lightning-giant-render.js?v=309",
    "./src/astral-encounters.js?v=309",
    "./src/astral-world-retreat.js?v=309",
    "./src/landscape.js?v=309",
    "./src/landscape-render.js?v=309",
    "./src/underlands.js?v=309",
    "./src/pattern-dungeons.js?v=309",
    "./src/relay-network.js?v=309",
    "./src/glyphs.js?v=309",
    "./src/echoes.js?v=309",
    "./src/constellation.js?v=309",
    "./src/water-traversal.js?v=309",
    "./src/open-sea.js?v=309",
    "./src/boats.js?v=309",
    "./src/sea-creatures.js?v=309",
    "./src/diving.js?v=309",
    "./src/grottoes.js?v=309",
    "./src/spell-slots.js?v=309",
    "./src/settlements.js?v=309",
    "./src/skirmishes.js?v=309",
    "./src/travelers.js?v=309",
    "./src/diagnostic-probe.js?v=309",
    "./src/questing-beast.js?v=309",
    "./src/recitations.js?v=309",
    "./src/lore.js?v=309",
    "./src/glimpses.js?v=309",
    "./src/glimpse-render.js?v=309",
    "./src/glimpse-paint.js?v=309",
    "./src/glimpse-scenes.js?v=309",
    "./src/glimpse-horror.js?v=309",
    "./src/glimpse-legend.js?v=309",
    "./src/glimpse-hand.js?v=309",
    "./src/atlas-view.js?v=309",
    "./src/strange.js?v=309",
    "./src/linked-dungeons.js?v=309",
    "./src/digging.js?v=309",
    "./src/building.js?v=309",
    "./src/refuge-lands.js?v=309",
    "./src/revenant-horde.js?v=309",
    "./src/stages.js?v=309",
    "./src/watcher.js?v=309",
    "./src/tyrant-hunt.js?v=309",
    "./src/world-beasts.js?v=309",
    "./src/elders.js?v=309",
    "./src/far-array.js?v=309",
    "./src/combat-visuals.js?v=309",
    "./src/dungeon-framework.js?v=309",
    "./src/elites.js?v=309",
    "./src/random.js?v=309",
    "./src/types.js?v=309",
    "./src/story.js?v=309",
    "./src/foundry.js?v=309",
    "./src/world.js?v=309",
    "./src/deep-dungeons.js?v=309",
    "./src/scenes.js?v=309",
    "./src/arenas.js?v=309",
    "./src/items.js?v=309",
    "./src/combat.js?v=309",
    "./src/interactions.js?v=309",
    "./src/persistence.js?v=309",
    "./src/input.js?v=309",
    "./src/game.js?v=309",
    "./src/renderer.js?v=309",
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
