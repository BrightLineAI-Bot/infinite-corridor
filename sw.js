const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v581`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=581",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=581",
    "./src/proving-ground.js?v=581",
    "./src/proving-ground-fixtures.js?v=581",
    "./src/proving-ground-labs.js?v=581",
    "./src/dungeon-variation.js?v=581",
    "./src/dungeon-completion.js?v=581",
    "./src/enemy-patterns.js?v=581",
    "./src/monster-pack.js?v=581",
    "./src/monster-render.js?v=581",
    "./src/astral-worm.js?v=581",
    "./src/astral-worm-render.js?v=581",
    "./src/astral-worm-retreat.js?v=581",
    "./src/astral-worm-mount.js?v=581",
    "./src/lightning-giant-render.js?v=581",
    "./src/astral-encounters.js?v=581",
    "./src/astral-world-retreat.js?v=581",
    "./src/landscape.js?v=581",
    "./src/landscape-render.js?v=581",
    "./src/underlands.js?v=581",
    "./src/pattern-dungeons.js?v=581",
    "./src/relay-network.js?v=581",
    "./src/glyphs.js?v=581",
    "./src/echoes.js?v=581",
    "./src/constellation.js?v=581",
    "./src/water-traversal.js?v=581",
    "./src/open-sea.js?v=581",
    "./src/boats.js?v=581",
    "./src/sea-creatures.js?v=581",
    "./src/diving.js?v=581",
    "./src/grottoes.js?v=581",
    "./src/spell-slots.js?v=581",
    "./src/settlements.js?v=581",
    "./src/skirmishes.js?v=581",
    "./src/travelers.js?v=581",
    "./src/diagnostic-probe.js?v=581",
    "./src/questing-beast.js?v=581",
    "./src/recitations.js?v=581",
    "./src/lore.js?v=581",
    "./src/glimpses.js?v=581",
    "./src/glimpse-render.js?v=581",
    "./src/glimpse-paint.js?v=581",
    "./src/glimpse-scenes.js?v=581",
    "./src/glimpse-horror.js?v=581",
    "./src/glimpse-legend.js?v=581",
    "./src/glimpse-hand.js?v=581",
    "./src/atlas-view.js?v=581",
    "./src/strange.js?v=581",
    "./src/linked-dungeons.js?v=581",
    "./src/digging.js?v=581",
    "./src/building.js?v=581",
    "./src/refuge-lands.js?v=581",
    "./src/revenant-horde.js?v=581",
    "./src/stages.js?v=581",
    "./src/watcher.js?v=581",
    "./src/vehicle-gates.js?v=581",
    "./src/dungeon-ladder.js?v=581",
    "./src/potions.js?v=581",
    "./src/transit-lattice.js?v=581",
    "./src/late-spells.js?v=581",
    "./src/brawler-spells.js?v=581",
    "./src/orbit-volley.js?v=581",
    "./src/tool-forms.js?v=581",
    "./src/sling.js?v=581",
    "./src/atlas-colors.js?v=581",
    "./src/skylands.js?v=581",
    "./src/surveyor.js?v=581",
    "./src/lattice-fields.js?v=581",
    "./src/dungeon-traps.js?v=581",
    "./src/listener-mirror.js?v=581",
    "./src/hometowns.js?v=581",
    "./src/listener-arena.js?v=581",
    "./src/listener-morph.js?v=581",
    "./src/build-presets.js?v=581",
    "./src/smithy.js?v=581",
    "./src/ilse.js?v=581",
    "./src/bells.js?v=581",
    "./src/meals.js?v=581",
    "./src/margins.js?v=581",
    "./src/marginalia.js?v=581",
    "./src/tyrant-hunt.js?v=581",
    "./src/world-beasts.js?v=581",
    "./src/elders.js?v=581",
    "./src/far-array.js?v=581",
    "./src/combat-visuals.js?v=581",
    "./src/dungeon-framework.js?v=581",
    "./src/elites.js?v=581",
    "./src/random.js?v=581",
    "./src/types.js?v=581",
    "./src/story.js?v=581",
    "./src/foundry.js?v=581",
    "./src/world.js?v=581",
    "./src/deep-dungeons.js?v=581",
    "./src/scenes.js?v=581",
    "./src/arenas.js?v=581",
    "./src/items.js?v=581",
    "./src/combat.js?v=581",
    "./src/interactions.js?v=581",
    "./src/persistence.js?v=581",
    "./src/input.js?v=581",
    "./src/game.js?v=581",
    "./src/renderer.js?v=581",
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
