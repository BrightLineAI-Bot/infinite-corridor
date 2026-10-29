const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v561`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=561",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=561",
    "./src/proving-ground.js?v=561",
    "./src/proving-ground-fixtures.js?v=561",
    "./src/proving-ground-labs.js?v=561",
    "./src/dungeon-variation.js?v=561",
    "./src/dungeon-completion.js?v=561",
    "./src/enemy-patterns.js?v=561",
    "./src/monster-pack.js?v=561",
    "./src/monster-render.js?v=561",
    "./src/astral-worm.js?v=561",
    "./src/astral-worm-render.js?v=561",
    "./src/astral-worm-retreat.js?v=561",
    "./src/astral-worm-mount.js?v=561",
    "./src/lightning-giant-render.js?v=561",
    "./src/astral-encounters.js?v=561",
    "./src/astral-world-retreat.js?v=561",
    "./src/landscape.js?v=561",
    "./src/landscape-render.js?v=561",
    "./src/underlands.js?v=561",
    "./src/pattern-dungeons.js?v=561",
    "./src/relay-network.js?v=561",
    "./src/glyphs.js?v=561",
    "./src/echoes.js?v=561",
    "./src/constellation.js?v=561",
    "./src/water-traversal.js?v=561",
    "./src/open-sea.js?v=561",
    "./src/boats.js?v=561",
    "./src/sea-creatures.js?v=561",
    "./src/diving.js?v=561",
    "./src/grottoes.js?v=561",
    "./src/spell-slots.js?v=561",
    "./src/settlements.js?v=561",
    "./src/skirmishes.js?v=561",
    "./src/travelers.js?v=561",
    "./src/diagnostic-probe.js?v=561",
    "./src/questing-beast.js?v=561",
    "./src/recitations.js?v=561",
    "./src/lore.js?v=561",
    "./src/glimpses.js?v=561",
    "./src/glimpse-render.js?v=561",
    "./src/glimpse-paint.js?v=561",
    "./src/glimpse-scenes.js?v=561",
    "./src/glimpse-horror.js?v=561",
    "./src/glimpse-legend.js?v=561",
    "./src/glimpse-hand.js?v=561",
    "./src/atlas-view.js?v=561",
    "./src/strange.js?v=561",
    "./src/linked-dungeons.js?v=561",
    "./src/digging.js?v=561",
    "./src/building.js?v=561",
    "./src/refuge-lands.js?v=561",
    "./src/revenant-horde.js?v=561",
    "./src/stages.js?v=561",
    "./src/watcher.js?v=561",
    "./src/vehicle-gates.js?v=561",
    "./src/dungeon-ladder.js?v=561",
    "./src/potions.js?v=561",
    "./src/transit-lattice.js?v=561",
    "./src/late-spells.js?v=561",
    "./src/brawler-spells.js?v=561",
    "./src/orbit-volley.js?v=561",
    "./src/tool-forms.js?v=561",
    "./src/sling.js?v=561",
    "./src/atlas-colors.js?v=561",
    "./src/surveyor.js?v=561",
    "./src/lattice-fields.js?v=561",
    "./src/dungeon-traps.js?v=561",
    "./src/listener-mirror.js?v=561",
    "./src/hometowns.js?v=561",
    "./src/listener-arena.js?v=561",
    "./src/listener-morph.js?v=561",
    "./src/build-presets.js?v=561",
    "./src/smithy.js?v=561",
    "./src/ilse.js?v=561",
    "./src/bells.js?v=561",
    "./src/meals.js?v=561",
    "./src/margins.js?v=561",
    "./src/marginalia.js?v=561",
    "./src/tyrant-hunt.js?v=561",
    "./src/world-beasts.js?v=561",
    "./src/elders.js?v=561",
    "./src/far-array.js?v=561",
    "./src/combat-visuals.js?v=561",
    "./src/dungeon-framework.js?v=561",
    "./src/elites.js?v=561",
    "./src/random.js?v=561",
    "./src/types.js?v=561",
    "./src/story.js?v=561",
    "./src/foundry.js?v=561",
    "./src/world.js?v=561",
    "./src/deep-dungeons.js?v=561",
    "./src/scenes.js?v=561",
    "./src/arenas.js?v=561",
    "./src/items.js?v=561",
    "./src/combat.js?v=561",
    "./src/interactions.js?v=561",
    "./src/persistence.js?v=561",
    "./src/input.js?v=561",
    "./src/game.js?v=561",
    "./src/renderer.js?v=561",
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
