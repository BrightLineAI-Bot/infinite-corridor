const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r417-e82ec8d2169a`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r417-e82ec8d2169a",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r417-e82ec8d2169a",
    "./src/proving-ground.js?v=r417-e82ec8d2169a",
    "./src/proving-ground-fixtures.js?v=r417-e82ec8d2169a",
    "./src/proving-ground-labs.js?v=r417-e82ec8d2169a",
    "./src/dungeon-variation.js?v=r417-e82ec8d2169a",
    "./src/dungeon-completion.js?v=r417-e82ec8d2169a",
    "./src/enemy-patterns.js?v=r417-e82ec8d2169a",
    "./src/monster-pack.js?v=r417-e82ec8d2169a",
    "./src/monster-render.js?v=r417-e82ec8d2169a",
    "./src/astral-worm.js?v=r417-e82ec8d2169a",
    "./src/astral-worm-render.js?v=r417-e82ec8d2169a",
    "./src/astral-worm-retreat.js?v=r417-e82ec8d2169a",
    "./src/astral-worm-mount.js?v=r417-e82ec8d2169a",
    "./src/lightning-giant-render.js?v=r417-e82ec8d2169a",
    "./src/astral-encounters.js?v=r417-e82ec8d2169a",
    "./src/astral-world-retreat.js?v=r417-e82ec8d2169a",
    "./src/landscape.js?v=r417-e82ec8d2169a",
    "./src/landscape-render.js?v=r417-e82ec8d2169a",
    "./src/underlands.js?v=r417-e82ec8d2169a",
    "./src/pattern-dungeons.js?v=r417-e82ec8d2169a",
    "./src/relay-network.js?v=r417-e82ec8d2169a",
    "./src/glyphs.js?v=r417-e82ec8d2169a",
    "./src/echoes.js?v=r417-e82ec8d2169a",
    "./src/constellation.js?v=r417-e82ec8d2169a",
    "./src/water-traversal.js?v=r417-e82ec8d2169a",
    "./src/open-sea.js?v=r417-e82ec8d2169a",
    "./src/boats.js?v=r417-e82ec8d2169a",
    "./src/sea-creatures.js?v=r417-e82ec8d2169a",
    "./src/diving.js?v=r417-e82ec8d2169a",
    "./src/grottoes.js?v=r417-e82ec8d2169a",
    "./src/spell-slots.js?v=r417-e82ec8d2169a",
    "./src/settlements.js?v=r417-e82ec8d2169a",
    "./src/skirmishes.js?v=r417-e82ec8d2169a",
    "./src/travelers.js?v=r417-e82ec8d2169a",
    "./src/diagnostic-probe.js?v=r417-e82ec8d2169a",
    "./src/questing-beast.js?v=r417-e82ec8d2169a",
    "./src/recitations.js?v=r417-e82ec8d2169a",
    "./src/lore.js?v=r417-e82ec8d2169a",
    "./src/glimpses.js?v=r417-e82ec8d2169a",
    "./src/glimpse-render.js?v=r417-e82ec8d2169a",
    "./src/glimpse-paint.js?v=r417-e82ec8d2169a",
    "./src/glimpse-scenes.js?v=r417-e82ec8d2169a",
    "./src/glimpse-horror.js?v=r417-e82ec8d2169a",
    "./src/glimpse-legend.js?v=r417-e82ec8d2169a",
    "./src/glimpse-hand.js?v=r417-e82ec8d2169a",
    "./src/atlas-view.js?v=r417-e82ec8d2169a",
    "./src/strange.js?v=r417-e82ec8d2169a",
    "./src/linked-dungeons.js?v=r417-e82ec8d2169a",
    "./src/digging.js?v=r417-e82ec8d2169a",
    "./src/building.js?v=r417-e82ec8d2169a",
    "./src/refuge-lands.js?v=r417-e82ec8d2169a",
    "./src/revenant-horde.js?v=r417-e82ec8d2169a",
    "./src/stages.js?v=r417-e82ec8d2169a",
    "./src/watcher.js?v=r417-e82ec8d2169a",
    "./src/vehicle-gates.js?v=r417-e82ec8d2169a",
    "./src/dungeon-ladder.js?v=r417-e82ec8d2169a",
    "./src/potions.js?v=r417-e82ec8d2169a",
    "./src/transit-lattice.js?v=r417-e82ec8d2169a",
    "./src/late-spells.js?v=r417-e82ec8d2169a",
    "./src/listener-mirror.js?v=r417-e82ec8d2169a",
    "./src/hometowns.js?v=r417-e82ec8d2169a",
    "./src/listener-arena.js?v=r417-e82ec8d2169a",
    "./src/listener-morph.js?v=r417-e82ec8d2169a",
    "./src/build-presets.js?v=r417-e82ec8d2169a",
    "./src/smithy.js?v=r417-e82ec8d2169a",
    "./src/ilse.js?v=r417-e82ec8d2169a",
    "./src/tyrant-hunt.js?v=r417-e82ec8d2169a",
    "./src/world-beasts.js?v=r417-e82ec8d2169a",
    "./src/elders.js?v=r417-e82ec8d2169a",
    "./src/far-array.js?v=r417-e82ec8d2169a",
    "./src/combat-visuals.js?v=r417-e82ec8d2169a",
    "./src/dungeon-framework.js?v=r417-e82ec8d2169a",
    "./src/elites.js?v=r417-e82ec8d2169a",
    "./src/random.js?v=r417-e82ec8d2169a",
    "./src/types.js?v=r417-e82ec8d2169a",
    "./src/story.js?v=r417-e82ec8d2169a",
    "./src/foundry.js?v=r417-e82ec8d2169a",
    "./src/world.js?v=r417-e82ec8d2169a",
    "./src/deep-dungeons.js?v=r417-e82ec8d2169a",
    "./src/scenes.js?v=r417-e82ec8d2169a",
    "./src/arenas.js?v=r417-e82ec8d2169a",
    "./src/items.js?v=r417-e82ec8d2169a",
    "./src/combat.js?v=r417-e82ec8d2169a",
    "./src/interactions.js?v=r417-e82ec8d2169a",
    "./src/persistence.js?v=r417-e82ec8d2169a",
    "./src/input.js?v=r417-e82ec8d2169a",
    "./src/game.js?v=r417-e82ec8d2169a",
    "./src/renderer.js?v=r417-e82ec8d2169a",
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
