const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v601`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=601",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=601",
    "./src/proving-ground.js?v=601",
    "./src/proving-ground-fixtures.js?v=601",
    "./src/proving-ground-labs.js?v=601",
    "./src/dungeon-variation.js?v=601",
    "./src/dungeon-completion.js?v=601",
    "./src/enemy-patterns.js?v=601",
    "./src/monster-pack.js?v=601",
    "./src/monster-render.js?v=601",
    "./src/astral-worm.js?v=601",
    "./src/astral-worm-render.js?v=601",
    "./src/astral-worm-retreat.js?v=601",
    "./src/astral-worm-mount.js?v=601",
    "./src/lightning-giant-render.js?v=601",
    "./src/astral-encounters.js?v=601",
    "./src/astral-world-retreat.js?v=601",
    "./src/landscape.js?v=601",
    "./src/landscape-render.js?v=601",
    "./src/underlands.js?v=601",
    "./src/pattern-dungeons.js?v=601",
    "./src/relay-network.js?v=601",
    "./src/glyphs.js?v=601",
    "./src/echoes.js?v=601",
    "./src/constellation.js?v=601",
    "./src/water-traversal.js?v=601",
    "./src/open-sea.js?v=601",
    "./src/boats.js?v=601",
    "./src/sea-creatures.js?v=601",
    "./src/diving.js?v=601",
    "./src/grottoes.js?v=601",
    "./src/spell-slots.js?v=601",
    "./src/settlements.js?v=601",
    "./src/skirmishes.js?v=601",
    "./src/travelers.js?v=601",
    "./src/diagnostic-probe.js?v=601",
    "./src/questing-beast.js?v=601",
    "./src/recitations.js?v=601",
    "./src/lore.js?v=601",
    "./src/glimpses.js?v=601",
    "./src/glimpse-render.js?v=601",
    "./src/glimpse-paint.js?v=601",
    "./src/glimpse-scenes.js?v=601",
    "./src/glimpse-horror.js?v=601",
    "./src/glimpse-legend.js?v=601",
    "./src/glimpse-hand.js?v=601",
    "./src/atlas-view.js?v=601",
    "./src/strange.js?v=601",
    "./src/linked-dungeons.js?v=601",
    "./src/digging.js?v=601",
    "./src/building.js?v=601",
    "./src/refuge-lands.js?v=601",
    "./src/revenant-horde.js?v=601",
    "./src/stages.js?v=601",
    "./src/watcher.js?v=601",
    "./src/vehicle-gates.js?v=601",
    "./src/dungeon-ladder.js?v=601",
    "./src/potions.js?v=601",
    "./src/transit-lattice.js?v=601",
    "./src/late-spells.js?v=601",
    "./src/brawler-spells.js?v=601",
    "./src/orbit-volley.js?v=601",
    "./src/tool-forms.js?v=601",
    "./src/sling.js?v=601",
    "./src/atlas-colors.js?v=601",
    "./src/skylands.js?v=601",
    "./src/surveyor.js?v=601",
    "./src/torn-pages.js?v=601",
    "./src/lattice-fields.js?v=601",
    "./src/dungeon-traps.js?v=601",
    "./src/listener-mirror.js?v=601",
    "./src/hometowns.js?v=601",
    "./src/listener-arena.js?v=601",
    "./src/listener-morph.js?v=601",
    "./src/build-presets.js?v=601",
    "./src/smithy.js?v=601",
    "./src/ilse.js?v=601",
    "./src/bells.js?v=601",
    "./src/meals.js?v=601",
    "./src/margins.js?v=601",
    "./src/marginalia.js?v=601",
    "./src/tyrant-hunt.js?v=601",
    "./src/world-beasts.js?v=601",
    "./src/elders.js?v=601",
    "./src/far-array.js?v=601",
    "./src/combat-visuals.js?v=601",
    "./src/dungeon-framework.js?v=601",
    "./src/elites.js?v=601",
    "./src/random.js?v=601",
    "./src/types.js?v=601",
    "./src/story.js?v=601",
    "./src/foundry.js?v=601",
    "./src/world.js?v=601",
    "./src/deep-dungeons.js?v=601",
    "./src/scenes.js?v=601",
    "./src/arenas.js?v=601",
    "./src/items.js?v=601",
    "./src/combat.js?v=601",
    "./src/interactions.js?v=601",
    "./src/persistence.js?v=601",
    "./src/input.js?v=601",
    "./src/game.js?v=601",
    "./src/renderer.js?v=601",
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
