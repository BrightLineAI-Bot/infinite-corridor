const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v525`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=525",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=525",
    "./src/proving-ground.js?v=525",
    "./src/proving-ground-fixtures.js?v=525",
    "./src/proving-ground-labs.js?v=525",
    "./src/dungeon-variation.js?v=525",
    "./src/dungeon-completion.js?v=525",
    "./src/enemy-patterns.js?v=525",
    "./src/monster-pack.js?v=525",
    "./src/monster-render.js?v=525",
    "./src/astral-worm.js?v=525",
    "./src/astral-worm-render.js?v=525",
    "./src/astral-worm-retreat.js?v=525",
    "./src/astral-worm-mount.js?v=525",
    "./src/lightning-giant-render.js?v=525",
    "./src/astral-encounters.js?v=525",
    "./src/astral-world-retreat.js?v=525",
    "./src/landscape.js?v=525",
    "./src/landscape-render.js?v=525",
    "./src/underlands.js?v=525",
    "./src/pattern-dungeons.js?v=525",
    "./src/relay-network.js?v=525",
    "./src/glyphs.js?v=525",
    "./src/echoes.js?v=525",
    "./src/constellation.js?v=525",
    "./src/water-traversal.js?v=525",
    "./src/open-sea.js?v=525",
    "./src/boats.js?v=525",
    "./src/sea-creatures.js?v=525",
    "./src/diving.js?v=525",
    "./src/grottoes.js?v=525",
    "./src/spell-slots.js?v=525",
    "./src/settlements.js?v=525",
    "./src/skirmishes.js?v=525",
    "./src/travelers.js?v=525",
    "./src/diagnostic-probe.js?v=525",
    "./src/questing-beast.js?v=525",
    "./src/recitations.js?v=525",
    "./src/lore.js?v=525",
    "./src/glimpses.js?v=525",
    "./src/glimpse-render.js?v=525",
    "./src/glimpse-paint.js?v=525",
    "./src/glimpse-scenes.js?v=525",
    "./src/glimpse-horror.js?v=525",
    "./src/glimpse-legend.js?v=525",
    "./src/glimpse-hand.js?v=525",
    "./src/atlas-view.js?v=525",
    "./src/strange.js?v=525",
    "./src/linked-dungeons.js?v=525",
    "./src/digging.js?v=525",
    "./src/building.js?v=525",
    "./src/refuge-lands.js?v=525",
    "./src/revenant-horde.js?v=525",
    "./src/stages.js?v=525",
    "./src/watcher.js?v=525",
    "./src/vehicle-gates.js?v=525",
    "./src/dungeon-ladder.js?v=525",
    "./src/potions.js?v=525",
    "./src/transit-lattice.js?v=525",
    "./src/late-spells.js?v=525",
    "./src/brawler-spells.js?v=525",
    "./src/orbit-volley.js?v=525",
    "./src/surveyor.js?v=525",
    "./src/lattice-fields.js?v=525",
    "./src/dungeon-traps.js?v=525",
    "./src/listener-mirror.js?v=525",
    "./src/hometowns.js?v=525",
    "./src/listener-arena.js?v=525",
    "./src/listener-morph.js?v=525",
    "./src/build-presets.js?v=525",
    "./src/smithy.js?v=525",
    "./src/ilse.js?v=525",
    "./src/bells.js?v=525",
    "./src/meals.js?v=525",
    "./src/margins.js?v=525",
    "./src/marginalia.js?v=525",
    "./src/tyrant-hunt.js?v=525",
    "./src/world-beasts.js?v=525",
    "./src/elders.js?v=525",
    "./src/far-array.js?v=525",
    "./src/combat-visuals.js?v=525",
    "./src/dungeon-framework.js?v=525",
    "./src/elites.js?v=525",
    "./src/random.js?v=525",
    "./src/types.js?v=525",
    "./src/story.js?v=525",
    "./src/foundry.js?v=525",
    "./src/world.js?v=525",
    "./src/deep-dungeons.js?v=525",
    "./src/scenes.js?v=525",
    "./src/arenas.js?v=525",
    "./src/items.js?v=525",
    "./src/combat.js?v=525",
    "./src/interactions.js?v=525",
    "./src/persistence.js?v=525",
    "./src/input.js?v=525",
    "./src/game.js?v=525",
    "./src/renderer.js?v=525",
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
