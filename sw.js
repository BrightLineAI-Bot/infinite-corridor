const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v577`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=577",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=577",
    "./src/proving-ground.js?v=577",
    "./src/proving-ground-fixtures.js?v=577",
    "./src/proving-ground-labs.js?v=577",
    "./src/dungeon-variation.js?v=577",
    "./src/dungeon-completion.js?v=577",
    "./src/enemy-patterns.js?v=577",
    "./src/monster-pack.js?v=577",
    "./src/monster-render.js?v=577",
    "./src/astral-worm.js?v=577",
    "./src/astral-worm-render.js?v=577",
    "./src/astral-worm-retreat.js?v=577",
    "./src/astral-worm-mount.js?v=577",
    "./src/lightning-giant-render.js?v=577",
    "./src/astral-encounters.js?v=577",
    "./src/astral-world-retreat.js?v=577",
    "./src/landscape.js?v=577",
    "./src/landscape-render.js?v=577",
    "./src/underlands.js?v=577",
    "./src/pattern-dungeons.js?v=577",
    "./src/relay-network.js?v=577",
    "./src/glyphs.js?v=577",
    "./src/echoes.js?v=577",
    "./src/constellation.js?v=577",
    "./src/water-traversal.js?v=577",
    "./src/open-sea.js?v=577",
    "./src/boats.js?v=577",
    "./src/sea-creatures.js?v=577",
    "./src/diving.js?v=577",
    "./src/grottoes.js?v=577",
    "./src/spell-slots.js?v=577",
    "./src/settlements.js?v=577",
    "./src/skirmishes.js?v=577",
    "./src/travelers.js?v=577",
    "./src/diagnostic-probe.js?v=577",
    "./src/questing-beast.js?v=577",
    "./src/recitations.js?v=577",
    "./src/lore.js?v=577",
    "./src/glimpses.js?v=577",
    "./src/glimpse-render.js?v=577",
    "./src/glimpse-paint.js?v=577",
    "./src/glimpse-scenes.js?v=577",
    "./src/glimpse-horror.js?v=577",
    "./src/glimpse-legend.js?v=577",
    "./src/glimpse-hand.js?v=577",
    "./src/atlas-view.js?v=577",
    "./src/strange.js?v=577",
    "./src/linked-dungeons.js?v=577",
    "./src/digging.js?v=577",
    "./src/building.js?v=577",
    "./src/refuge-lands.js?v=577",
    "./src/revenant-horde.js?v=577",
    "./src/stages.js?v=577",
    "./src/watcher.js?v=577",
    "./src/vehicle-gates.js?v=577",
    "./src/dungeon-ladder.js?v=577",
    "./src/potions.js?v=577",
    "./src/transit-lattice.js?v=577",
    "./src/late-spells.js?v=577",
    "./src/brawler-spells.js?v=577",
    "./src/orbit-volley.js?v=577",
    "./src/tool-forms.js?v=577",
    "./src/sling.js?v=577",
    "./src/atlas-colors.js?v=577",
    "./src/skylands.js?v=577",
    "./src/surveyor.js?v=577",
    "./src/lattice-fields.js?v=577",
    "./src/dungeon-traps.js?v=577",
    "./src/listener-mirror.js?v=577",
    "./src/hometowns.js?v=577",
    "./src/listener-arena.js?v=577",
    "./src/listener-morph.js?v=577",
    "./src/build-presets.js?v=577",
    "./src/smithy.js?v=577",
    "./src/ilse.js?v=577",
    "./src/bells.js?v=577",
    "./src/meals.js?v=577",
    "./src/margins.js?v=577",
    "./src/marginalia.js?v=577",
    "./src/tyrant-hunt.js?v=577",
    "./src/world-beasts.js?v=577",
    "./src/elders.js?v=577",
    "./src/far-array.js?v=577",
    "./src/combat-visuals.js?v=577",
    "./src/dungeon-framework.js?v=577",
    "./src/elites.js?v=577",
    "./src/random.js?v=577",
    "./src/types.js?v=577",
    "./src/story.js?v=577",
    "./src/foundry.js?v=577",
    "./src/world.js?v=577",
    "./src/deep-dungeons.js?v=577",
    "./src/scenes.js?v=577",
    "./src/arenas.js?v=577",
    "./src/items.js?v=577",
    "./src/combat.js?v=577",
    "./src/interactions.js?v=577",
    "./src/persistence.js?v=577",
    "./src/input.js?v=577",
    "./src/game.js?v=577",
    "./src/renderer.js?v=577",
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
