const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v559`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=559",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=559",
    "./src/proving-ground.js?v=559",
    "./src/proving-ground-fixtures.js?v=559",
    "./src/proving-ground-labs.js?v=559",
    "./src/dungeon-variation.js?v=559",
    "./src/dungeon-completion.js?v=559",
    "./src/enemy-patterns.js?v=559",
    "./src/monster-pack.js?v=559",
    "./src/monster-render.js?v=559",
    "./src/astral-worm.js?v=559",
    "./src/astral-worm-render.js?v=559",
    "./src/astral-worm-retreat.js?v=559",
    "./src/astral-worm-mount.js?v=559",
    "./src/lightning-giant-render.js?v=559",
    "./src/astral-encounters.js?v=559",
    "./src/astral-world-retreat.js?v=559",
    "./src/landscape.js?v=559",
    "./src/landscape-render.js?v=559",
    "./src/underlands.js?v=559",
    "./src/pattern-dungeons.js?v=559",
    "./src/relay-network.js?v=559",
    "./src/glyphs.js?v=559",
    "./src/echoes.js?v=559",
    "./src/constellation.js?v=559",
    "./src/water-traversal.js?v=559",
    "./src/open-sea.js?v=559",
    "./src/boats.js?v=559",
    "./src/sea-creatures.js?v=559",
    "./src/diving.js?v=559",
    "./src/grottoes.js?v=559",
    "./src/spell-slots.js?v=559",
    "./src/settlements.js?v=559",
    "./src/skirmishes.js?v=559",
    "./src/travelers.js?v=559",
    "./src/diagnostic-probe.js?v=559",
    "./src/questing-beast.js?v=559",
    "./src/recitations.js?v=559",
    "./src/lore.js?v=559",
    "./src/glimpses.js?v=559",
    "./src/glimpse-render.js?v=559",
    "./src/glimpse-paint.js?v=559",
    "./src/glimpse-scenes.js?v=559",
    "./src/glimpse-horror.js?v=559",
    "./src/glimpse-legend.js?v=559",
    "./src/glimpse-hand.js?v=559",
    "./src/atlas-view.js?v=559",
    "./src/strange.js?v=559",
    "./src/linked-dungeons.js?v=559",
    "./src/digging.js?v=559",
    "./src/building.js?v=559",
    "./src/refuge-lands.js?v=559",
    "./src/revenant-horde.js?v=559",
    "./src/stages.js?v=559",
    "./src/watcher.js?v=559",
    "./src/vehicle-gates.js?v=559",
    "./src/dungeon-ladder.js?v=559",
    "./src/potions.js?v=559",
    "./src/transit-lattice.js?v=559",
    "./src/late-spells.js?v=559",
    "./src/brawler-spells.js?v=559",
    "./src/orbit-volley.js?v=559",
    "./src/tool-forms.js?v=559",
    "./src/sling.js?v=559",
    "./src/atlas-colors.js?v=559",
    "./src/surveyor.js?v=559",
    "./src/lattice-fields.js?v=559",
    "./src/dungeon-traps.js?v=559",
    "./src/listener-mirror.js?v=559",
    "./src/hometowns.js?v=559",
    "./src/listener-arena.js?v=559",
    "./src/listener-morph.js?v=559",
    "./src/build-presets.js?v=559",
    "./src/smithy.js?v=559",
    "./src/ilse.js?v=559",
    "./src/bells.js?v=559",
    "./src/meals.js?v=559",
    "./src/margins.js?v=559",
    "./src/marginalia.js?v=559",
    "./src/tyrant-hunt.js?v=559",
    "./src/world-beasts.js?v=559",
    "./src/elders.js?v=559",
    "./src/far-array.js?v=559",
    "./src/combat-visuals.js?v=559",
    "./src/dungeon-framework.js?v=559",
    "./src/elites.js?v=559",
    "./src/random.js?v=559",
    "./src/types.js?v=559",
    "./src/story.js?v=559",
    "./src/foundry.js?v=559",
    "./src/world.js?v=559",
    "./src/deep-dungeons.js?v=559",
    "./src/scenes.js?v=559",
    "./src/arenas.js?v=559",
    "./src/items.js?v=559",
    "./src/combat.js?v=559",
    "./src/interactions.js?v=559",
    "./src/persistence.js?v=559",
    "./src/input.js?v=559",
    "./src/game.js?v=559",
    "./src/renderer.js?v=559",
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
