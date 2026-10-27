const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v485`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=485",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=485",
    "./src/proving-ground.js?v=485",
    "./src/proving-ground-fixtures.js?v=485",
    "./src/proving-ground-labs.js?v=485",
    "./src/dungeon-variation.js?v=485",
    "./src/dungeon-completion.js?v=485",
    "./src/enemy-patterns.js?v=485",
    "./src/monster-pack.js?v=485",
    "./src/monster-render.js?v=485",
    "./src/astral-worm.js?v=485",
    "./src/astral-worm-render.js?v=485",
    "./src/astral-worm-retreat.js?v=485",
    "./src/astral-worm-mount.js?v=485",
    "./src/lightning-giant-render.js?v=485",
    "./src/astral-encounters.js?v=485",
    "./src/astral-world-retreat.js?v=485",
    "./src/landscape.js?v=485",
    "./src/landscape-render.js?v=485",
    "./src/underlands.js?v=485",
    "./src/pattern-dungeons.js?v=485",
    "./src/relay-network.js?v=485",
    "./src/glyphs.js?v=485",
    "./src/echoes.js?v=485",
    "./src/constellation.js?v=485",
    "./src/water-traversal.js?v=485",
    "./src/open-sea.js?v=485",
    "./src/boats.js?v=485",
    "./src/sea-creatures.js?v=485",
    "./src/diving.js?v=485",
    "./src/grottoes.js?v=485",
    "./src/spell-slots.js?v=485",
    "./src/settlements.js?v=485",
    "./src/skirmishes.js?v=485",
    "./src/travelers.js?v=485",
    "./src/diagnostic-probe.js?v=485",
    "./src/questing-beast.js?v=485",
    "./src/recitations.js?v=485",
    "./src/lore.js?v=485",
    "./src/glimpses.js?v=485",
    "./src/glimpse-render.js?v=485",
    "./src/glimpse-paint.js?v=485",
    "./src/glimpse-scenes.js?v=485",
    "./src/glimpse-horror.js?v=485",
    "./src/glimpse-legend.js?v=485",
    "./src/glimpse-hand.js?v=485",
    "./src/atlas-view.js?v=485",
    "./src/strange.js?v=485",
    "./src/linked-dungeons.js?v=485",
    "./src/digging.js?v=485",
    "./src/building.js?v=485",
    "./src/refuge-lands.js?v=485",
    "./src/revenant-horde.js?v=485",
    "./src/stages.js?v=485",
    "./src/watcher.js?v=485",
    "./src/vehicle-gates.js?v=485",
    "./src/dungeon-ladder.js?v=485",
    "./src/potions.js?v=485",
    "./src/transit-lattice.js?v=485",
    "./src/late-spells.js?v=485",
    "./src/brawler-spells.js?v=485",
    "./src/listener-mirror.js?v=485",
    "./src/hometowns.js?v=485",
    "./src/listener-arena.js?v=485",
    "./src/listener-morph.js?v=485",
    "./src/build-presets.js?v=485",
    "./src/smithy.js?v=485",
    "./src/ilse.js?v=485",
    "./src/bells.js?v=485",
    "./src/meals.js?v=485",
    "./src/margins.js?v=485",
    "./src/marginalia.js?v=485",
    "./src/tyrant-hunt.js?v=485",
    "./src/world-beasts.js?v=485",
    "./src/elders.js?v=485",
    "./src/far-array.js?v=485",
    "./src/combat-visuals.js?v=485",
    "./src/dungeon-framework.js?v=485",
    "./src/elites.js?v=485",
    "./src/random.js?v=485",
    "./src/types.js?v=485",
    "./src/story.js?v=485",
    "./src/foundry.js?v=485",
    "./src/world.js?v=485",
    "./src/deep-dungeons.js?v=485",
    "./src/scenes.js?v=485",
    "./src/arenas.js?v=485",
    "./src/items.js?v=485",
    "./src/combat.js?v=485",
    "./src/interactions.js?v=485",
    "./src/persistence.js?v=485",
    "./src/input.js?v=485",
    "./src/game.js?v=485",
    "./src/renderer.js?v=485",
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
