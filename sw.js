const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r603-4a30ef332f21`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r603-4a30ef332f21",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r603-4a30ef332f21",
    "./src/proving-ground.js?v=r603-4a30ef332f21",
    "./src/proving-ground-fixtures.js?v=r603-4a30ef332f21",
    "./src/proving-ground-labs.js?v=r603-4a30ef332f21",
    "./src/dungeon-variation.js?v=r603-4a30ef332f21",
    "./src/dungeon-completion.js?v=r603-4a30ef332f21",
    "./src/enemy-patterns.js?v=r603-4a30ef332f21",
    "./src/monster-pack.js?v=r603-4a30ef332f21",
    "./src/monster-render.js?v=r603-4a30ef332f21",
    "./src/astral-worm.js?v=r603-4a30ef332f21",
    "./src/astral-worm-render.js?v=r603-4a30ef332f21",
    "./src/astral-worm-retreat.js?v=r603-4a30ef332f21",
    "./src/astral-worm-mount.js?v=r603-4a30ef332f21",
    "./src/lightning-giant-render.js?v=r603-4a30ef332f21",
    "./src/astral-encounters.js?v=r603-4a30ef332f21",
    "./src/astral-world-retreat.js?v=r603-4a30ef332f21",
    "./src/landscape.js?v=r603-4a30ef332f21",
    "./src/landscape-render.js?v=r603-4a30ef332f21",
    "./src/underlands.js?v=r603-4a30ef332f21",
    "./src/pattern-dungeons.js?v=r603-4a30ef332f21",
    "./src/relay-network.js?v=r603-4a30ef332f21",
    "./src/glyphs.js?v=r603-4a30ef332f21",
    "./src/echoes.js?v=r603-4a30ef332f21",
    "./src/constellation.js?v=r603-4a30ef332f21",
    "./src/water-traversal.js?v=r603-4a30ef332f21",
    "./src/open-sea.js?v=r603-4a30ef332f21",
    "./src/boats.js?v=r603-4a30ef332f21",
    "./src/sea-creatures.js?v=r603-4a30ef332f21",
    "./src/diving.js?v=r603-4a30ef332f21",
    "./src/grottoes.js?v=r603-4a30ef332f21",
    "./src/spell-slots.js?v=r603-4a30ef332f21",
    "./src/settlements.js?v=r603-4a30ef332f21",
    "./src/skirmishes.js?v=r603-4a30ef332f21",
    "./src/travelers.js?v=r603-4a30ef332f21",
    "./src/diagnostic-probe.js?v=r603-4a30ef332f21",
    "./src/questing-beast.js?v=r603-4a30ef332f21",
    "./src/recitations.js?v=r603-4a30ef332f21",
    "./src/lore.js?v=r603-4a30ef332f21",
    "./src/glimpses.js?v=r603-4a30ef332f21",
    "./src/glimpse-render.js?v=r603-4a30ef332f21",
    "./src/glimpse-paint.js?v=r603-4a30ef332f21",
    "./src/glimpse-scenes.js?v=r603-4a30ef332f21",
    "./src/glimpse-horror.js?v=r603-4a30ef332f21",
    "./src/glimpse-legend.js?v=r603-4a30ef332f21",
    "./src/glimpse-hand.js?v=r603-4a30ef332f21",
    "./src/atlas-view.js?v=r603-4a30ef332f21",
    "./src/strange.js?v=r603-4a30ef332f21",
    "./src/linked-dungeons.js?v=r603-4a30ef332f21",
    "./src/digging.js?v=r603-4a30ef332f21",
    "./src/building.js?v=r603-4a30ef332f21",
    "./src/refuge-lands.js?v=r603-4a30ef332f21",
    "./src/revenant-horde.js?v=r603-4a30ef332f21",
    "./src/stages.js?v=r603-4a30ef332f21",
    "./src/watcher.js?v=r603-4a30ef332f21",
    "./src/vehicle-gates.js?v=r603-4a30ef332f21",
    "./src/dungeon-ladder.js?v=r603-4a30ef332f21",
    "./src/potions.js?v=r603-4a30ef332f21",
    "./src/transit-lattice.js?v=r603-4a30ef332f21",
    "./src/late-spells.js?v=r603-4a30ef332f21",
    "./src/brawler-spells.js?v=r603-4a30ef332f21",
    "./src/orbit-volley.js?v=r603-4a30ef332f21",
    "./src/tool-forms.js?v=r603-4a30ef332f21",
    "./src/sling.js?v=r603-4a30ef332f21",
    "./src/atlas-colors.js?v=r603-4a30ef332f21",
    "./src/skylands.js?v=r603-4a30ef332f21",
    "./src/surveyor.js?v=r603-4a30ef332f21",
    "./src/torn-pages.js?v=r603-4a30ef332f21",
    "./src/lattice-fields.js?v=r603-4a30ef332f21",
    "./src/dungeon-traps.js?v=r603-4a30ef332f21",
    "./src/listener-mirror.js?v=r603-4a30ef332f21",
    "./src/hometowns.js?v=r603-4a30ef332f21",
    "./src/listener-arena.js?v=r603-4a30ef332f21",
    "./src/listener-morph.js?v=r603-4a30ef332f21",
    "./src/build-presets.js?v=r603-4a30ef332f21",
    "./src/smithy.js?v=r603-4a30ef332f21",
    "./src/ilse.js?v=r603-4a30ef332f21",
    "./src/bells.js?v=r603-4a30ef332f21",
    "./src/meals.js?v=r603-4a30ef332f21",
    "./src/margins.js?v=r603-4a30ef332f21",
    "./src/marginalia.js?v=r603-4a30ef332f21",
    "./src/tyrant-hunt.js?v=r603-4a30ef332f21",
    "./src/world-beasts.js?v=r603-4a30ef332f21",
    "./src/elders.js?v=r603-4a30ef332f21",
    "./src/far-array.js?v=r603-4a30ef332f21",
    "./src/combat-visuals.js?v=r603-4a30ef332f21",
    "./src/dungeon-framework.js?v=r603-4a30ef332f21",
    "./src/elites.js?v=r603-4a30ef332f21",
    "./src/random.js?v=r603-4a30ef332f21",
    "./src/types.js?v=r603-4a30ef332f21",
    "./src/story.js?v=r603-4a30ef332f21",
    "./src/foundry.js?v=r603-4a30ef332f21",
    "./src/world.js?v=r603-4a30ef332f21",
    "./src/deep-dungeons.js?v=r603-4a30ef332f21",
    "./src/scenes.js?v=r603-4a30ef332f21",
    "./src/arenas.js?v=r603-4a30ef332f21",
    "./src/items.js?v=r603-4a30ef332f21",
    "./src/combat.js?v=r603-4a30ef332f21",
    "./src/interactions.js?v=r603-4a30ef332f21",
    "./src/persistence.js?v=r603-4a30ef332f21",
    "./src/input.js?v=r603-4a30ef332f21",
    "./src/game.js?v=r603-4a30ef332f21",
    "./src/renderer.js?v=r603-4a30ef332f21",
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
