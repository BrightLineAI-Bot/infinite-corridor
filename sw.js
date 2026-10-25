const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v435`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=435",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=435",
    "./src/proving-ground.js?v=435",
    "./src/proving-ground-fixtures.js?v=435",
    "./src/proving-ground-labs.js?v=435",
    "./src/dungeon-variation.js?v=435",
    "./src/dungeon-completion.js?v=435",
    "./src/enemy-patterns.js?v=435",
    "./src/monster-pack.js?v=435",
    "./src/monster-render.js?v=435",
    "./src/astral-worm.js?v=435",
    "./src/astral-worm-render.js?v=435",
    "./src/astral-worm-retreat.js?v=435",
    "./src/astral-worm-mount.js?v=435",
    "./src/lightning-giant-render.js?v=435",
    "./src/astral-encounters.js?v=435",
    "./src/astral-world-retreat.js?v=435",
    "./src/landscape.js?v=435",
    "./src/landscape-render.js?v=435",
    "./src/underlands.js?v=435",
    "./src/pattern-dungeons.js?v=435",
    "./src/relay-network.js?v=435",
    "./src/glyphs.js?v=435",
    "./src/echoes.js?v=435",
    "./src/constellation.js?v=435",
    "./src/water-traversal.js?v=435",
    "./src/open-sea.js?v=435",
    "./src/boats.js?v=435",
    "./src/sea-creatures.js?v=435",
    "./src/diving.js?v=435",
    "./src/grottoes.js?v=435",
    "./src/spell-slots.js?v=435",
    "./src/settlements.js?v=435",
    "./src/skirmishes.js?v=435",
    "./src/travelers.js?v=435",
    "./src/diagnostic-probe.js?v=435",
    "./src/questing-beast.js?v=435",
    "./src/recitations.js?v=435",
    "./src/lore.js?v=435",
    "./src/glimpses.js?v=435",
    "./src/glimpse-render.js?v=435",
    "./src/glimpse-paint.js?v=435",
    "./src/glimpse-scenes.js?v=435",
    "./src/glimpse-horror.js?v=435",
    "./src/glimpse-legend.js?v=435",
    "./src/glimpse-hand.js?v=435",
    "./src/atlas-view.js?v=435",
    "./src/strange.js?v=435",
    "./src/linked-dungeons.js?v=435",
    "./src/digging.js?v=435",
    "./src/building.js?v=435",
    "./src/refuge-lands.js?v=435",
    "./src/revenant-horde.js?v=435",
    "./src/stages.js?v=435",
    "./src/watcher.js?v=435",
    "./src/vehicle-gates.js?v=435",
    "./src/dungeon-ladder.js?v=435",
    "./src/potions.js?v=435",
    "./src/transit-lattice.js?v=435",
    "./src/late-spells.js?v=435",
    "./src/listener-mirror.js?v=435",
    "./src/hometowns.js?v=435",
    "./src/listener-arena.js?v=435",
    "./src/listener-morph.js?v=435",
    "./src/build-presets.js?v=435",
    "./src/smithy.js?v=435",
    "./src/ilse.js?v=435",
    "./src/bells.js?v=435",
    "./src/tyrant-hunt.js?v=435",
    "./src/world-beasts.js?v=435",
    "./src/elders.js?v=435",
    "./src/far-array.js?v=435",
    "./src/combat-visuals.js?v=435",
    "./src/dungeon-framework.js?v=435",
    "./src/elites.js?v=435",
    "./src/random.js?v=435",
    "./src/types.js?v=435",
    "./src/story.js?v=435",
    "./src/foundry.js?v=435",
    "./src/world.js?v=435",
    "./src/deep-dungeons.js?v=435",
    "./src/scenes.js?v=435",
    "./src/arenas.js?v=435",
    "./src/items.js?v=435",
    "./src/combat.js?v=435",
    "./src/interactions.js?v=435",
    "./src/persistence.js?v=435",
    "./src/input.js?v=435",
    "./src/game.js?v=435",
    "./src/renderer.js?v=435",
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
