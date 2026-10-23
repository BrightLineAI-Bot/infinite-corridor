const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v343`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=343",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=343",
    "./src/proving-ground.js?v=343",
    "./src/proving-ground-fixtures.js?v=343",
    "./src/proving-ground-labs.js?v=343",
    "./src/dungeon-variation.js?v=343",
    "./src/dungeon-completion.js?v=343",
    "./src/enemy-patterns.js?v=343",
    "./src/monster-pack.js?v=343",
    "./src/monster-render.js?v=343",
    "./src/astral-worm.js?v=343",
    "./src/astral-worm-render.js?v=343",
    "./src/astral-worm-retreat.js?v=343",
    "./src/astral-worm-mount.js?v=343",
    "./src/lightning-giant-render.js?v=343",
    "./src/astral-encounters.js?v=343",
    "./src/astral-world-retreat.js?v=343",
    "./src/landscape.js?v=343",
    "./src/landscape-render.js?v=343",
    "./src/underlands.js?v=343",
    "./src/pattern-dungeons.js?v=343",
    "./src/relay-network.js?v=343",
    "./src/glyphs.js?v=343",
    "./src/echoes.js?v=343",
    "./src/constellation.js?v=343",
    "./src/water-traversal.js?v=343",
    "./src/open-sea.js?v=343",
    "./src/boats.js?v=343",
    "./src/sea-creatures.js?v=343",
    "./src/diving.js?v=343",
    "./src/grottoes.js?v=343",
    "./src/spell-slots.js?v=343",
    "./src/settlements.js?v=343",
    "./src/skirmishes.js?v=343",
    "./src/travelers.js?v=343",
    "./src/diagnostic-probe.js?v=343",
    "./src/questing-beast.js?v=343",
    "./src/recitations.js?v=343",
    "./src/lore.js?v=343",
    "./src/glimpses.js?v=343",
    "./src/glimpse-render.js?v=343",
    "./src/glimpse-paint.js?v=343",
    "./src/glimpse-scenes.js?v=343",
    "./src/glimpse-horror.js?v=343",
    "./src/glimpse-legend.js?v=343",
    "./src/glimpse-hand.js?v=343",
    "./src/atlas-view.js?v=343",
    "./src/strange.js?v=343",
    "./src/linked-dungeons.js?v=343",
    "./src/digging.js?v=343",
    "./src/building.js?v=343",
    "./src/refuge-lands.js?v=343",
    "./src/revenant-horde.js?v=343",
    "./src/stages.js?v=343",
    "./src/watcher.js?v=343",
    "./src/vehicle-gates.js?v=343",
    "./src/dungeon-ladder.js?v=343",
    "./src/potions.js?v=343",
    "./src/tyrant-hunt.js?v=343",
    "./src/world-beasts.js?v=343",
    "./src/elders.js?v=343",
    "./src/far-array.js?v=343",
    "./src/combat-visuals.js?v=343",
    "./src/dungeon-framework.js?v=343",
    "./src/elites.js?v=343",
    "./src/random.js?v=343",
    "./src/types.js?v=343",
    "./src/story.js?v=343",
    "./src/foundry.js?v=343",
    "./src/world.js?v=343",
    "./src/deep-dungeons.js?v=343",
    "./src/scenes.js?v=343",
    "./src/arenas.js?v=343",
    "./src/items.js?v=343",
    "./src/combat.js?v=343",
    "./src/interactions.js?v=343",
    "./src/persistence.js?v=343",
    "./src/input.js?v=343",
    "./src/game.js?v=343",
    "./src/renderer.js?v=343",
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
