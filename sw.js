const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v367`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=367",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=367",
    "./src/proving-ground.js?v=367",
    "./src/proving-ground-fixtures.js?v=367",
    "./src/proving-ground-labs.js?v=367",
    "./src/dungeon-variation.js?v=367",
    "./src/dungeon-completion.js?v=367",
    "./src/enemy-patterns.js?v=367",
    "./src/monster-pack.js?v=367",
    "./src/monster-render.js?v=367",
    "./src/astral-worm.js?v=367",
    "./src/astral-worm-render.js?v=367",
    "./src/astral-worm-retreat.js?v=367",
    "./src/astral-worm-mount.js?v=367",
    "./src/lightning-giant-render.js?v=367",
    "./src/astral-encounters.js?v=367",
    "./src/astral-world-retreat.js?v=367",
    "./src/landscape.js?v=367",
    "./src/landscape-render.js?v=367",
    "./src/underlands.js?v=367",
    "./src/pattern-dungeons.js?v=367",
    "./src/relay-network.js?v=367",
    "./src/glyphs.js?v=367",
    "./src/echoes.js?v=367",
    "./src/constellation.js?v=367",
    "./src/water-traversal.js?v=367",
    "./src/open-sea.js?v=367",
    "./src/boats.js?v=367",
    "./src/sea-creatures.js?v=367",
    "./src/diving.js?v=367",
    "./src/grottoes.js?v=367",
    "./src/spell-slots.js?v=367",
    "./src/settlements.js?v=367",
    "./src/skirmishes.js?v=367",
    "./src/travelers.js?v=367",
    "./src/diagnostic-probe.js?v=367",
    "./src/questing-beast.js?v=367",
    "./src/recitations.js?v=367",
    "./src/lore.js?v=367",
    "./src/glimpses.js?v=367",
    "./src/glimpse-render.js?v=367",
    "./src/glimpse-paint.js?v=367",
    "./src/glimpse-scenes.js?v=367",
    "./src/glimpse-horror.js?v=367",
    "./src/glimpse-legend.js?v=367",
    "./src/glimpse-hand.js?v=367",
    "./src/atlas-view.js?v=367",
    "./src/strange.js?v=367",
    "./src/linked-dungeons.js?v=367",
    "./src/digging.js?v=367",
    "./src/building.js?v=367",
    "./src/refuge-lands.js?v=367",
    "./src/revenant-horde.js?v=367",
    "./src/stages.js?v=367",
    "./src/watcher.js?v=367",
    "./src/vehicle-gates.js?v=367",
    "./src/dungeon-ladder.js?v=367",
    "./src/potions.js?v=367",
    "./src/transit-lattice.js?v=367",
    "./src/late-spells.js?v=367",
    "./src/tyrant-hunt.js?v=367",
    "./src/world-beasts.js?v=367",
    "./src/elders.js?v=367",
    "./src/far-array.js?v=367",
    "./src/combat-visuals.js?v=367",
    "./src/dungeon-framework.js?v=367",
    "./src/elites.js?v=367",
    "./src/random.js?v=367",
    "./src/types.js?v=367",
    "./src/story.js?v=367",
    "./src/foundry.js?v=367",
    "./src/world.js?v=367",
    "./src/deep-dungeons.js?v=367",
    "./src/scenes.js?v=367",
    "./src/arenas.js?v=367",
    "./src/items.js?v=367",
    "./src/combat.js?v=367",
    "./src/interactions.js?v=367",
    "./src/persistence.js?v=367",
    "./src/input.js?v=367",
    "./src/game.js?v=367",
    "./src/renderer.js?v=367",
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
