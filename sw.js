const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v569`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=569",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=569",
    "./src/proving-ground.js?v=569",
    "./src/proving-ground-fixtures.js?v=569",
    "./src/proving-ground-labs.js?v=569",
    "./src/dungeon-variation.js?v=569",
    "./src/dungeon-completion.js?v=569",
    "./src/enemy-patterns.js?v=569",
    "./src/monster-pack.js?v=569",
    "./src/monster-render.js?v=569",
    "./src/astral-worm.js?v=569",
    "./src/astral-worm-render.js?v=569",
    "./src/astral-worm-retreat.js?v=569",
    "./src/astral-worm-mount.js?v=569",
    "./src/lightning-giant-render.js?v=569",
    "./src/astral-encounters.js?v=569",
    "./src/astral-world-retreat.js?v=569",
    "./src/landscape.js?v=569",
    "./src/landscape-render.js?v=569",
    "./src/underlands.js?v=569",
    "./src/pattern-dungeons.js?v=569",
    "./src/relay-network.js?v=569",
    "./src/glyphs.js?v=569",
    "./src/echoes.js?v=569",
    "./src/constellation.js?v=569",
    "./src/water-traversal.js?v=569",
    "./src/open-sea.js?v=569",
    "./src/boats.js?v=569",
    "./src/sea-creatures.js?v=569",
    "./src/diving.js?v=569",
    "./src/grottoes.js?v=569",
    "./src/spell-slots.js?v=569",
    "./src/settlements.js?v=569",
    "./src/skirmishes.js?v=569",
    "./src/travelers.js?v=569",
    "./src/diagnostic-probe.js?v=569",
    "./src/questing-beast.js?v=569",
    "./src/recitations.js?v=569",
    "./src/lore.js?v=569",
    "./src/glimpses.js?v=569",
    "./src/glimpse-render.js?v=569",
    "./src/glimpse-paint.js?v=569",
    "./src/glimpse-scenes.js?v=569",
    "./src/glimpse-horror.js?v=569",
    "./src/glimpse-legend.js?v=569",
    "./src/glimpse-hand.js?v=569",
    "./src/atlas-view.js?v=569",
    "./src/strange.js?v=569",
    "./src/linked-dungeons.js?v=569",
    "./src/digging.js?v=569",
    "./src/building.js?v=569",
    "./src/refuge-lands.js?v=569",
    "./src/revenant-horde.js?v=569",
    "./src/stages.js?v=569",
    "./src/watcher.js?v=569",
    "./src/vehicle-gates.js?v=569",
    "./src/dungeon-ladder.js?v=569",
    "./src/potions.js?v=569",
    "./src/transit-lattice.js?v=569",
    "./src/late-spells.js?v=569",
    "./src/brawler-spells.js?v=569",
    "./src/orbit-volley.js?v=569",
    "./src/tool-forms.js?v=569",
    "./src/sling.js?v=569",
    "./src/atlas-colors.js?v=569",
    "./src/surveyor.js?v=569",
    "./src/lattice-fields.js?v=569",
    "./src/dungeon-traps.js?v=569",
    "./src/listener-mirror.js?v=569",
    "./src/hometowns.js?v=569",
    "./src/listener-arena.js?v=569",
    "./src/listener-morph.js?v=569",
    "./src/build-presets.js?v=569",
    "./src/smithy.js?v=569",
    "./src/ilse.js?v=569",
    "./src/bells.js?v=569",
    "./src/meals.js?v=569",
    "./src/margins.js?v=569",
    "./src/marginalia.js?v=569",
    "./src/tyrant-hunt.js?v=569",
    "./src/world-beasts.js?v=569",
    "./src/elders.js?v=569",
    "./src/far-array.js?v=569",
    "./src/combat-visuals.js?v=569",
    "./src/dungeon-framework.js?v=569",
    "./src/elites.js?v=569",
    "./src/random.js?v=569",
    "./src/types.js?v=569",
    "./src/story.js?v=569",
    "./src/foundry.js?v=569",
    "./src/world.js?v=569",
    "./src/deep-dungeons.js?v=569",
    "./src/scenes.js?v=569",
    "./src/arenas.js?v=569",
    "./src/items.js?v=569",
    "./src/combat.js?v=569",
    "./src/interactions.js?v=569",
    "./src/persistence.js?v=569",
    "./src/input.js?v=569",
    "./src/game.js?v=569",
    "./src/renderer.js?v=569",
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
