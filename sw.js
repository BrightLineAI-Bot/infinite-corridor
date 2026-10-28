const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v515`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=515",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=515",
    "./src/proving-ground.js?v=515",
    "./src/proving-ground-fixtures.js?v=515",
    "./src/proving-ground-labs.js?v=515",
    "./src/dungeon-variation.js?v=515",
    "./src/dungeon-completion.js?v=515",
    "./src/enemy-patterns.js?v=515",
    "./src/monster-pack.js?v=515",
    "./src/monster-render.js?v=515",
    "./src/astral-worm.js?v=515",
    "./src/astral-worm-render.js?v=515",
    "./src/astral-worm-retreat.js?v=515",
    "./src/astral-worm-mount.js?v=515",
    "./src/lightning-giant-render.js?v=515",
    "./src/astral-encounters.js?v=515",
    "./src/astral-world-retreat.js?v=515",
    "./src/landscape.js?v=515",
    "./src/landscape-render.js?v=515",
    "./src/underlands.js?v=515",
    "./src/pattern-dungeons.js?v=515",
    "./src/relay-network.js?v=515",
    "./src/glyphs.js?v=515",
    "./src/echoes.js?v=515",
    "./src/constellation.js?v=515",
    "./src/water-traversal.js?v=515",
    "./src/open-sea.js?v=515",
    "./src/boats.js?v=515",
    "./src/sea-creatures.js?v=515",
    "./src/diving.js?v=515",
    "./src/grottoes.js?v=515",
    "./src/spell-slots.js?v=515",
    "./src/settlements.js?v=515",
    "./src/skirmishes.js?v=515",
    "./src/travelers.js?v=515",
    "./src/diagnostic-probe.js?v=515",
    "./src/questing-beast.js?v=515",
    "./src/recitations.js?v=515",
    "./src/lore.js?v=515",
    "./src/glimpses.js?v=515",
    "./src/glimpse-render.js?v=515",
    "./src/glimpse-paint.js?v=515",
    "./src/glimpse-scenes.js?v=515",
    "./src/glimpse-horror.js?v=515",
    "./src/glimpse-legend.js?v=515",
    "./src/glimpse-hand.js?v=515",
    "./src/atlas-view.js?v=515",
    "./src/strange.js?v=515",
    "./src/linked-dungeons.js?v=515",
    "./src/digging.js?v=515",
    "./src/building.js?v=515",
    "./src/refuge-lands.js?v=515",
    "./src/revenant-horde.js?v=515",
    "./src/stages.js?v=515",
    "./src/watcher.js?v=515",
    "./src/vehicle-gates.js?v=515",
    "./src/dungeon-ladder.js?v=515",
    "./src/potions.js?v=515",
    "./src/transit-lattice.js?v=515",
    "./src/late-spells.js?v=515",
    "./src/brawler-spells.js?v=515",
    "./src/orbit-volley.js?v=515",
    "./src/surveyor.js?v=515",
    "./src/lattice-fields.js?v=515",
    "./src/listener-mirror.js?v=515",
    "./src/hometowns.js?v=515",
    "./src/listener-arena.js?v=515",
    "./src/listener-morph.js?v=515",
    "./src/build-presets.js?v=515",
    "./src/smithy.js?v=515",
    "./src/ilse.js?v=515",
    "./src/bells.js?v=515",
    "./src/meals.js?v=515",
    "./src/margins.js?v=515",
    "./src/marginalia.js?v=515",
    "./src/tyrant-hunt.js?v=515",
    "./src/world-beasts.js?v=515",
    "./src/elders.js?v=515",
    "./src/far-array.js?v=515",
    "./src/combat-visuals.js?v=515",
    "./src/dungeon-framework.js?v=515",
    "./src/elites.js?v=515",
    "./src/random.js?v=515",
    "./src/types.js?v=515",
    "./src/story.js?v=515",
    "./src/foundry.js?v=515",
    "./src/world.js?v=515",
    "./src/deep-dungeons.js?v=515",
    "./src/scenes.js?v=515",
    "./src/arenas.js?v=515",
    "./src/items.js?v=515",
    "./src/combat.js?v=515",
    "./src/interactions.js?v=515",
    "./src/persistence.js?v=515",
    "./src/input.js?v=515",
    "./src/game.js?v=515",
    "./src/renderer.js?v=515",
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
