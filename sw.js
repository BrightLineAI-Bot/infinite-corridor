const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v605`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=605",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=605",
    "./src/proving-ground.js?v=605",
    "./src/proving-ground-fixtures.js?v=605",
    "./src/proving-ground-labs.js?v=605",
    "./src/dungeon-variation.js?v=605",
    "./src/dungeon-completion.js?v=605",
    "./src/enemy-patterns.js?v=605",
    "./src/monster-pack.js?v=605",
    "./src/monster-render.js?v=605",
    "./src/astral-worm.js?v=605",
    "./src/astral-worm-render.js?v=605",
    "./src/astral-worm-retreat.js?v=605",
    "./src/astral-worm-mount.js?v=605",
    "./src/lightning-giant-render.js?v=605",
    "./src/astral-encounters.js?v=605",
    "./src/astral-world-retreat.js?v=605",
    "./src/landscape.js?v=605",
    "./src/landscape-render.js?v=605",
    "./src/underlands.js?v=605",
    "./src/pattern-dungeons.js?v=605",
    "./src/relay-network.js?v=605",
    "./src/glyphs.js?v=605",
    "./src/echoes.js?v=605",
    "./src/constellation.js?v=605",
    "./src/water-traversal.js?v=605",
    "./src/open-sea.js?v=605",
    "./src/boats.js?v=605",
    "./src/sea-creatures.js?v=605",
    "./src/diving.js?v=605",
    "./src/grottoes.js?v=605",
    "./src/spell-slots.js?v=605",
    "./src/settlements.js?v=605",
    "./src/skirmishes.js?v=605",
    "./src/travelers.js?v=605",
    "./src/diagnostic-probe.js?v=605",
    "./src/questing-beast.js?v=605",
    "./src/recitations.js?v=605",
    "./src/lore.js?v=605",
    "./src/glimpses.js?v=605",
    "./src/glimpse-render.js?v=605",
    "./src/glimpse-paint.js?v=605",
    "./src/glimpse-scenes.js?v=605",
    "./src/glimpse-horror.js?v=605",
    "./src/glimpse-legend.js?v=605",
    "./src/glimpse-hand.js?v=605",
    "./src/atlas-view.js?v=605",
    "./src/strange.js?v=605",
    "./src/linked-dungeons.js?v=605",
    "./src/digging.js?v=605",
    "./src/building.js?v=605",
    "./src/refuge-lands.js?v=605",
    "./src/revenant-horde.js?v=605",
    "./src/stages.js?v=605",
    "./src/watcher.js?v=605",
    "./src/vehicle-gates.js?v=605",
    "./src/dungeon-ladder.js?v=605",
    "./src/potions.js?v=605",
    "./src/transit-lattice.js?v=605",
    "./src/late-spells.js?v=605",
    "./src/brawler-spells.js?v=605",
    "./src/orbit-volley.js?v=605",
    "./src/tool-forms.js?v=605",
    "./src/sling.js?v=605",
    "./src/atlas-colors.js?v=605",
    "./src/skylands.js?v=605",
    "./src/surveyor.js?v=605",
    "./src/torn-pages.js?v=605",
    "./src/lattice-fields.js?v=605",
    "./src/dungeon-traps.js?v=605",
    "./src/listener-mirror.js?v=605",
    "./src/hometowns.js?v=605",
    "./src/listener-arena.js?v=605",
    "./src/listener-morph.js?v=605",
    "./src/build-presets.js?v=605",
    "./src/smithy.js?v=605",
    "./src/ilse.js?v=605",
    "./src/bells.js?v=605",
    "./src/meals.js?v=605",
    "./src/margins.js?v=605",
    "./src/marginalia.js?v=605",
    "./src/tyrant-hunt.js?v=605",
    "./src/world-beasts.js?v=605",
    "./src/elders.js?v=605",
    "./src/far-array.js?v=605",
    "./src/combat-visuals.js?v=605",
    "./src/dungeon-framework.js?v=605",
    "./src/elites.js?v=605",
    "./src/random.js?v=605",
    "./src/types.js?v=605",
    "./src/story.js?v=605",
    "./src/foundry.js?v=605",
    "./src/world.js?v=605",
    "./src/deep-dungeons.js?v=605",
    "./src/scenes.js?v=605",
    "./src/arenas.js?v=605",
    "./src/items.js?v=605",
    "./src/combat.js?v=605",
    "./src/interactions.js?v=605",
    "./src/persistence.js?v=605",
    "./src/input.js?v=605",
    "./src/game.js?v=605",
    "./src/renderer.js?v=605",
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
