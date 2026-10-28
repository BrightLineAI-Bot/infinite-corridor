const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v537`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=537",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=537",
    "./src/proving-ground.js?v=537",
    "./src/proving-ground-fixtures.js?v=537",
    "./src/proving-ground-labs.js?v=537",
    "./src/dungeon-variation.js?v=537",
    "./src/dungeon-completion.js?v=537",
    "./src/enemy-patterns.js?v=537",
    "./src/monster-pack.js?v=537",
    "./src/monster-render.js?v=537",
    "./src/astral-worm.js?v=537",
    "./src/astral-worm-render.js?v=537",
    "./src/astral-worm-retreat.js?v=537",
    "./src/astral-worm-mount.js?v=537",
    "./src/lightning-giant-render.js?v=537",
    "./src/astral-encounters.js?v=537",
    "./src/astral-world-retreat.js?v=537",
    "./src/landscape.js?v=537",
    "./src/landscape-render.js?v=537",
    "./src/underlands.js?v=537",
    "./src/pattern-dungeons.js?v=537",
    "./src/relay-network.js?v=537",
    "./src/glyphs.js?v=537",
    "./src/echoes.js?v=537",
    "./src/constellation.js?v=537",
    "./src/water-traversal.js?v=537",
    "./src/open-sea.js?v=537",
    "./src/boats.js?v=537",
    "./src/sea-creatures.js?v=537",
    "./src/diving.js?v=537",
    "./src/grottoes.js?v=537",
    "./src/spell-slots.js?v=537",
    "./src/settlements.js?v=537",
    "./src/skirmishes.js?v=537",
    "./src/travelers.js?v=537",
    "./src/diagnostic-probe.js?v=537",
    "./src/questing-beast.js?v=537",
    "./src/recitations.js?v=537",
    "./src/lore.js?v=537",
    "./src/glimpses.js?v=537",
    "./src/glimpse-render.js?v=537",
    "./src/glimpse-paint.js?v=537",
    "./src/glimpse-scenes.js?v=537",
    "./src/glimpse-horror.js?v=537",
    "./src/glimpse-legend.js?v=537",
    "./src/glimpse-hand.js?v=537",
    "./src/atlas-view.js?v=537",
    "./src/strange.js?v=537",
    "./src/linked-dungeons.js?v=537",
    "./src/digging.js?v=537",
    "./src/building.js?v=537",
    "./src/refuge-lands.js?v=537",
    "./src/revenant-horde.js?v=537",
    "./src/stages.js?v=537",
    "./src/watcher.js?v=537",
    "./src/vehicle-gates.js?v=537",
    "./src/dungeon-ladder.js?v=537",
    "./src/potions.js?v=537",
    "./src/transit-lattice.js?v=537",
    "./src/late-spells.js?v=537",
    "./src/brawler-spells.js?v=537",
    "./src/orbit-volley.js?v=537",
    "./src/tool-forms.js?v=537",
    "./src/surveyor.js?v=537",
    "./src/lattice-fields.js?v=537",
    "./src/dungeon-traps.js?v=537",
    "./src/listener-mirror.js?v=537",
    "./src/hometowns.js?v=537",
    "./src/listener-arena.js?v=537",
    "./src/listener-morph.js?v=537",
    "./src/build-presets.js?v=537",
    "./src/smithy.js?v=537",
    "./src/ilse.js?v=537",
    "./src/bells.js?v=537",
    "./src/meals.js?v=537",
    "./src/margins.js?v=537",
    "./src/marginalia.js?v=537",
    "./src/tyrant-hunt.js?v=537",
    "./src/world-beasts.js?v=537",
    "./src/elders.js?v=537",
    "./src/far-array.js?v=537",
    "./src/combat-visuals.js?v=537",
    "./src/dungeon-framework.js?v=537",
    "./src/elites.js?v=537",
    "./src/random.js?v=537",
    "./src/types.js?v=537",
    "./src/story.js?v=537",
    "./src/foundry.js?v=537",
    "./src/world.js?v=537",
    "./src/deep-dungeons.js?v=537",
    "./src/scenes.js?v=537",
    "./src/arenas.js?v=537",
    "./src/items.js?v=537",
    "./src/combat.js?v=537",
    "./src/interactions.js?v=537",
    "./src/persistence.js?v=537",
    "./src/input.js?v=537",
    "./src/game.js?v=537",
    "./src/renderer.js?v=537",
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
