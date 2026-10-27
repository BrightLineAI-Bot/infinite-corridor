const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r505-ca3263066d7d`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r505-ca3263066d7d",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r505-ca3263066d7d",
    "./src/proving-ground.js?v=r505-ca3263066d7d",
    "./src/proving-ground-fixtures.js?v=r505-ca3263066d7d",
    "./src/proving-ground-labs.js?v=r505-ca3263066d7d",
    "./src/dungeon-variation.js?v=r505-ca3263066d7d",
    "./src/dungeon-completion.js?v=r505-ca3263066d7d",
    "./src/enemy-patterns.js?v=r505-ca3263066d7d",
    "./src/monster-pack.js?v=r505-ca3263066d7d",
    "./src/monster-render.js?v=r505-ca3263066d7d",
    "./src/astral-worm.js?v=r505-ca3263066d7d",
    "./src/astral-worm-render.js?v=r505-ca3263066d7d",
    "./src/astral-worm-retreat.js?v=r505-ca3263066d7d",
    "./src/astral-worm-mount.js?v=r505-ca3263066d7d",
    "./src/lightning-giant-render.js?v=r505-ca3263066d7d",
    "./src/astral-encounters.js?v=r505-ca3263066d7d",
    "./src/astral-world-retreat.js?v=r505-ca3263066d7d",
    "./src/landscape.js?v=r505-ca3263066d7d",
    "./src/landscape-render.js?v=r505-ca3263066d7d",
    "./src/underlands.js?v=r505-ca3263066d7d",
    "./src/pattern-dungeons.js?v=r505-ca3263066d7d",
    "./src/relay-network.js?v=r505-ca3263066d7d",
    "./src/glyphs.js?v=r505-ca3263066d7d",
    "./src/echoes.js?v=r505-ca3263066d7d",
    "./src/constellation.js?v=r505-ca3263066d7d",
    "./src/water-traversal.js?v=r505-ca3263066d7d",
    "./src/open-sea.js?v=r505-ca3263066d7d",
    "./src/boats.js?v=r505-ca3263066d7d",
    "./src/sea-creatures.js?v=r505-ca3263066d7d",
    "./src/diving.js?v=r505-ca3263066d7d",
    "./src/grottoes.js?v=r505-ca3263066d7d",
    "./src/spell-slots.js?v=r505-ca3263066d7d",
    "./src/settlements.js?v=r505-ca3263066d7d",
    "./src/skirmishes.js?v=r505-ca3263066d7d",
    "./src/travelers.js?v=r505-ca3263066d7d",
    "./src/diagnostic-probe.js?v=r505-ca3263066d7d",
    "./src/questing-beast.js?v=r505-ca3263066d7d",
    "./src/recitations.js?v=r505-ca3263066d7d",
    "./src/lore.js?v=r505-ca3263066d7d",
    "./src/glimpses.js?v=r505-ca3263066d7d",
    "./src/glimpse-render.js?v=r505-ca3263066d7d",
    "./src/glimpse-paint.js?v=r505-ca3263066d7d",
    "./src/glimpse-scenes.js?v=r505-ca3263066d7d",
    "./src/glimpse-horror.js?v=r505-ca3263066d7d",
    "./src/glimpse-legend.js?v=r505-ca3263066d7d",
    "./src/glimpse-hand.js?v=r505-ca3263066d7d",
    "./src/atlas-view.js?v=r505-ca3263066d7d",
    "./src/strange.js?v=r505-ca3263066d7d",
    "./src/linked-dungeons.js?v=r505-ca3263066d7d",
    "./src/digging.js?v=r505-ca3263066d7d",
    "./src/building.js?v=r505-ca3263066d7d",
    "./src/refuge-lands.js?v=r505-ca3263066d7d",
    "./src/revenant-horde.js?v=r505-ca3263066d7d",
    "./src/stages.js?v=r505-ca3263066d7d",
    "./src/watcher.js?v=r505-ca3263066d7d",
    "./src/vehicle-gates.js?v=r505-ca3263066d7d",
    "./src/dungeon-ladder.js?v=r505-ca3263066d7d",
    "./src/potions.js?v=r505-ca3263066d7d",
    "./src/transit-lattice.js?v=r505-ca3263066d7d",
    "./src/late-spells.js?v=r505-ca3263066d7d",
    "./src/brawler-spells.js?v=r505-ca3263066d7d",
    "./src/orbit-volley.js?v=r505-ca3263066d7d",
    "./src/surveyor.js?v=r505-ca3263066d7d",
    "./src/listener-mirror.js?v=r505-ca3263066d7d",
    "./src/hometowns.js?v=r505-ca3263066d7d",
    "./src/listener-arena.js?v=r505-ca3263066d7d",
    "./src/listener-morph.js?v=r505-ca3263066d7d",
    "./src/build-presets.js?v=r505-ca3263066d7d",
    "./src/smithy.js?v=r505-ca3263066d7d",
    "./src/ilse.js?v=r505-ca3263066d7d",
    "./src/bells.js?v=r505-ca3263066d7d",
    "./src/meals.js?v=r505-ca3263066d7d",
    "./src/margins.js?v=r505-ca3263066d7d",
    "./src/marginalia.js?v=r505-ca3263066d7d",
    "./src/tyrant-hunt.js?v=r505-ca3263066d7d",
    "./src/world-beasts.js?v=r505-ca3263066d7d",
    "./src/elders.js?v=r505-ca3263066d7d",
    "./src/far-array.js?v=r505-ca3263066d7d",
    "./src/combat-visuals.js?v=r505-ca3263066d7d",
    "./src/dungeon-framework.js?v=r505-ca3263066d7d",
    "./src/elites.js?v=r505-ca3263066d7d",
    "./src/random.js?v=r505-ca3263066d7d",
    "./src/types.js?v=r505-ca3263066d7d",
    "./src/story.js?v=r505-ca3263066d7d",
    "./src/foundry.js?v=r505-ca3263066d7d",
    "./src/world.js?v=r505-ca3263066d7d",
    "./src/deep-dungeons.js?v=r505-ca3263066d7d",
    "./src/scenes.js?v=r505-ca3263066d7d",
    "./src/arenas.js?v=r505-ca3263066d7d",
    "./src/items.js?v=r505-ca3263066d7d",
    "./src/combat.js?v=r505-ca3263066d7d",
    "./src/interactions.js?v=r505-ca3263066d7d",
    "./src/persistence.js?v=r505-ca3263066d7d",
    "./src/input.js?v=r505-ca3263066d7d",
    "./src/game.js?v=r505-ca3263066d7d",
    "./src/renderer.js?v=r505-ca3263066d7d",
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
