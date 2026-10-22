const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v311`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=311",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=311",
    "./src/proving-ground.js?v=311",
    "./src/proving-ground-fixtures.js?v=311",
    "./src/proving-ground-labs.js?v=311",
    "./src/dungeon-variation.js?v=311",
    "./src/dungeon-completion.js?v=311",
    "./src/enemy-patterns.js?v=311",
    "./src/monster-pack.js?v=311",
    "./src/monster-render.js?v=311",
    "./src/astral-worm.js?v=311",
    "./src/astral-worm-render.js?v=311",
    "./src/astral-worm-retreat.js?v=311",
    "./src/astral-worm-mount.js?v=311",
    "./src/lightning-giant-render.js?v=311",
    "./src/astral-encounters.js?v=311",
    "./src/astral-world-retreat.js?v=311",
    "./src/landscape.js?v=311",
    "./src/landscape-render.js?v=311",
    "./src/underlands.js?v=311",
    "./src/pattern-dungeons.js?v=311",
    "./src/relay-network.js?v=311",
    "./src/glyphs.js?v=311",
    "./src/echoes.js?v=311",
    "./src/constellation.js?v=311",
    "./src/water-traversal.js?v=311",
    "./src/open-sea.js?v=311",
    "./src/boats.js?v=311",
    "./src/sea-creatures.js?v=311",
    "./src/diving.js?v=311",
    "./src/grottoes.js?v=311",
    "./src/spell-slots.js?v=311",
    "./src/settlements.js?v=311",
    "./src/skirmishes.js?v=311",
    "./src/travelers.js?v=311",
    "./src/diagnostic-probe.js?v=311",
    "./src/questing-beast.js?v=311",
    "./src/recitations.js?v=311",
    "./src/lore.js?v=311",
    "./src/glimpses.js?v=311",
    "./src/glimpse-render.js?v=311",
    "./src/glimpse-paint.js?v=311",
    "./src/glimpse-scenes.js?v=311",
    "./src/glimpse-horror.js?v=311",
    "./src/glimpse-legend.js?v=311",
    "./src/glimpse-hand.js?v=311",
    "./src/atlas-view.js?v=311",
    "./src/strange.js?v=311",
    "./src/linked-dungeons.js?v=311",
    "./src/digging.js?v=311",
    "./src/building.js?v=311",
    "./src/refuge-lands.js?v=311",
    "./src/revenant-horde.js?v=311",
    "./src/stages.js?v=311",
    "./src/watcher.js?v=311",
    "./src/tyrant-hunt.js?v=311",
    "./src/world-beasts.js?v=311",
    "./src/elders.js?v=311",
    "./src/far-array.js?v=311",
    "./src/combat-visuals.js?v=311",
    "./src/dungeon-framework.js?v=311",
    "./src/elites.js?v=311",
    "./src/random.js?v=311",
    "./src/types.js?v=311",
    "./src/story.js?v=311",
    "./src/foundry.js?v=311",
    "./src/world.js?v=311",
    "./src/deep-dungeons.js?v=311",
    "./src/scenes.js?v=311",
    "./src/arenas.js?v=311",
    "./src/items.js?v=311",
    "./src/combat.js?v=311",
    "./src/interactions.js?v=311",
    "./src/persistence.js?v=311",
    "./src/input.js?v=311",
    "./src/game.js?v=311",
    "./src/renderer.js?v=311",
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
