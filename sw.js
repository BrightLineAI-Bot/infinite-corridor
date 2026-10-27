const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r479-311e59963952`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r479-311e59963952",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r479-311e59963952",
    "./src/proving-ground.js?v=r479-311e59963952",
    "./src/proving-ground-fixtures.js?v=r479-311e59963952",
    "./src/proving-ground-labs.js?v=r479-311e59963952",
    "./src/dungeon-variation.js?v=r479-311e59963952",
    "./src/dungeon-completion.js?v=r479-311e59963952",
    "./src/enemy-patterns.js?v=r479-311e59963952",
    "./src/monster-pack.js?v=r479-311e59963952",
    "./src/monster-render.js?v=r479-311e59963952",
    "./src/astral-worm.js?v=r479-311e59963952",
    "./src/astral-worm-render.js?v=r479-311e59963952",
    "./src/astral-worm-retreat.js?v=r479-311e59963952",
    "./src/astral-worm-mount.js?v=r479-311e59963952",
    "./src/lightning-giant-render.js?v=r479-311e59963952",
    "./src/astral-encounters.js?v=r479-311e59963952",
    "./src/astral-world-retreat.js?v=r479-311e59963952",
    "./src/landscape.js?v=r479-311e59963952",
    "./src/landscape-render.js?v=r479-311e59963952",
    "./src/underlands.js?v=r479-311e59963952",
    "./src/pattern-dungeons.js?v=r479-311e59963952",
    "./src/relay-network.js?v=r479-311e59963952",
    "./src/glyphs.js?v=r479-311e59963952",
    "./src/echoes.js?v=r479-311e59963952",
    "./src/constellation.js?v=r479-311e59963952",
    "./src/water-traversal.js?v=r479-311e59963952",
    "./src/open-sea.js?v=r479-311e59963952",
    "./src/boats.js?v=r479-311e59963952",
    "./src/sea-creatures.js?v=r479-311e59963952",
    "./src/diving.js?v=r479-311e59963952",
    "./src/grottoes.js?v=r479-311e59963952",
    "./src/spell-slots.js?v=r479-311e59963952",
    "./src/settlements.js?v=r479-311e59963952",
    "./src/skirmishes.js?v=r479-311e59963952",
    "./src/travelers.js?v=r479-311e59963952",
    "./src/diagnostic-probe.js?v=r479-311e59963952",
    "./src/questing-beast.js?v=r479-311e59963952",
    "./src/recitations.js?v=r479-311e59963952",
    "./src/lore.js?v=r479-311e59963952",
    "./src/glimpses.js?v=r479-311e59963952",
    "./src/glimpse-render.js?v=r479-311e59963952",
    "./src/glimpse-paint.js?v=r479-311e59963952",
    "./src/glimpse-scenes.js?v=r479-311e59963952",
    "./src/glimpse-horror.js?v=r479-311e59963952",
    "./src/glimpse-legend.js?v=r479-311e59963952",
    "./src/glimpse-hand.js?v=r479-311e59963952",
    "./src/atlas-view.js?v=r479-311e59963952",
    "./src/strange.js?v=r479-311e59963952",
    "./src/linked-dungeons.js?v=r479-311e59963952",
    "./src/digging.js?v=r479-311e59963952",
    "./src/building.js?v=r479-311e59963952",
    "./src/refuge-lands.js?v=r479-311e59963952",
    "./src/revenant-horde.js?v=r479-311e59963952",
    "./src/stages.js?v=r479-311e59963952",
    "./src/watcher.js?v=r479-311e59963952",
    "./src/vehicle-gates.js?v=r479-311e59963952",
    "./src/dungeon-ladder.js?v=r479-311e59963952",
    "./src/potions.js?v=r479-311e59963952",
    "./src/transit-lattice.js?v=r479-311e59963952",
    "./src/late-spells.js?v=r479-311e59963952",
    "./src/listener-mirror.js?v=r479-311e59963952",
    "./src/hometowns.js?v=r479-311e59963952",
    "./src/listener-arena.js?v=r479-311e59963952",
    "./src/listener-morph.js?v=r479-311e59963952",
    "./src/build-presets.js?v=r479-311e59963952",
    "./src/smithy.js?v=r479-311e59963952",
    "./src/ilse.js?v=r479-311e59963952",
    "./src/bells.js?v=r479-311e59963952",
    "./src/meals.js?v=r479-311e59963952",
    "./src/margins.js?v=r479-311e59963952",
    "./src/marginalia.js?v=r479-311e59963952",
    "./src/tyrant-hunt.js?v=r479-311e59963952",
    "./src/world-beasts.js?v=r479-311e59963952",
    "./src/elders.js?v=r479-311e59963952",
    "./src/far-array.js?v=r479-311e59963952",
    "./src/combat-visuals.js?v=r479-311e59963952",
    "./src/dungeon-framework.js?v=r479-311e59963952",
    "./src/elites.js?v=r479-311e59963952",
    "./src/random.js?v=r479-311e59963952",
    "./src/types.js?v=r479-311e59963952",
    "./src/story.js?v=r479-311e59963952",
    "./src/foundry.js?v=r479-311e59963952",
    "./src/world.js?v=r479-311e59963952",
    "./src/deep-dungeons.js?v=r479-311e59963952",
    "./src/scenes.js?v=r479-311e59963952",
    "./src/arenas.js?v=r479-311e59963952",
    "./src/items.js?v=r479-311e59963952",
    "./src/combat.js?v=r479-311e59963952",
    "./src/interactions.js?v=r479-311e59963952",
    "./src/persistence.js?v=r479-311e59963952",
    "./src/input.js?v=r479-311e59963952",
    "./src/game.js?v=r479-311e59963952",
    "./src/renderer.js?v=r479-311e59963952",
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
