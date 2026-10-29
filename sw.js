const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r577-1b61c41bd892`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r577-1b61c41bd892",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r577-1b61c41bd892",
    "./src/proving-ground.js?v=r577-1b61c41bd892",
    "./src/proving-ground-fixtures.js?v=r577-1b61c41bd892",
    "./src/proving-ground-labs.js?v=r577-1b61c41bd892",
    "./src/dungeon-variation.js?v=r577-1b61c41bd892",
    "./src/dungeon-completion.js?v=r577-1b61c41bd892",
    "./src/enemy-patterns.js?v=r577-1b61c41bd892",
    "./src/monster-pack.js?v=r577-1b61c41bd892",
    "./src/monster-render.js?v=r577-1b61c41bd892",
    "./src/astral-worm.js?v=r577-1b61c41bd892",
    "./src/astral-worm-render.js?v=r577-1b61c41bd892",
    "./src/astral-worm-retreat.js?v=r577-1b61c41bd892",
    "./src/astral-worm-mount.js?v=r577-1b61c41bd892",
    "./src/lightning-giant-render.js?v=r577-1b61c41bd892",
    "./src/astral-encounters.js?v=r577-1b61c41bd892",
    "./src/astral-world-retreat.js?v=r577-1b61c41bd892",
    "./src/landscape.js?v=r577-1b61c41bd892",
    "./src/landscape-render.js?v=r577-1b61c41bd892",
    "./src/underlands.js?v=r577-1b61c41bd892",
    "./src/pattern-dungeons.js?v=r577-1b61c41bd892",
    "./src/relay-network.js?v=r577-1b61c41bd892",
    "./src/glyphs.js?v=r577-1b61c41bd892",
    "./src/echoes.js?v=r577-1b61c41bd892",
    "./src/constellation.js?v=r577-1b61c41bd892",
    "./src/water-traversal.js?v=r577-1b61c41bd892",
    "./src/open-sea.js?v=r577-1b61c41bd892",
    "./src/boats.js?v=r577-1b61c41bd892",
    "./src/sea-creatures.js?v=r577-1b61c41bd892",
    "./src/diving.js?v=r577-1b61c41bd892",
    "./src/grottoes.js?v=r577-1b61c41bd892",
    "./src/spell-slots.js?v=r577-1b61c41bd892",
    "./src/settlements.js?v=r577-1b61c41bd892",
    "./src/skirmishes.js?v=r577-1b61c41bd892",
    "./src/travelers.js?v=r577-1b61c41bd892",
    "./src/diagnostic-probe.js?v=r577-1b61c41bd892",
    "./src/questing-beast.js?v=r577-1b61c41bd892",
    "./src/recitations.js?v=r577-1b61c41bd892",
    "./src/lore.js?v=r577-1b61c41bd892",
    "./src/glimpses.js?v=r577-1b61c41bd892",
    "./src/glimpse-render.js?v=r577-1b61c41bd892",
    "./src/glimpse-paint.js?v=r577-1b61c41bd892",
    "./src/glimpse-scenes.js?v=r577-1b61c41bd892",
    "./src/glimpse-horror.js?v=r577-1b61c41bd892",
    "./src/glimpse-legend.js?v=r577-1b61c41bd892",
    "./src/glimpse-hand.js?v=r577-1b61c41bd892",
    "./src/atlas-view.js?v=r577-1b61c41bd892",
    "./src/strange.js?v=r577-1b61c41bd892",
    "./src/linked-dungeons.js?v=r577-1b61c41bd892",
    "./src/digging.js?v=r577-1b61c41bd892",
    "./src/building.js?v=r577-1b61c41bd892",
    "./src/refuge-lands.js?v=r577-1b61c41bd892",
    "./src/revenant-horde.js?v=r577-1b61c41bd892",
    "./src/stages.js?v=r577-1b61c41bd892",
    "./src/watcher.js?v=r577-1b61c41bd892",
    "./src/vehicle-gates.js?v=r577-1b61c41bd892",
    "./src/dungeon-ladder.js?v=r577-1b61c41bd892",
    "./src/potions.js?v=r577-1b61c41bd892",
    "./src/transit-lattice.js?v=r577-1b61c41bd892",
    "./src/late-spells.js?v=r577-1b61c41bd892",
    "./src/brawler-spells.js?v=r577-1b61c41bd892",
    "./src/orbit-volley.js?v=r577-1b61c41bd892",
    "./src/tool-forms.js?v=r577-1b61c41bd892",
    "./src/sling.js?v=r577-1b61c41bd892",
    "./src/atlas-colors.js?v=r577-1b61c41bd892",
    "./src/skylands.js?v=r577-1b61c41bd892",
    "./src/surveyor.js?v=r577-1b61c41bd892",
    "./src/lattice-fields.js?v=r577-1b61c41bd892",
    "./src/dungeon-traps.js?v=r577-1b61c41bd892",
    "./src/listener-mirror.js?v=r577-1b61c41bd892",
    "./src/hometowns.js?v=r577-1b61c41bd892",
    "./src/listener-arena.js?v=r577-1b61c41bd892",
    "./src/listener-morph.js?v=r577-1b61c41bd892",
    "./src/build-presets.js?v=r577-1b61c41bd892",
    "./src/smithy.js?v=r577-1b61c41bd892",
    "./src/ilse.js?v=r577-1b61c41bd892",
    "./src/bells.js?v=r577-1b61c41bd892",
    "./src/meals.js?v=r577-1b61c41bd892",
    "./src/margins.js?v=r577-1b61c41bd892",
    "./src/marginalia.js?v=r577-1b61c41bd892",
    "./src/tyrant-hunt.js?v=r577-1b61c41bd892",
    "./src/world-beasts.js?v=r577-1b61c41bd892",
    "./src/elders.js?v=r577-1b61c41bd892",
    "./src/far-array.js?v=r577-1b61c41bd892",
    "./src/combat-visuals.js?v=r577-1b61c41bd892",
    "./src/dungeon-framework.js?v=r577-1b61c41bd892",
    "./src/elites.js?v=r577-1b61c41bd892",
    "./src/random.js?v=r577-1b61c41bd892",
    "./src/types.js?v=r577-1b61c41bd892",
    "./src/story.js?v=r577-1b61c41bd892",
    "./src/foundry.js?v=r577-1b61c41bd892",
    "./src/world.js?v=r577-1b61c41bd892",
    "./src/deep-dungeons.js?v=r577-1b61c41bd892",
    "./src/scenes.js?v=r577-1b61c41bd892",
    "./src/arenas.js?v=r577-1b61c41bd892",
    "./src/items.js?v=r577-1b61c41bd892",
    "./src/combat.js?v=r577-1b61c41bd892",
    "./src/interactions.js?v=r577-1b61c41bd892",
    "./src/persistence.js?v=r577-1b61c41bd892",
    "./src/input.js?v=r577-1b61c41bd892",
    "./src/game.js?v=r577-1b61c41bd892",
    "./src/renderer.js?v=r577-1b61c41bd892",
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
