const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v587`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=587",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=587",
    "./src/proving-ground.js?v=587",
    "./src/proving-ground-fixtures.js?v=587",
    "./src/proving-ground-labs.js?v=587",
    "./src/dungeon-variation.js?v=587",
    "./src/dungeon-completion.js?v=587",
    "./src/enemy-patterns.js?v=587",
    "./src/monster-pack.js?v=587",
    "./src/monster-render.js?v=587",
    "./src/astral-worm.js?v=587",
    "./src/astral-worm-render.js?v=587",
    "./src/astral-worm-retreat.js?v=587",
    "./src/astral-worm-mount.js?v=587",
    "./src/lightning-giant-render.js?v=587",
    "./src/astral-encounters.js?v=587",
    "./src/astral-world-retreat.js?v=587",
    "./src/landscape.js?v=587",
    "./src/landscape-render.js?v=587",
    "./src/underlands.js?v=587",
    "./src/pattern-dungeons.js?v=587",
    "./src/relay-network.js?v=587",
    "./src/glyphs.js?v=587",
    "./src/echoes.js?v=587",
    "./src/constellation.js?v=587",
    "./src/water-traversal.js?v=587",
    "./src/open-sea.js?v=587",
    "./src/boats.js?v=587",
    "./src/sea-creatures.js?v=587",
    "./src/diving.js?v=587",
    "./src/grottoes.js?v=587",
    "./src/spell-slots.js?v=587",
    "./src/settlements.js?v=587",
    "./src/skirmishes.js?v=587",
    "./src/travelers.js?v=587",
    "./src/diagnostic-probe.js?v=587",
    "./src/questing-beast.js?v=587",
    "./src/recitations.js?v=587",
    "./src/lore.js?v=587",
    "./src/glimpses.js?v=587",
    "./src/glimpse-render.js?v=587",
    "./src/glimpse-paint.js?v=587",
    "./src/glimpse-scenes.js?v=587",
    "./src/glimpse-horror.js?v=587",
    "./src/glimpse-legend.js?v=587",
    "./src/glimpse-hand.js?v=587",
    "./src/atlas-view.js?v=587",
    "./src/strange.js?v=587",
    "./src/linked-dungeons.js?v=587",
    "./src/digging.js?v=587",
    "./src/building.js?v=587",
    "./src/refuge-lands.js?v=587",
    "./src/revenant-horde.js?v=587",
    "./src/stages.js?v=587",
    "./src/watcher.js?v=587",
    "./src/vehicle-gates.js?v=587",
    "./src/dungeon-ladder.js?v=587",
    "./src/potions.js?v=587",
    "./src/transit-lattice.js?v=587",
    "./src/late-spells.js?v=587",
    "./src/brawler-spells.js?v=587",
    "./src/orbit-volley.js?v=587",
    "./src/tool-forms.js?v=587",
    "./src/sling.js?v=587",
    "./src/atlas-colors.js?v=587",
    "./src/skylands.js?v=587",
    "./src/surveyor.js?v=587",
    "./src/lattice-fields.js?v=587",
    "./src/dungeon-traps.js?v=587",
    "./src/listener-mirror.js?v=587",
    "./src/hometowns.js?v=587",
    "./src/listener-arena.js?v=587",
    "./src/listener-morph.js?v=587",
    "./src/build-presets.js?v=587",
    "./src/smithy.js?v=587",
    "./src/ilse.js?v=587",
    "./src/bells.js?v=587",
    "./src/meals.js?v=587",
    "./src/margins.js?v=587",
    "./src/marginalia.js?v=587",
    "./src/tyrant-hunt.js?v=587",
    "./src/world-beasts.js?v=587",
    "./src/elders.js?v=587",
    "./src/far-array.js?v=587",
    "./src/combat-visuals.js?v=587",
    "./src/dungeon-framework.js?v=587",
    "./src/elites.js?v=587",
    "./src/random.js?v=587",
    "./src/types.js?v=587",
    "./src/story.js?v=587",
    "./src/foundry.js?v=587",
    "./src/world.js?v=587",
    "./src/deep-dungeons.js?v=587",
    "./src/scenes.js?v=587",
    "./src/arenas.js?v=587",
    "./src/items.js?v=587",
    "./src/combat.js?v=587",
    "./src/interactions.js?v=587",
    "./src/persistence.js?v=587",
    "./src/input.js?v=587",
    "./src/game.js?v=587",
    "./src/renderer.js?v=587",
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
