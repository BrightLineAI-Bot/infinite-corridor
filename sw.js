const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v539`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=539",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=539",
    "./src/proving-ground.js?v=539",
    "./src/proving-ground-fixtures.js?v=539",
    "./src/proving-ground-labs.js?v=539",
    "./src/dungeon-variation.js?v=539",
    "./src/dungeon-completion.js?v=539",
    "./src/enemy-patterns.js?v=539",
    "./src/monster-pack.js?v=539",
    "./src/monster-render.js?v=539",
    "./src/astral-worm.js?v=539",
    "./src/astral-worm-render.js?v=539",
    "./src/astral-worm-retreat.js?v=539",
    "./src/astral-worm-mount.js?v=539",
    "./src/lightning-giant-render.js?v=539",
    "./src/astral-encounters.js?v=539",
    "./src/astral-world-retreat.js?v=539",
    "./src/landscape.js?v=539",
    "./src/landscape-render.js?v=539",
    "./src/underlands.js?v=539",
    "./src/pattern-dungeons.js?v=539",
    "./src/relay-network.js?v=539",
    "./src/glyphs.js?v=539",
    "./src/echoes.js?v=539",
    "./src/constellation.js?v=539",
    "./src/water-traversal.js?v=539",
    "./src/open-sea.js?v=539",
    "./src/boats.js?v=539",
    "./src/sea-creatures.js?v=539",
    "./src/diving.js?v=539",
    "./src/grottoes.js?v=539",
    "./src/spell-slots.js?v=539",
    "./src/settlements.js?v=539",
    "./src/skirmishes.js?v=539",
    "./src/travelers.js?v=539",
    "./src/diagnostic-probe.js?v=539",
    "./src/questing-beast.js?v=539",
    "./src/recitations.js?v=539",
    "./src/lore.js?v=539",
    "./src/glimpses.js?v=539",
    "./src/glimpse-render.js?v=539",
    "./src/glimpse-paint.js?v=539",
    "./src/glimpse-scenes.js?v=539",
    "./src/glimpse-horror.js?v=539",
    "./src/glimpse-legend.js?v=539",
    "./src/glimpse-hand.js?v=539",
    "./src/atlas-view.js?v=539",
    "./src/strange.js?v=539",
    "./src/linked-dungeons.js?v=539",
    "./src/digging.js?v=539",
    "./src/building.js?v=539",
    "./src/refuge-lands.js?v=539",
    "./src/revenant-horde.js?v=539",
    "./src/stages.js?v=539",
    "./src/watcher.js?v=539",
    "./src/vehicle-gates.js?v=539",
    "./src/dungeon-ladder.js?v=539",
    "./src/potions.js?v=539",
    "./src/transit-lattice.js?v=539",
    "./src/late-spells.js?v=539",
    "./src/brawler-spells.js?v=539",
    "./src/orbit-volley.js?v=539",
    "./src/tool-forms.js?v=539",
    "./src/surveyor.js?v=539",
    "./src/lattice-fields.js?v=539",
    "./src/dungeon-traps.js?v=539",
    "./src/listener-mirror.js?v=539",
    "./src/hometowns.js?v=539",
    "./src/listener-arena.js?v=539",
    "./src/listener-morph.js?v=539",
    "./src/build-presets.js?v=539",
    "./src/smithy.js?v=539",
    "./src/ilse.js?v=539",
    "./src/bells.js?v=539",
    "./src/meals.js?v=539",
    "./src/margins.js?v=539",
    "./src/marginalia.js?v=539",
    "./src/tyrant-hunt.js?v=539",
    "./src/world-beasts.js?v=539",
    "./src/elders.js?v=539",
    "./src/far-array.js?v=539",
    "./src/combat-visuals.js?v=539",
    "./src/dungeon-framework.js?v=539",
    "./src/elites.js?v=539",
    "./src/random.js?v=539",
    "./src/types.js?v=539",
    "./src/story.js?v=539",
    "./src/foundry.js?v=539",
    "./src/world.js?v=539",
    "./src/deep-dungeons.js?v=539",
    "./src/scenes.js?v=539",
    "./src/arenas.js?v=539",
    "./src/items.js?v=539",
    "./src/combat.js?v=539",
    "./src/interactions.js?v=539",
    "./src/persistence.js?v=539",
    "./src/input.js?v=539",
    "./src/game.js?v=539",
    "./src/renderer.js?v=539",
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
