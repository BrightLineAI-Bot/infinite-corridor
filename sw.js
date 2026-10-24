const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v423`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=423",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=423",
    "./src/proving-ground.js?v=423",
    "./src/proving-ground-fixtures.js?v=423",
    "./src/proving-ground-labs.js?v=423",
    "./src/dungeon-variation.js?v=423",
    "./src/dungeon-completion.js?v=423",
    "./src/enemy-patterns.js?v=423",
    "./src/monster-pack.js?v=423",
    "./src/monster-render.js?v=423",
    "./src/astral-worm.js?v=423",
    "./src/astral-worm-render.js?v=423",
    "./src/astral-worm-retreat.js?v=423",
    "./src/astral-worm-mount.js?v=423",
    "./src/lightning-giant-render.js?v=423",
    "./src/astral-encounters.js?v=423",
    "./src/astral-world-retreat.js?v=423",
    "./src/landscape.js?v=423",
    "./src/landscape-render.js?v=423",
    "./src/underlands.js?v=423",
    "./src/pattern-dungeons.js?v=423",
    "./src/relay-network.js?v=423",
    "./src/glyphs.js?v=423",
    "./src/echoes.js?v=423",
    "./src/constellation.js?v=423",
    "./src/water-traversal.js?v=423",
    "./src/open-sea.js?v=423",
    "./src/boats.js?v=423",
    "./src/sea-creatures.js?v=423",
    "./src/diving.js?v=423",
    "./src/grottoes.js?v=423",
    "./src/spell-slots.js?v=423",
    "./src/settlements.js?v=423",
    "./src/skirmishes.js?v=423",
    "./src/travelers.js?v=423",
    "./src/diagnostic-probe.js?v=423",
    "./src/questing-beast.js?v=423",
    "./src/recitations.js?v=423",
    "./src/lore.js?v=423",
    "./src/glimpses.js?v=423",
    "./src/glimpse-render.js?v=423",
    "./src/glimpse-paint.js?v=423",
    "./src/glimpse-scenes.js?v=423",
    "./src/glimpse-horror.js?v=423",
    "./src/glimpse-legend.js?v=423",
    "./src/glimpse-hand.js?v=423",
    "./src/atlas-view.js?v=423",
    "./src/strange.js?v=423",
    "./src/linked-dungeons.js?v=423",
    "./src/digging.js?v=423",
    "./src/building.js?v=423",
    "./src/refuge-lands.js?v=423",
    "./src/revenant-horde.js?v=423",
    "./src/stages.js?v=423",
    "./src/watcher.js?v=423",
    "./src/vehicle-gates.js?v=423",
    "./src/dungeon-ladder.js?v=423",
    "./src/potions.js?v=423",
    "./src/transit-lattice.js?v=423",
    "./src/late-spells.js?v=423",
    "./src/listener-mirror.js?v=423",
    "./src/hometowns.js?v=423",
    "./src/listener-arena.js?v=423",
    "./src/listener-morph.js?v=423",
    "./src/build-presets.js?v=423",
    "./src/smithy.js?v=423",
    "./src/ilse.js?v=423",
    "./src/tyrant-hunt.js?v=423",
    "./src/world-beasts.js?v=423",
    "./src/elders.js?v=423",
    "./src/far-array.js?v=423",
    "./src/combat-visuals.js?v=423",
    "./src/dungeon-framework.js?v=423",
    "./src/elites.js?v=423",
    "./src/random.js?v=423",
    "./src/types.js?v=423",
    "./src/story.js?v=423",
    "./src/foundry.js?v=423",
    "./src/world.js?v=423",
    "./src/deep-dungeons.js?v=423",
    "./src/scenes.js?v=423",
    "./src/arenas.js?v=423",
    "./src/items.js?v=423",
    "./src/combat.js?v=423",
    "./src/interactions.js?v=423",
    "./src/persistence.js?v=423",
    "./src/input.js?v=423",
    "./src/game.js?v=423",
    "./src/renderer.js?v=423",
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
