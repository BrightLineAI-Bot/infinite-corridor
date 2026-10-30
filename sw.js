const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v589`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=589",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=589",
    "./src/proving-ground.js?v=589",
    "./src/proving-ground-fixtures.js?v=589",
    "./src/proving-ground-labs.js?v=589",
    "./src/dungeon-variation.js?v=589",
    "./src/dungeon-completion.js?v=589",
    "./src/enemy-patterns.js?v=589",
    "./src/monster-pack.js?v=589",
    "./src/monster-render.js?v=589",
    "./src/astral-worm.js?v=589",
    "./src/astral-worm-render.js?v=589",
    "./src/astral-worm-retreat.js?v=589",
    "./src/astral-worm-mount.js?v=589",
    "./src/lightning-giant-render.js?v=589",
    "./src/astral-encounters.js?v=589",
    "./src/astral-world-retreat.js?v=589",
    "./src/landscape.js?v=589",
    "./src/landscape-render.js?v=589",
    "./src/underlands.js?v=589",
    "./src/pattern-dungeons.js?v=589",
    "./src/relay-network.js?v=589",
    "./src/glyphs.js?v=589",
    "./src/echoes.js?v=589",
    "./src/constellation.js?v=589",
    "./src/water-traversal.js?v=589",
    "./src/open-sea.js?v=589",
    "./src/boats.js?v=589",
    "./src/sea-creatures.js?v=589",
    "./src/diving.js?v=589",
    "./src/grottoes.js?v=589",
    "./src/spell-slots.js?v=589",
    "./src/settlements.js?v=589",
    "./src/skirmishes.js?v=589",
    "./src/travelers.js?v=589",
    "./src/diagnostic-probe.js?v=589",
    "./src/questing-beast.js?v=589",
    "./src/recitations.js?v=589",
    "./src/lore.js?v=589",
    "./src/glimpses.js?v=589",
    "./src/glimpse-render.js?v=589",
    "./src/glimpse-paint.js?v=589",
    "./src/glimpse-scenes.js?v=589",
    "./src/glimpse-horror.js?v=589",
    "./src/glimpse-legend.js?v=589",
    "./src/glimpse-hand.js?v=589",
    "./src/atlas-view.js?v=589",
    "./src/strange.js?v=589",
    "./src/linked-dungeons.js?v=589",
    "./src/digging.js?v=589",
    "./src/building.js?v=589",
    "./src/refuge-lands.js?v=589",
    "./src/revenant-horde.js?v=589",
    "./src/stages.js?v=589",
    "./src/watcher.js?v=589",
    "./src/vehicle-gates.js?v=589",
    "./src/dungeon-ladder.js?v=589",
    "./src/potions.js?v=589",
    "./src/transit-lattice.js?v=589",
    "./src/late-spells.js?v=589",
    "./src/brawler-spells.js?v=589",
    "./src/orbit-volley.js?v=589",
    "./src/tool-forms.js?v=589",
    "./src/sling.js?v=589",
    "./src/atlas-colors.js?v=589",
    "./src/skylands.js?v=589",
    "./src/surveyor.js?v=589",
    "./src/lattice-fields.js?v=589",
    "./src/dungeon-traps.js?v=589",
    "./src/listener-mirror.js?v=589",
    "./src/hometowns.js?v=589",
    "./src/listener-arena.js?v=589",
    "./src/listener-morph.js?v=589",
    "./src/build-presets.js?v=589",
    "./src/smithy.js?v=589",
    "./src/ilse.js?v=589",
    "./src/bells.js?v=589",
    "./src/meals.js?v=589",
    "./src/margins.js?v=589",
    "./src/marginalia.js?v=589",
    "./src/tyrant-hunt.js?v=589",
    "./src/world-beasts.js?v=589",
    "./src/elders.js?v=589",
    "./src/far-array.js?v=589",
    "./src/combat-visuals.js?v=589",
    "./src/dungeon-framework.js?v=589",
    "./src/elites.js?v=589",
    "./src/random.js?v=589",
    "./src/types.js?v=589",
    "./src/story.js?v=589",
    "./src/foundry.js?v=589",
    "./src/world.js?v=589",
    "./src/deep-dungeons.js?v=589",
    "./src/scenes.js?v=589",
    "./src/arenas.js?v=589",
    "./src/items.js?v=589",
    "./src/combat.js?v=589",
    "./src/interactions.js?v=589",
    "./src/persistence.js?v=589",
    "./src/input.js?v=589",
    "./src/game.js?v=589",
    "./src/renderer.js?v=589",
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
