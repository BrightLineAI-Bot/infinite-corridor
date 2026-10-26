const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r437-415a6323864d`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r437-415a6323864d",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r437-415a6323864d",
    "./src/proving-ground.js?v=r437-415a6323864d",
    "./src/proving-ground-fixtures.js?v=r437-415a6323864d",
    "./src/proving-ground-labs.js?v=r437-415a6323864d",
    "./src/dungeon-variation.js?v=r437-415a6323864d",
    "./src/dungeon-completion.js?v=r437-415a6323864d",
    "./src/enemy-patterns.js?v=r437-415a6323864d",
    "./src/monster-pack.js?v=r437-415a6323864d",
    "./src/monster-render.js?v=r437-415a6323864d",
    "./src/astral-worm.js?v=r437-415a6323864d",
    "./src/astral-worm-render.js?v=r437-415a6323864d",
    "./src/astral-worm-retreat.js?v=r437-415a6323864d",
    "./src/astral-worm-mount.js?v=r437-415a6323864d",
    "./src/lightning-giant-render.js?v=r437-415a6323864d",
    "./src/astral-encounters.js?v=r437-415a6323864d",
    "./src/astral-world-retreat.js?v=r437-415a6323864d",
    "./src/landscape.js?v=r437-415a6323864d",
    "./src/landscape-render.js?v=r437-415a6323864d",
    "./src/underlands.js?v=r437-415a6323864d",
    "./src/pattern-dungeons.js?v=r437-415a6323864d",
    "./src/relay-network.js?v=r437-415a6323864d",
    "./src/glyphs.js?v=r437-415a6323864d",
    "./src/echoes.js?v=r437-415a6323864d",
    "./src/constellation.js?v=r437-415a6323864d",
    "./src/water-traversal.js?v=r437-415a6323864d",
    "./src/open-sea.js?v=r437-415a6323864d",
    "./src/boats.js?v=r437-415a6323864d",
    "./src/sea-creatures.js?v=r437-415a6323864d",
    "./src/diving.js?v=r437-415a6323864d",
    "./src/grottoes.js?v=r437-415a6323864d",
    "./src/spell-slots.js?v=r437-415a6323864d",
    "./src/settlements.js?v=r437-415a6323864d",
    "./src/skirmishes.js?v=r437-415a6323864d",
    "./src/travelers.js?v=r437-415a6323864d",
    "./src/diagnostic-probe.js?v=r437-415a6323864d",
    "./src/questing-beast.js?v=r437-415a6323864d",
    "./src/recitations.js?v=r437-415a6323864d",
    "./src/lore.js?v=r437-415a6323864d",
    "./src/glimpses.js?v=r437-415a6323864d",
    "./src/glimpse-render.js?v=r437-415a6323864d",
    "./src/glimpse-paint.js?v=r437-415a6323864d",
    "./src/glimpse-scenes.js?v=r437-415a6323864d",
    "./src/glimpse-horror.js?v=r437-415a6323864d",
    "./src/glimpse-legend.js?v=r437-415a6323864d",
    "./src/glimpse-hand.js?v=r437-415a6323864d",
    "./src/atlas-view.js?v=r437-415a6323864d",
    "./src/strange.js?v=r437-415a6323864d",
    "./src/linked-dungeons.js?v=r437-415a6323864d",
    "./src/digging.js?v=r437-415a6323864d",
    "./src/building.js?v=r437-415a6323864d",
    "./src/refuge-lands.js?v=r437-415a6323864d",
    "./src/revenant-horde.js?v=r437-415a6323864d",
    "./src/stages.js?v=r437-415a6323864d",
    "./src/watcher.js?v=r437-415a6323864d",
    "./src/vehicle-gates.js?v=r437-415a6323864d",
    "./src/dungeon-ladder.js?v=r437-415a6323864d",
    "./src/potions.js?v=r437-415a6323864d",
    "./src/transit-lattice.js?v=r437-415a6323864d",
    "./src/late-spells.js?v=r437-415a6323864d",
    "./src/listener-mirror.js?v=r437-415a6323864d",
    "./src/hometowns.js?v=r437-415a6323864d",
    "./src/listener-arena.js?v=r437-415a6323864d",
    "./src/listener-morph.js?v=r437-415a6323864d",
    "./src/build-presets.js?v=r437-415a6323864d",
    "./src/smithy.js?v=r437-415a6323864d",
    "./src/ilse.js?v=r437-415a6323864d",
    "./src/bells.js?v=r437-415a6323864d",
    "./src/tyrant-hunt.js?v=r437-415a6323864d",
    "./src/world-beasts.js?v=r437-415a6323864d",
    "./src/elders.js?v=r437-415a6323864d",
    "./src/far-array.js?v=r437-415a6323864d",
    "./src/combat-visuals.js?v=r437-415a6323864d",
    "./src/dungeon-framework.js?v=r437-415a6323864d",
    "./src/elites.js?v=r437-415a6323864d",
    "./src/random.js?v=r437-415a6323864d",
    "./src/types.js?v=r437-415a6323864d",
    "./src/story.js?v=r437-415a6323864d",
    "./src/foundry.js?v=r437-415a6323864d",
    "./src/world.js?v=r437-415a6323864d",
    "./src/deep-dungeons.js?v=r437-415a6323864d",
    "./src/scenes.js?v=r437-415a6323864d",
    "./src/arenas.js?v=r437-415a6323864d",
    "./src/items.js?v=r437-415a6323864d",
    "./src/combat.js?v=r437-415a6323864d",
    "./src/interactions.js?v=r437-415a6323864d",
    "./src/persistence.js?v=r437-415a6323864d",
    "./src/input.js?v=r437-415a6323864d",
    "./src/game.js?v=r437-415a6323864d",
    "./src/renderer.js?v=r437-415a6323864d",
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
