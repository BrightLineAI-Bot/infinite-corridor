const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v397`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=397",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=397",
    "./src/proving-ground.js?v=397",
    "./src/proving-ground-fixtures.js?v=397",
    "./src/proving-ground-labs.js?v=397",
    "./src/dungeon-variation.js?v=397",
    "./src/dungeon-completion.js?v=397",
    "./src/enemy-patterns.js?v=397",
    "./src/monster-pack.js?v=397",
    "./src/monster-render.js?v=397",
    "./src/astral-worm.js?v=397",
    "./src/astral-worm-render.js?v=397",
    "./src/astral-worm-retreat.js?v=397",
    "./src/astral-worm-mount.js?v=397",
    "./src/lightning-giant-render.js?v=397",
    "./src/astral-encounters.js?v=397",
    "./src/astral-world-retreat.js?v=397",
    "./src/landscape.js?v=397",
    "./src/landscape-render.js?v=397",
    "./src/underlands.js?v=397",
    "./src/pattern-dungeons.js?v=397",
    "./src/relay-network.js?v=397",
    "./src/glyphs.js?v=397",
    "./src/echoes.js?v=397",
    "./src/constellation.js?v=397",
    "./src/water-traversal.js?v=397",
    "./src/open-sea.js?v=397",
    "./src/boats.js?v=397",
    "./src/sea-creatures.js?v=397",
    "./src/diving.js?v=397",
    "./src/grottoes.js?v=397",
    "./src/spell-slots.js?v=397",
    "./src/settlements.js?v=397",
    "./src/skirmishes.js?v=397",
    "./src/travelers.js?v=397",
    "./src/diagnostic-probe.js?v=397",
    "./src/questing-beast.js?v=397",
    "./src/recitations.js?v=397",
    "./src/lore.js?v=397",
    "./src/glimpses.js?v=397",
    "./src/glimpse-render.js?v=397",
    "./src/glimpse-paint.js?v=397",
    "./src/glimpse-scenes.js?v=397",
    "./src/glimpse-horror.js?v=397",
    "./src/glimpse-legend.js?v=397",
    "./src/glimpse-hand.js?v=397",
    "./src/atlas-view.js?v=397",
    "./src/strange.js?v=397",
    "./src/linked-dungeons.js?v=397",
    "./src/digging.js?v=397",
    "./src/building.js?v=397",
    "./src/refuge-lands.js?v=397",
    "./src/revenant-horde.js?v=397",
    "./src/stages.js?v=397",
    "./src/watcher.js?v=397",
    "./src/vehicle-gates.js?v=397",
    "./src/dungeon-ladder.js?v=397",
    "./src/potions.js?v=397",
    "./src/transit-lattice.js?v=397",
    "./src/late-spells.js?v=397",
    "./src/listener-mirror.js?v=397",
    "./src/hometowns.js?v=397",
    "./src/listener-arena.js?v=397",
    "./src/listener-morph.js?v=397",
    "./src/build-presets.js?v=397",
    "./src/smithy.js?v=397",
    "./src/tyrant-hunt.js?v=397",
    "./src/world-beasts.js?v=397",
    "./src/elders.js?v=397",
    "./src/far-array.js?v=397",
    "./src/combat-visuals.js?v=397",
    "./src/dungeon-framework.js?v=397",
    "./src/elites.js?v=397",
    "./src/random.js?v=397",
    "./src/types.js?v=397",
    "./src/story.js?v=397",
    "./src/foundry.js?v=397",
    "./src/world.js?v=397",
    "./src/deep-dungeons.js?v=397",
    "./src/scenes.js?v=397",
    "./src/arenas.js?v=397",
    "./src/items.js?v=397",
    "./src/combat.js?v=397",
    "./src/interactions.js?v=397",
    "./src/persistence.js?v=397",
    "./src/input.js?v=397",
    "./src/game.js?v=397",
    "./src/renderer.js?v=397",
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
