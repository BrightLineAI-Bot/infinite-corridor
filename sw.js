const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v611`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=611",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=611",
    "./src/proving-ground.js?v=611",
    "./src/proving-ground-fixtures.js?v=611",
    "./src/proving-ground-labs.js?v=611",
    "./src/dungeon-variation.js?v=611",
    "./src/dungeon-completion.js?v=611",
    "./src/enemy-patterns.js?v=611",
    "./src/monster-pack.js?v=611",
    "./src/monster-render.js?v=611",
    "./src/astral-worm.js?v=611",
    "./src/astral-worm-render.js?v=611",
    "./src/astral-worm-retreat.js?v=611",
    "./src/astral-worm-mount.js?v=611",
    "./src/lightning-giant-render.js?v=611",
    "./src/astral-encounters.js?v=611",
    "./src/astral-world-retreat.js?v=611",
    "./src/landscape.js?v=611",
    "./src/landscape-render.js?v=611",
    "./src/underlands.js?v=611",
    "./src/pattern-dungeons.js?v=611",
    "./src/relay-network.js?v=611",
    "./src/glyphs.js?v=611",
    "./src/echoes.js?v=611",
    "./src/constellation.js?v=611",
    "./src/water-traversal.js?v=611",
    "./src/open-sea.js?v=611",
    "./src/boats.js?v=611",
    "./src/sea-creatures.js?v=611",
    "./src/diving.js?v=611",
    "./src/grottoes.js?v=611",
    "./src/spell-slots.js?v=611",
    "./src/settlements.js?v=611",
    "./src/skirmishes.js?v=611",
    "./src/travelers.js?v=611",
    "./src/diagnostic-probe.js?v=611",
    "./src/questing-beast.js?v=611",
    "./src/recitations.js?v=611",
    "./src/lore.js?v=611",
    "./src/glimpses.js?v=611",
    "./src/glimpse-render.js?v=611",
    "./src/glimpse-paint.js?v=611",
    "./src/glimpse-scenes.js?v=611",
    "./src/glimpse-horror.js?v=611",
    "./src/glimpse-legend.js?v=611",
    "./src/glimpse-hand.js?v=611",
    "./src/atlas-view.js?v=611",
    "./src/strange.js?v=611",
    "./src/linked-dungeons.js?v=611",
    "./src/digging.js?v=611",
    "./src/building.js?v=611",
    "./src/refuge-lands.js?v=611",
    "./src/revenant-horde.js?v=611",
    "./src/stages.js?v=611",
    "./src/watcher.js?v=611",
    "./src/vehicle-gates.js?v=611",
    "./src/dungeon-ladder.js?v=611",
    "./src/potions.js?v=611",
    "./src/transit-lattice.js?v=611",
    "./src/late-spells.js?v=611",
    "./src/brawler-spells.js?v=611",
    "./src/orbit-volley.js?v=611",
    "./src/tool-forms.js?v=611",
    "./src/sling.js?v=611",
    "./src/atlas-colors.js?v=611",
    "./src/skylands.js?v=611",
    "./src/surveyor.js?v=611",
    "./src/torn-pages.js?v=611",
    "./src/lattice-fields.js?v=611",
    "./src/dungeon-traps.js?v=611",
    "./src/listener-mirror.js?v=611",
    "./src/hometowns.js?v=611",
    "./src/listener-arena.js?v=611",
    "./src/listener-morph.js?v=611",
    "./src/build-presets.js?v=611",
    "./src/smithy.js?v=611",
    "./src/ilse.js?v=611",
    "./src/bells.js?v=611",
    "./src/meals.js?v=611",
    "./src/margins.js?v=611",
    "./src/marginalia.js?v=611",
    "./src/tyrant-hunt.js?v=611",
    "./src/world-beasts.js?v=611",
    "./src/elders.js?v=611",
    "./src/far-array.js?v=611",
    "./src/combat-visuals.js?v=611",
    "./src/dungeon-framework.js?v=611",
    "./src/elites.js?v=611",
    "./src/random.js?v=611",
    "./src/types.js?v=611",
    "./src/story.js?v=611",
    "./src/foundry.js?v=611",
    "./src/world.js?v=611",
    "./src/deep-dungeons.js?v=611",
    "./src/scenes.js?v=611",
    "./src/arenas.js?v=611",
    "./src/items.js?v=611",
    "./src/combat.js?v=611",
    "./src/interactions.js?v=611",
    "./src/persistence.js?v=611",
    "./src/input.js?v=611",
    "./src/game.js?v=611",
    "./src/renderer.js?v=611",
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
