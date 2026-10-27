const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v511`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=511",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=511",
    "./src/proving-ground.js?v=511",
    "./src/proving-ground-fixtures.js?v=511",
    "./src/proving-ground-labs.js?v=511",
    "./src/dungeon-variation.js?v=511",
    "./src/dungeon-completion.js?v=511",
    "./src/enemy-patterns.js?v=511",
    "./src/monster-pack.js?v=511",
    "./src/monster-render.js?v=511",
    "./src/astral-worm.js?v=511",
    "./src/astral-worm-render.js?v=511",
    "./src/astral-worm-retreat.js?v=511",
    "./src/astral-worm-mount.js?v=511",
    "./src/lightning-giant-render.js?v=511",
    "./src/astral-encounters.js?v=511",
    "./src/astral-world-retreat.js?v=511",
    "./src/landscape.js?v=511",
    "./src/landscape-render.js?v=511",
    "./src/underlands.js?v=511",
    "./src/pattern-dungeons.js?v=511",
    "./src/relay-network.js?v=511",
    "./src/glyphs.js?v=511",
    "./src/echoes.js?v=511",
    "./src/constellation.js?v=511",
    "./src/water-traversal.js?v=511",
    "./src/open-sea.js?v=511",
    "./src/boats.js?v=511",
    "./src/sea-creatures.js?v=511",
    "./src/diving.js?v=511",
    "./src/grottoes.js?v=511",
    "./src/spell-slots.js?v=511",
    "./src/settlements.js?v=511",
    "./src/skirmishes.js?v=511",
    "./src/travelers.js?v=511",
    "./src/diagnostic-probe.js?v=511",
    "./src/questing-beast.js?v=511",
    "./src/recitations.js?v=511",
    "./src/lore.js?v=511",
    "./src/glimpses.js?v=511",
    "./src/glimpse-render.js?v=511",
    "./src/glimpse-paint.js?v=511",
    "./src/glimpse-scenes.js?v=511",
    "./src/glimpse-horror.js?v=511",
    "./src/glimpse-legend.js?v=511",
    "./src/glimpse-hand.js?v=511",
    "./src/atlas-view.js?v=511",
    "./src/strange.js?v=511",
    "./src/linked-dungeons.js?v=511",
    "./src/digging.js?v=511",
    "./src/building.js?v=511",
    "./src/refuge-lands.js?v=511",
    "./src/revenant-horde.js?v=511",
    "./src/stages.js?v=511",
    "./src/watcher.js?v=511",
    "./src/vehicle-gates.js?v=511",
    "./src/dungeon-ladder.js?v=511",
    "./src/potions.js?v=511",
    "./src/transit-lattice.js?v=511",
    "./src/late-spells.js?v=511",
    "./src/brawler-spells.js?v=511",
    "./src/orbit-volley.js?v=511",
    "./src/surveyor.js?v=511",
    "./src/listener-mirror.js?v=511",
    "./src/hometowns.js?v=511",
    "./src/listener-arena.js?v=511",
    "./src/listener-morph.js?v=511",
    "./src/build-presets.js?v=511",
    "./src/smithy.js?v=511",
    "./src/ilse.js?v=511",
    "./src/bells.js?v=511",
    "./src/meals.js?v=511",
    "./src/margins.js?v=511",
    "./src/marginalia.js?v=511",
    "./src/tyrant-hunt.js?v=511",
    "./src/world-beasts.js?v=511",
    "./src/elders.js?v=511",
    "./src/far-array.js?v=511",
    "./src/combat-visuals.js?v=511",
    "./src/dungeon-framework.js?v=511",
    "./src/elites.js?v=511",
    "./src/random.js?v=511",
    "./src/types.js?v=511",
    "./src/story.js?v=511",
    "./src/foundry.js?v=511",
    "./src/world.js?v=511",
    "./src/deep-dungeons.js?v=511",
    "./src/scenes.js?v=511",
    "./src/arenas.js?v=511",
    "./src/items.js?v=511",
    "./src/combat.js?v=511",
    "./src/interactions.js?v=511",
    "./src/persistence.js?v=511",
    "./src/input.js?v=511",
    "./src/game.js?v=511",
    "./src/renderer.js?v=511",
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
