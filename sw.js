const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v613`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=613",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=613",
    "./src/proving-ground.js?v=613",
    "./src/proving-ground-fixtures.js?v=613",
    "./src/proving-ground-labs.js?v=613",
    "./src/dungeon-variation.js?v=613",
    "./src/dungeon-completion.js?v=613",
    "./src/enemy-patterns.js?v=613",
    "./src/monster-pack.js?v=613",
    "./src/monster-render.js?v=613",
    "./src/astral-worm.js?v=613",
    "./src/astral-worm-render.js?v=613",
    "./src/astral-worm-retreat.js?v=613",
    "./src/astral-worm-mount.js?v=613",
    "./src/lightning-giant-render.js?v=613",
    "./src/astral-encounters.js?v=613",
    "./src/astral-world-retreat.js?v=613",
    "./src/landscape.js?v=613",
    "./src/landscape-render.js?v=613",
    "./src/underlands.js?v=613",
    "./src/pattern-dungeons.js?v=613",
    "./src/relay-network.js?v=613",
    "./src/glyphs.js?v=613",
    "./src/echoes.js?v=613",
    "./src/constellation.js?v=613",
    "./src/water-traversal.js?v=613",
    "./src/open-sea.js?v=613",
    "./src/boats.js?v=613",
    "./src/sea-creatures.js?v=613",
    "./src/diving.js?v=613",
    "./src/grottoes.js?v=613",
    "./src/spell-slots.js?v=613",
    "./src/settlements.js?v=613",
    "./src/skirmishes.js?v=613",
    "./src/travelers.js?v=613",
    "./src/diagnostic-probe.js?v=613",
    "./src/questing-beast.js?v=613",
    "./src/recitations.js?v=613",
    "./src/lore.js?v=613",
    "./src/glimpses.js?v=613",
    "./src/glimpse-render.js?v=613",
    "./src/glimpse-paint.js?v=613",
    "./src/glimpse-scenes.js?v=613",
    "./src/glimpse-horror.js?v=613",
    "./src/glimpse-legend.js?v=613",
    "./src/glimpse-hand.js?v=613",
    "./src/atlas-view.js?v=613",
    "./src/strange.js?v=613",
    "./src/linked-dungeons.js?v=613",
    "./src/digging.js?v=613",
    "./src/building.js?v=613",
    "./src/refuge-lands.js?v=613",
    "./src/revenant-horde.js?v=613",
    "./src/stages.js?v=613",
    "./src/watcher.js?v=613",
    "./src/vehicle-gates.js?v=613",
    "./src/dungeon-ladder.js?v=613",
    "./src/potions.js?v=613",
    "./src/transit-lattice.js?v=613",
    "./src/late-spells.js?v=613",
    "./src/brawler-spells.js?v=613",
    "./src/orbit-volley.js?v=613",
    "./src/tool-forms.js?v=613",
    "./src/sling.js?v=613",
    "./src/atlas-colors.js?v=613",
    "./src/skylands.js?v=613",
    "./src/surveyor.js?v=613",
    "./src/torn-pages.js?v=613",
    "./src/lattice-fields.js?v=613",
    "./src/dungeon-traps.js?v=613",
    "./src/listener-mirror.js?v=613",
    "./src/hometowns.js?v=613",
    "./src/listener-arena.js?v=613",
    "./src/listener-morph.js?v=613",
    "./src/build-presets.js?v=613",
    "./src/smithy.js?v=613",
    "./src/ilse.js?v=613",
    "./src/bells.js?v=613",
    "./src/meals.js?v=613",
    "./src/margins.js?v=613",
    "./src/marginalia.js?v=613",
    "./src/tyrant-hunt.js?v=613",
    "./src/world-beasts.js?v=613",
    "./src/elders.js?v=613",
    "./src/far-array.js?v=613",
    "./src/combat-visuals.js?v=613",
    "./src/dungeon-framework.js?v=613",
    "./src/elites.js?v=613",
    "./src/random.js?v=613",
    "./src/types.js?v=613",
    "./src/story.js?v=613",
    "./src/foundry.js?v=613",
    "./src/world.js?v=613",
    "./src/deep-dungeons.js?v=613",
    "./src/scenes.js?v=613",
    "./src/arenas.js?v=613",
    "./src/items.js?v=613",
    "./src/combat.js?v=613",
    "./src/interactions.js?v=613",
    "./src/persistence.js?v=613",
    "./src/input.js?v=613",
    "./src/game.js?v=613",
    "./src/renderer.js?v=613",
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
