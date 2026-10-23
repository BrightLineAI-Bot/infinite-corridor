const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v357`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=357",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=357",
    "./src/proving-ground.js?v=357",
    "./src/proving-ground-fixtures.js?v=357",
    "./src/proving-ground-labs.js?v=357",
    "./src/dungeon-variation.js?v=357",
    "./src/dungeon-completion.js?v=357",
    "./src/enemy-patterns.js?v=357",
    "./src/monster-pack.js?v=357",
    "./src/monster-render.js?v=357",
    "./src/astral-worm.js?v=357",
    "./src/astral-worm-render.js?v=357",
    "./src/astral-worm-retreat.js?v=357",
    "./src/astral-worm-mount.js?v=357",
    "./src/lightning-giant-render.js?v=357",
    "./src/astral-encounters.js?v=357",
    "./src/astral-world-retreat.js?v=357",
    "./src/landscape.js?v=357",
    "./src/landscape-render.js?v=357",
    "./src/underlands.js?v=357",
    "./src/pattern-dungeons.js?v=357",
    "./src/relay-network.js?v=357",
    "./src/glyphs.js?v=357",
    "./src/echoes.js?v=357",
    "./src/constellation.js?v=357",
    "./src/water-traversal.js?v=357",
    "./src/open-sea.js?v=357",
    "./src/boats.js?v=357",
    "./src/sea-creatures.js?v=357",
    "./src/diving.js?v=357",
    "./src/grottoes.js?v=357",
    "./src/spell-slots.js?v=357",
    "./src/settlements.js?v=357",
    "./src/skirmishes.js?v=357",
    "./src/travelers.js?v=357",
    "./src/diagnostic-probe.js?v=357",
    "./src/questing-beast.js?v=357",
    "./src/recitations.js?v=357",
    "./src/lore.js?v=357",
    "./src/glimpses.js?v=357",
    "./src/glimpse-render.js?v=357",
    "./src/glimpse-paint.js?v=357",
    "./src/glimpse-scenes.js?v=357",
    "./src/glimpse-horror.js?v=357",
    "./src/glimpse-legend.js?v=357",
    "./src/glimpse-hand.js?v=357",
    "./src/atlas-view.js?v=357",
    "./src/strange.js?v=357",
    "./src/linked-dungeons.js?v=357",
    "./src/digging.js?v=357",
    "./src/building.js?v=357",
    "./src/refuge-lands.js?v=357",
    "./src/revenant-horde.js?v=357",
    "./src/stages.js?v=357",
    "./src/watcher.js?v=357",
    "./src/vehicle-gates.js?v=357",
    "./src/dungeon-ladder.js?v=357",
    "./src/potions.js?v=357",
    "./src/tyrant-hunt.js?v=357",
    "./src/world-beasts.js?v=357",
    "./src/elders.js?v=357",
    "./src/far-array.js?v=357",
    "./src/combat-visuals.js?v=357",
    "./src/dungeon-framework.js?v=357",
    "./src/elites.js?v=357",
    "./src/random.js?v=357",
    "./src/types.js?v=357",
    "./src/story.js?v=357",
    "./src/foundry.js?v=357",
    "./src/world.js?v=357",
    "./src/deep-dungeons.js?v=357",
    "./src/scenes.js?v=357",
    "./src/arenas.js?v=357",
    "./src/items.js?v=357",
    "./src/combat.js?v=357",
    "./src/interactions.js?v=357",
    "./src/persistence.js?v=357",
    "./src/input.js?v=357",
    "./src/game.js?v=357",
    "./src/renderer.js?v=357",
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
