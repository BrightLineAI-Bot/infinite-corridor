const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v433`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=433",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=433",
    "./src/proving-ground.js?v=433",
    "./src/proving-ground-fixtures.js?v=433",
    "./src/proving-ground-labs.js?v=433",
    "./src/dungeon-variation.js?v=433",
    "./src/dungeon-completion.js?v=433",
    "./src/enemy-patterns.js?v=433",
    "./src/monster-pack.js?v=433",
    "./src/monster-render.js?v=433",
    "./src/astral-worm.js?v=433",
    "./src/astral-worm-render.js?v=433",
    "./src/astral-worm-retreat.js?v=433",
    "./src/astral-worm-mount.js?v=433",
    "./src/lightning-giant-render.js?v=433",
    "./src/astral-encounters.js?v=433",
    "./src/astral-world-retreat.js?v=433",
    "./src/landscape.js?v=433",
    "./src/landscape-render.js?v=433",
    "./src/underlands.js?v=433",
    "./src/pattern-dungeons.js?v=433",
    "./src/relay-network.js?v=433",
    "./src/glyphs.js?v=433",
    "./src/echoes.js?v=433",
    "./src/constellation.js?v=433",
    "./src/water-traversal.js?v=433",
    "./src/open-sea.js?v=433",
    "./src/boats.js?v=433",
    "./src/sea-creatures.js?v=433",
    "./src/diving.js?v=433",
    "./src/grottoes.js?v=433",
    "./src/spell-slots.js?v=433",
    "./src/settlements.js?v=433",
    "./src/skirmishes.js?v=433",
    "./src/travelers.js?v=433",
    "./src/diagnostic-probe.js?v=433",
    "./src/questing-beast.js?v=433",
    "./src/recitations.js?v=433",
    "./src/lore.js?v=433",
    "./src/glimpses.js?v=433",
    "./src/glimpse-render.js?v=433",
    "./src/glimpse-paint.js?v=433",
    "./src/glimpse-scenes.js?v=433",
    "./src/glimpse-horror.js?v=433",
    "./src/glimpse-legend.js?v=433",
    "./src/glimpse-hand.js?v=433",
    "./src/atlas-view.js?v=433",
    "./src/strange.js?v=433",
    "./src/linked-dungeons.js?v=433",
    "./src/digging.js?v=433",
    "./src/building.js?v=433",
    "./src/refuge-lands.js?v=433",
    "./src/revenant-horde.js?v=433",
    "./src/stages.js?v=433",
    "./src/watcher.js?v=433",
    "./src/vehicle-gates.js?v=433",
    "./src/dungeon-ladder.js?v=433",
    "./src/potions.js?v=433",
    "./src/transit-lattice.js?v=433",
    "./src/late-spells.js?v=433",
    "./src/listener-mirror.js?v=433",
    "./src/hometowns.js?v=433",
    "./src/listener-arena.js?v=433",
    "./src/listener-morph.js?v=433",
    "./src/build-presets.js?v=433",
    "./src/smithy.js?v=433",
    "./src/ilse.js?v=433",
    "./src/bells.js?v=433",
    "./src/tyrant-hunt.js?v=433",
    "./src/world-beasts.js?v=433",
    "./src/elders.js?v=433",
    "./src/far-array.js?v=433",
    "./src/combat-visuals.js?v=433",
    "./src/dungeon-framework.js?v=433",
    "./src/elites.js?v=433",
    "./src/random.js?v=433",
    "./src/types.js?v=433",
    "./src/story.js?v=433",
    "./src/foundry.js?v=433",
    "./src/world.js?v=433",
    "./src/deep-dungeons.js?v=433",
    "./src/scenes.js?v=433",
    "./src/arenas.js?v=433",
    "./src/items.js?v=433",
    "./src/combat.js?v=433",
    "./src/interactions.js?v=433",
    "./src/persistence.js?v=433",
    "./src/input.js?v=433",
    "./src/game.js?v=433",
    "./src/renderer.js?v=433",
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
