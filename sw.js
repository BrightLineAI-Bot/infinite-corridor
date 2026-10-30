const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v591`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=591",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=591",
    "./src/proving-ground.js?v=591",
    "./src/proving-ground-fixtures.js?v=591",
    "./src/proving-ground-labs.js?v=591",
    "./src/dungeon-variation.js?v=591",
    "./src/dungeon-completion.js?v=591",
    "./src/enemy-patterns.js?v=591",
    "./src/monster-pack.js?v=591",
    "./src/monster-render.js?v=591",
    "./src/astral-worm.js?v=591",
    "./src/astral-worm-render.js?v=591",
    "./src/astral-worm-retreat.js?v=591",
    "./src/astral-worm-mount.js?v=591",
    "./src/lightning-giant-render.js?v=591",
    "./src/astral-encounters.js?v=591",
    "./src/astral-world-retreat.js?v=591",
    "./src/landscape.js?v=591",
    "./src/landscape-render.js?v=591",
    "./src/underlands.js?v=591",
    "./src/pattern-dungeons.js?v=591",
    "./src/relay-network.js?v=591",
    "./src/glyphs.js?v=591",
    "./src/echoes.js?v=591",
    "./src/constellation.js?v=591",
    "./src/water-traversal.js?v=591",
    "./src/open-sea.js?v=591",
    "./src/boats.js?v=591",
    "./src/sea-creatures.js?v=591",
    "./src/diving.js?v=591",
    "./src/grottoes.js?v=591",
    "./src/spell-slots.js?v=591",
    "./src/settlements.js?v=591",
    "./src/skirmishes.js?v=591",
    "./src/travelers.js?v=591",
    "./src/diagnostic-probe.js?v=591",
    "./src/questing-beast.js?v=591",
    "./src/recitations.js?v=591",
    "./src/lore.js?v=591",
    "./src/glimpses.js?v=591",
    "./src/glimpse-render.js?v=591",
    "./src/glimpse-paint.js?v=591",
    "./src/glimpse-scenes.js?v=591",
    "./src/glimpse-horror.js?v=591",
    "./src/glimpse-legend.js?v=591",
    "./src/glimpse-hand.js?v=591",
    "./src/atlas-view.js?v=591",
    "./src/strange.js?v=591",
    "./src/linked-dungeons.js?v=591",
    "./src/digging.js?v=591",
    "./src/building.js?v=591",
    "./src/refuge-lands.js?v=591",
    "./src/revenant-horde.js?v=591",
    "./src/stages.js?v=591",
    "./src/watcher.js?v=591",
    "./src/vehicle-gates.js?v=591",
    "./src/dungeon-ladder.js?v=591",
    "./src/potions.js?v=591",
    "./src/transit-lattice.js?v=591",
    "./src/late-spells.js?v=591",
    "./src/brawler-spells.js?v=591",
    "./src/orbit-volley.js?v=591",
    "./src/tool-forms.js?v=591",
    "./src/sling.js?v=591",
    "./src/atlas-colors.js?v=591",
    "./src/skylands.js?v=591",
    "./src/surveyor.js?v=591",
    "./src/lattice-fields.js?v=591",
    "./src/dungeon-traps.js?v=591",
    "./src/listener-mirror.js?v=591",
    "./src/hometowns.js?v=591",
    "./src/listener-arena.js?v=591",
    "./src/listener-morph.js?v=591",
    "./src/build-presets.js?v=591",
    "./src/smithy.js?v=591",
    "./src/ilse.js?v=591",
    "./src/bells.js?v=591",
    "./src/meals.js?v=591",
    "./src/margins.js?v=591",
    "./src/marginalia.js?v=591",
    "./src/tyrant-hunt.js?v=591",
    "./src/world-beasts.js?v=591",
    "./src/elders.js?v=591",
    "./src/far-array.js?v=591",
    "./src/combat-visuals.js?v=591",
    "./src/dungeon-framework.js?v=591",
    "./src/elites.js?v=591",
    "./src/random.js?v=591",
    "./src/types.js?v=591",
    "./src/story.js?v=591",
    "./src/foundry.js?v=591",
    "./src/world.js?v=591",
    "./src/deep-dungeons.js?v=591",
    "./src/scenes.js?v=591",
    "./src/arenas.js?v=591",
    "./src/items.js?v=591",
    "./src/combat.js?v=591",
    "./src/interactions.js?v=591",
    "./src/persistence.js?v=591",
    "./src/input.js?v=591",
    "./src/game.js?v=591",
    "./src/renderer.js?v=591",
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
