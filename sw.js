const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v609`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=609",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=609",
    "./src/proving-ground.js?v=609",
    "./src/proving-ground-fixtures.js?v=609",
    "./src/proving-ground-labs.js?v=609",
    "./src/dungeon-variation.js?v=609",
    "./src/dungeon-completion.js?v=609",
    "./src/enemy-patterns.js?v=609",
    "./src/monster-pack.js?v=609",
    "./src/monster-render.js?v=609",
    "./src/astral-worm.js?v=609",
    "./src/astral-worm-render.js?v=609",
    "./src/astral-worm-retreat.js?v=609",
    "./src/astral-worm-mount.js?v=609",
    "./src/lightning-giant-render.js?v=609",
    "./src/astral-encounters.js?v=609",
    "./src/astral-world-retreat.js?v=609",
    "./src/landscape.js?v=609",
    "./src/landscape-render.js?v=609",
    "./src/underlands.js?v=609",
    "./src/pattern-dungeons.js?v=609",
    "./src/relay-network.js?v=609",
    "./src/glyphs.js?v=609",
    "./src/echoes.js?v=609",
    "./src/constellation.js?v=609",
    "./src/water-traversal.js?v=609",
    "./src/open-sea.js?v=609",
    "./src/boats.js?v=609",
    "./src/sea-creatures.js?v=609",
    "./src/diving.js?v=609",
    "./src/grottoes.js?v=609",
    "./src/spell-slots.js?v=609",
    "./src/settlements.js?v=609",
    "./src/skirmishes.js?v=609",
    "./src/travelers.js?v=609",
    "./src/diagnostic-probe.js?v=609",
    "./src/questing-beast.js?v=609",
    "./src/recitations.js?v=609",
    "./src/lore.js?v=609",
    "./src/glimpses.js?v=609",
    "./src/glimpse-render.js?v=609",
    "./src/glimpse-paint.js?v=609",
    "./src/glimpse-scenes.js?v=609",
    "./src/glimpse-horror.js?v=609",
    "./src/glimpse-legend.js?v=609",
    "./src/glimpse-hand.js?v=609",
    "./src/atlas-view.js?v=609",
    "./src/strange.js?v=609",
    "./src/linked-dungeons.js?v=609",
    "./src/digging.js?v=609",
    "./src/building.js?v=609",
    "./src/refuge-lands.js?v=609",
    "./src/revenant-horde.js?v=609",
    "./src/stages.js?v=609",
    "./src/watcher.js?v=609",
    "./src/vehicle-gates.js?v=609",
    "./src/dungeon-ladder.js?v=609",
    "./src/potions.js?v=609",
    "./src/transit-lattice.js?v=609",
    "./src/late-spells.js?v=609",
    "./src/brawler-spells.js?v=609",
    "./src/orbit-volley.js?v=609",
    "./src/tool-forms.js?v=609",
    "./src/sling.js?v=609",
    "./src/atlas-colors.js?v=609",
    "./src/skylands.js?v=609",
    "./src/surveyor.js?v=609",
    "./src/torn-pages.js?v=609",
    "./src/lattice-fields.js?v=609",
    "./src/dungeon-traps.js?v=609",
    "./src/listener-mirror.js?v=609",
    "./src/hometowns.js?v=609",
    "./src/listener-arena.js?v=609",
    "./src/listener-morph.js?v=609",
    "./src/build-presets.js?v=609",
    "./src/smithy.js?v=609",
    "./src/ilse.js?v=609",
    "./src/bells.js?v=609",
    "./src/meals.js?v=609",
    "./src/margins.js?v=609",
    "./src/marginalia.js?v=609",
    "./src/tyrant-hunt.js?v=609",
    "./src/world-beasts.js?v=609",
    "./src/elders.js?v=609",
    "./src/far-array.js?v=609",
    "./src/combat-visuals.js?v=609",
    "./src/dungeon-framework.js?v=609",
    "./src/elites.js?v=609",
    "./src/random.js?v=609",
    "./src/types.js?v=609",
    "./src/story.js?v=609",
    "./src/foundry.js?v=609",
    "./src/world.js?v=609",
    "./src/deep-dungeons.js?v=609",
    "./src/scenes.js?v=609",
    "./src/arenas.js?v=609",
    "./src/items.js?v=609",
    "./src/combat.js?v=609",
    "./src/interactions.js?v=609",
    "./src/persistence.js?v=609",
    "./src/input.js?v=609",
    "./src/game.js?v=609",
    "./src/renderer.js?v=609",
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
