const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v563`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=563",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=563",
    "./src/proving-ground.js?v=563",
    "./src/proving-ground-fixtures.js?v=563",
    "./src/proving-ground-labs.js?v=563",
    "./src/dungeon-variation.js?v=563",
    "./src/dungeon-completion.js?v=563",
    "./src/enemy-patterns.js?v=563",
    "./src/monster-pack.js?v=563",
    "./src/monster-render.js?v=563",
    "./src/astral-worm.js?v=563",
    "./src/astral-worm-render.js?v=563",
    "./src/astral-worm-retreat.js?v=563",
    "./src/astral-worm-mount.js?v=563",
    "./src/lightning-giant-render.js?v=563",
    "./src/astral-encounters.js?v=563",
    "./src/astral-world-retreat.js?v=563",
    "./src/landscape.js?v=563",
    "./src/landscape-render.js?v=563",
    "./src/underlands.js?v=563",
    "./src/pattern-dungeons.js?v=563",
    "./src/relay-network.js?v=563",
    "./src/glyphs.js?v=563",
    "./src/echoes.js?v=563",
    "./src/constellation.js?v=563",
    "./src/water-traversal.js?v=563",
    "./src/open-sea.js?v=563",
    "./src/boats.js?v=563",
    "./src/sea-creatures.js?v=563",
    "./src/diving.js?v=563",
    "./src/grottoes.js?v=563",
    "./src/spell-slots.js?v=563",
    "./src/settlements.js?v=563",
    "./src/skirmishes.js?v=563",
    "./src/travelers.js?v=563",
    "./src/diagnostic-probe.js?v=563",
    "./src/questing-beast.js?v=563",
    "./src/recitations.js?v=563",
    "./src/lore.js?v=563",
    "./src/glimpses.js?v=563",
    "./src/glimpse-render.js?v=563",
    "./src/glimpse-paint.js?v=563",
    "./src/glimpse-scenes.js?v=563",
    "./src/glimpse-horror.js?v=563",
    "./src/glimpse-legend.js?v=563",
    "./src/glimpse-hand.js?v=563",
    "./src/atlas-view.js?v=563",
    "./src/strange.js?v=563",
    "./src/linked-dungeons.js?v=563",
    "./src/digging.js?v=563",
    "./src/building.js?v=563",
    "./src/refuge-lands.js?v=563",
    "./src/revenant-horde.js?v=563",
    "./src/stages.js?v=563",
    "./src/watcher.js?v=563",
    "./src/vehicle-gates.js?v=563",
    "./src/dungeon-ladder.js?v=563",
    "./src/potions.js?v=563",
    "./src/transit-lattice.js?v=563",
    "./src/late-spells.js?v=563",
    "./src/brawler-spells.js?v=563",
    "./src/orbit-volley.js?v=563",
    "./src/tool-forms.js?v=563",
    "./src/sling.js?v=563",
    "./src/atlas-colors.js?v=563",
    "./src/surveyor.js?v=563",
    "./src/lattice-fields.js?v=563",
    "./src/dungeon-traps.js?v=563",
    "./src/listener-mirror.js?v=563",
    "./src/hometowns.js?v=563",
    "./src/listener-arena.js?v=563",
    "./src/listener-morph.js?v=563",
    "./src/build-presets.js?v=563",
    "./src/smithy.js?v=563",
    "./src/ilse.js?v=563",
    "./src/bells.js?v=563",
    "./src/meals.js?v=563",
    "./src/margins.js?v=563",
    "./src/marginalia.js?v=563",
    "./src/tyrant-hunt.js?v=563",
    "./src/world-beasts.js?v=563",
    "./src/elders.js?v=563",
    "./src/far-array.js?v=563",
    "./src/combat-visuals.js?v=563",
    "./src/dungeon-framework.js?v=563",
    "./src/elites.js?v=563",
    "./src/random.js?v=563",
    "./src/types.js?v=563",
    "./src/story.js?v=563",
    "./src/foundry.js?v=563",
    "./src/world.js?v=563",
    "./src/deep-dungeons.js?v=563",
    "./src/scenes.js?v=563",
    "./src/arenas.js?v=563",
    "./src/items.js?v=563",
    "./src/combat.js?v=563",
    "./src/interactions.js?v=563",
    "./src/persistence.js?v=563",
    "./src/input.js?v=563",
    "./src/game.js?v=563",
    "./src/renderer.js?v=563",
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
