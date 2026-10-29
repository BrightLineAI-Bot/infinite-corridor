const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r581-c265662f6b96`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r581-c265662f6b96",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r581-c265662f6b96",
    "./src/proving-ground.js?v=r581-c265662f6b96",
    "./src/proving-ground-fixtures.js?v=r581-c265662f6b96",
    "./src/proving-ground-labs.js?v=r581-c265662f6b96",
    "./src/dungeon-variation.js?v=r581-c265662f6b96",
    "./src/dungeon-completion.js?v=r581-c265662f6b96",
    "./src/enemy-patterns.js?v=r581-c265662f6b96",
    "./src/monster-pack.js?v=r581-c265662f6b96",
    "./src/monster-render.js?v=r581-c265662f6b96",
    "./src/astral-worm.js?v=r581-c265662f6b96",
    "./src/astral-worm-render.js?v=r581-c265662f6b96",
    "./src/astral-worm-retreat.js?v=r581-c265662f6b96",
    "./src/astral-worm-mount.js?v=r581-c265662f6b96",
    "./src/lightning-giant-render.js?v=r581-c265662f6b96",
    "./src/astral-encounters.js?v=r581-c265662f6b96",
    "./src/astral-world-retreat.js?v=r581-c265662f6b96",
    "./src/landscape.js?v=r581-c265662f6b96",
    "./src/landscape-render.js?v=r581-c265662f6b96",
    "./src/underlands.js?v=r581-c265662f6b96",
    "./src/pattern-dungeons.js?v=r581-c265662f6b96",
    "./src/relay-network.js?v=r581-c265662f6b96",
    "./src/glyphs.js?v=r581-c265662f6b96",
    "./src/echoes.js?v=r581-c265662f6b96",
    "./src/constellation.js?v=r581-c265662f6b96",
    "./src/water-traversal.js?v=r581-c265662f6b96",
    "./src/open-sea.js?v=r581-c265662f6b96",
    "./src/boats.js?v=r581-c265662f6b96",
    "./src/sea-creatures.js?v=r581-c265662f6b96",
    "./src/diving.js?v=r581-c265662f6b96",
    "./src/grottoes.js?v=r581-c265662f6b96",
    "./src/spell-slots.js?v=r581-c265662f6b96",
    "./src/settlements.js?v=r581-c265662f6b96",
    "./src/skirmishes.js?v=r581-c265662f6b96",
    "./src/travelers.js?v=r581-c265662f6b96",
    "./src/diagnostic-probe.js?v=r581-c265662f6b96",
    "./src/questing-beast.js?v=r581-c265662f6b96",
    "./src/recitations.js?v=r581-c265662f6b96",
    "./src/lore.js?v=r581-c265662f6b96",
    "./src/glimpses.js?v=r581-c265662f6b96",
    "./src/glimpse-render.js?v=r581-c265662f6b96",
    "./src/glimpse-paint.js?v=r581-c265662f6b96",
    "./src/glimpse-scenes.js?v=r581-c265662f6b96",
    "./src/glimpse-horror.js?v=r581-c265662f6b96",
    "./src/glimpse-legend.js?v=r581-c265662f6b96",
    "./src/glimpse-hand.js?v=r581-c265662f6b96",
    "./src/atlas-view.js?v=r581-c265662f6b96",
    "./src/strange.js?v=r581-c265662f6b96",
    "./src/linked-dungeons.js?v=r581-c265662f6b96",
    "./src/digging.js?v=r581-c265662f6b96",
    "./src/building.js?v=r581-c265662f6b96",
    "./src/refuge-lands.js?v=r581-c265662f6b96",
    "./src/revenant-horde.js?v=r581-c265662f6b96",
    "./src/stages.js?v=r581-c265662f6b96",
    "./src/watcher.js?v=r581-c265662f6b96",
    "./src/vehicle-gates.js?v=r581-c265662f6b96",
    "./src/dungeon-ladder.js?v=r581-c265662f6b96",
    "./src/potions.js?v=r581-c265662f6b96",
    "./src/transit-lattice.js?v=r581-c265662f6b96",
    "./src/late-spells.js?v=r581-c265662f6b96",
    "./src/brawler-spells.js?v=r581-c265662f6b96",
    "./src/orbit-volley.js?v=r581-c265662f6b96",
    "./src/tool-forms.js?v=r581-c265662f6b96",
    "./src/sling.js?v=r581-c265662f6b96",
    "./src/atlas-colors.js?v=r581-c265662f6b96",
    "./src/skylands.js?v=r581-c265662f6b96",
    "./src/surveyor.js?v=r581-c265662f6b96",
    "./src/lattice-fields.js?v=r581-c265662f6b96",
    "./src/dungeon-traps.js?v=r581-c265662f6b96",
    "./src/listener-mirror.js?v=r581-c265662f6b96",
    "./src/hometowns.js?v=r581-c265662f6b96",
    "./src/listener-arena.js?v=r581-c265662f6b96",
    "./src/listener-morph.js?v=r581-c265662f6b96",
    "./src/build-presets.js?v=r581-c265662f6b96",
    "./src/smithy.js?v=r581-c265662f6b96",
    "./src/ilse.js?v=r581-c265662f6b96",
    "./src/bells.js?v=r581-c265662f6b96",
    "./src/meals.js?v=r581-c265662f6b96",
    "./src/margins.js?v=r581-c265662f6b96",
    "./src/marginalia.js?v=r581-c265662f6b96",
    "./src/tyrant-hunt.js?v=r581-c265662f6b96",
    "./src/world-beasts.js?v=r581-c265662f6b96",
    "./src/elders.js?v=r581-c265662f6b96",
    "./src/far-array.js?v=r581-c265662f6b96",
    "./src/combat-visuals.js?v=r581-c265662f6b96",
    "./src/dungeon-framework.js?v=r581-c265662f6b96",
    "./src/elites.js?v=r581-c265662f6b96",
    "./src/random.js?v=r581-c265662f6b96",
    "./src/types.js?v=r581-c265662f6b96",
    "./src/story.js?v=r581-c265662f6b96",
    "./src/foundry.js?v=r581-c265662f6b96",
    "./src/world.js?v=r581-c265662f6b96",
    "./src/deep-dungeons.js?v=r581-c265662f6b96",
    "./src/scenes.js?v=r581-c265662f6b96",
    "./src/arenas.js?v=r581-c265662f6b96",
    "./src/items.js?v=r581-c265662f6b96",
    "./src/combat.js?v=r581-c265662f6b96",
    "./src/interactions.js?v=r581-c265662f6b96",
    "./src/persistence.js?v=r581-c265662f6b96",
    "./src/input.js?v=r581-c265662f6b96",
    "./src/game.js?v=r581-c265662f6b96",
    "./src/renderer.js?v=r581-c265662f6b96",
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
