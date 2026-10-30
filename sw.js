const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v597`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=597",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=597",
    "./src/proving-ground.js?v=597",
    "./src/proving-ground-fixtures.js?v=597",
    "./src/proving-ground-labs.js?v=597",
    "./src/dungeon-variation.js?v=597",
    "./src/dungeon-completion.js?v=597",
    "./src/enemy-patterns.js?v=597",
    "./src/monster-pack.js?v=597",
    "./src/monster-render.js?v=597",
    "./src/astral-worm.js?v=597",
    "./src/astral-worm-render.js?v=597",
    "./src/astral-worm-retreat.js?v=597",
    "./src/astral-worm-mount.js?v=597",
    "./src/lightning-giant-render.js?v=597",
    "./src/astral-encounters.js?v=597",
    "./src/astral-world-retreat.js?v=597",
    "./src/landscape.js?v=597",
    "./src/landscape-render.js?v=597",
    "./src/underlands.js?v=597",
    "./src/pattern-dungeons.js?v=597",
    "./src/relay-network.js?v=597",
    "./src/glyphs.js?v=597",
    "./src/echoes.js?v=597",
    "./src/constellation.js?v=597",
    "./src/water-traversal.js?v=597",
    "./src/open-sea.js?v=597",
    "./src/boats.js?v=597",
    "./src/sea-creatures.js?v=597",
    "./src/diving.js?v=597",
    "./src/grottoes.js?v=597",
    "./src/spell-slots.js?v=597",
    "./src/settlements.js?v=597",
    "./src/skirmishes.js?v=597",
    "./src/travelers.js?v=597",
    "./src/diagnostic-probe.js?v=597",
    "./src/questing-beast.js?v=597",
    "./src/recitations.js?v=597",
    "./src/lore.js?v=597",
    "./src/glimpses.js?v=597",
    "./src/glimpse-render.js?v=597",
    "./src/glimpse-paint.js?v=597",
    "./src/glimpse-scenes.js?v=597",
    "./src/glimpse-horror.js?v=597",
    "./src/glimpse-legend.js?v=597",
    "./src/glimpse-hand.js?v=597",
    "./src/atlas-view.js?v=597",
    "./src/strange.js?v=597",
    "./src/linked-dungeons.js?v=597",
    "./src/digging.js?v=597",
    "./src/building.js?v=597",
    "./src/refuge-lands.js?v=597",
    "./src/revenant-horde.js?v=597",
    "./src/stages.js?v=597",
    "./src/watcher.js?v=597",
    "./src/vehicle-gates.js?v=597",
    "./src/dungeon-ladder.js?v=597",
    "./src/potions.js?v=597",
    "./src/transit-lattice.js?v=597",
    "./src/late-spells.js?v=597",
    "./src/brawler-spells.js?v=597",
    "./src/orbit-volley.js?v=597",
    "./src/tool-forms.js?v=597",
    "./src/sling.js?v=597",
    "./src/atlas-colors.js?v=597",
    "./src/skylands.js?v=597",
    "./src/surveyor.js?v=597",
    "./src/torn-pages.js?v=597",
    "./src/lattice-fields.js?v=597",
    "./src/dungeon-traps.js?v=597",
    "./src/listener-mirror.js?v=597",
    "./src/hometowns.js?v=597",
    "./src/listener-arena.js?v=597",
    "./src/listener-morph.js?v=597",
    "./src/build-presets.js?v=597",
    "./src/smithy.js?v=597",
    "./src/ilse.js?v=597",
    "./src/bells.js?v=597",
    "./src/meals.js?v=597",
    "./src/margins.js?v=597",
    "./src/marginalia.js?v=597",
    "./src/tyrant-hunt.js?v=597",
    "./src/world-beasts.js?v=597",
    "./src/elders.js?v=597",
    "./src/far-array.js?v=597",
    "./src/combat-visuals.js?v=597",
    "./src/dungeon-framework.js?v=597",
    "./src/elites.js?v=597",
    "./src/random.js?v=597",
    "./src/types.js?v=597",
    "./src/story.js?v=597",
    "./src/foundry.js?v=597",
    "./src/world.js?v=597",
    "./src/deep-dungeons.js?v=597",
    "./src/scenes.js?v=597",
    "./src/arenas.js?v=597",
    "./src/items.js?v=597",
    "./src/combat.js?v=597",
    "./src/interactions.js?v=597",
    "./src/persistence.js?v=597",
    "./src/input.js?v=597",
    "./src/game.js?v=597",
    "./src/renderer.js?v=597",
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
