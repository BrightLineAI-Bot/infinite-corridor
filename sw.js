const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v429`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=429",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=429",
    "./src/proving-ground.js?v=429",
    "./src/proving-ground-fixtures.js?v=429",
    "./src/proving-ground-labs.js?v=429",
    "./src/dungeon-variation.js?v=429",
    "./src/dungeon-completion.js?v=429",
    "./src/enemy-patterns.js?v=429",
    "./src/monster-pack.js?v=429",
    "./src/monster-render.js?v=429",
    "./src/astral-worm.js?v=429",
    "./src/astral-worm-render.js?v=429",
    "./src/astral-worm-retreat.js?v=429",
    "./src/astral-worm-mount.js?v=429",
    "./src/lightning-giant-render.js?v=429",
    "./src/astral-encounters.js?v=429",
    "./src/astral-world-retreat.js?v=429",
    "./src/landscape.js?v=429",
    "./src/landscape-render.js?v=429",
    "./src/underlands.js?v=429",
    "./src/pattern-dungeons.js?v=429",
    "./src/relay-network.js?v=429",
    "./src/glyphs.js?v=429",
    "./src/echoes.js?v=429",
    "./src/constellation.js?v=429",
    "./src/water-traversal.js?v=429",
    "./src/open-sea.js?v=429",
    "./src/boats.js?v=429",
    "./src/sea-creatures.js?v=429",
    "./src/diving.js?v=429",
    "./src/grottoes.js?v=429",
    "./src/spell-slots.js?v=429",
    "./src/settlements.js?v=429",
    "./src/skirmishes.js?v=429",
    "./src/travelers.js?v=429",
    "./src/diagnostic-probe.js?v=429",
    "./src/questing-beast.js?v=429",
    "./src/recitations.js?v=429",
    "./src/lore.js?v=429",
    "./src/glimpses.js?v=429",
    "./src/glimpse-render.js?v=429",
    "./src/glimpse-paint.js?v=429",
    "./src/glimpse-scenes.js?v=429",
    "./src/glimpse-horror.js?v=429",
    "./src/glimpse-legend.js?v=429",
    "./src/glimpse-hand.js?v=429",
    "./src/atlas-view.js?v=429",
    "./src/strange.js?v=429",
    "./src/linked-dungeons.js?v=429",
    "./src/digging.js?v=429",
    "./src/building.js?v=429",
    "./src/refuge-lands.js?v=429",
    "./src/revenant-horde.js?v=429",
    "./src/stages.js?v=429",
    "./src/watcher.js?v=429",
    "./src/vehicle-gates.js?v=429",
    "./src/dungeon-ladder.js?v=429",
    "./src/potions.js?v=429",
    "./src/transit-lattice.js?v=429",
    "./src/late-spells.js?v=429",
    "./src/listener-mirror.js?v=429",
    "./src/hometowns.js?v=429",
    "./src/listener-arena.js?v=429",
    "./src/listener-morph.js?v=429",
    "./src/build-presets.js?v=429",
    "./src/smithy.js?v=429",
    "./src/ilse.js?v=429",
    "./src/tyrant-hunt.js?v=429",
    "./src/world-beasts.js?v=429",
    "./src/elders.js?v=429",
    "./src/far-array.js?v=429",
    "./src/combat-visuals.js?v=429",
    "./src/dungeon-framework.js?v=429",
    "./src/elites.js?v=429",
    "./src/random.js?v=429",
    "./src/types.js?v=429",
    "./src/story.js?v=429",
    "./src/foundry.js?v=429",
    "./src/world.js?v=429",
    "./src/deep-dungeons.js?v=429",
    "./src/scenes.js?v=429",
    "./src/arenas.js?v=429",
    "./src/items.js?v=429",
    "./src/combat.js?v=429",
    "./src/interactions.js?v=429",
    "./src/persistence.js?v=429",
    "./src/input.js?v=429",
    "./src/game.js?v=429",
    "./src/renderer.js?v=429",
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
