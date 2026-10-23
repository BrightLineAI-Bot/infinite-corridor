const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v371`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=371",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=371",
    "./src/proving-ground.js?v=371",
    "./src/proving-ground-fixtures.js?v=371",
    "./src/proving-ground-labs.js?v=371",
    "./src/dungeon-variation.js?v=371",
    "./src/dungeon-completion.js?v=371",
    "./src/enemy-patterns.js?v=371",
    "./src/monster-pack.js?v=371",
    "./src/monster-render.js?v=371",
    "./src/astral-worm.js?v=371",
    "./src/astral-worm-render.js?v=371",
    "./src/astral-worm-retreat.js?v=371",
    "./src/astral-worm-mount.js?v=371",
    "./src/lightning-giant-render.js?v=371",
    "./src/astral-encounters.js?v=371",
    "./src/astral-world-retreat.js?v=371",
    "./src/landscape.js?v=371",
    "./src/landscape-render.js?v=371",
    "./src/underlands.js?v=371",
    "./src/pattern-dungeons.js?v=371",
    "./src/relay-network.js?v=371",
    "./src/glyphs.js?v=371",
    "./src/echoes.js?v=371",
    "./src/constellation.js?v=371",
    "./src/water-traversal.js?v=371",
    "./src/open-sea.js?v=371",
    "./src/boats.js?v=371",
    "./src/sea-creatures.js?v=371",
    "./src/diving.js?v=371",
    "./src/grottoes.js?v=371",
    "./src/spell-slots.js?v=371",
    "./src/settlements.js?v=371",
    "./src/skirmishes.js?v=371",
    "./src/travelers.js?v=371",
    "./src/diagnostic-probe.js?v=371",
    "./src/questing-beast.js?v=371",
    "./src/recitations.js?v=371",
    "./src/lore.js?v=371",
    "./src/glimpses.js?v=371",
    "./src/glimpse-render.js?v=371",
    "./src/glimpse-paint.js?v=371",
    "./src/glimpse-scenes.js?v=371",
    "./src/glimpse-horror.js?v=371",
    "./src/glimpse-legend.js?v=371",
    "./src/glimpse-hand.js?v=371",
    "./src/atlas-view.js?v=371",
    "./src/strange.js?v=371",
    "./src/linked-dungeons.js?v=371",
    "./src/digging.js?v=371",
    "./src/building.js?v=371",
    "./src/refuge-lands.js?v=371",
    "./src/revenant-horde.js?v=371",
    "./src/stages.js?v=371",
    "./src/watcher.js?v=371",
    "./src/vehicle-gates.js?v=371",
    "./src/dungeon-ladder.js?v=371",
    "./src/potions.js?v=371",
    "./src/transit-lattice.js?v=371",
    "./src/late-spells.js?v=371",
    "./src/listener-mirror.js?v=371",
    "./src/hometowns.js?v=371",
    "./src/tyrant-hunt.js?v=371",
    "./src/world-beasts.js?v=371",
    "./src/elders.js?v=371",
    "./src/far-array.js?v=371",
    "./src/combat-visuals.js?v=371",
    "./src/dungeon-framework.js?v=371",
    "./src/elites.js?v=371",
    "./src/random.js?v=371",
    "./src/types.js?v=371",
    "./src/story.js?v=371",
    "./src/foundry.js?v=371",
    "./src/world.js?v=371",
    "./src/deep-dungeons.js?v=371",
    "./src/scenes.js?v=371",
    "./src/arenas.js?v=371",
    "./src/items.js?v=371",
    "./src/combat.js?v=371",
    "./src/interactions.js?v=371",
    "./src/persistence.js?v=371",
    "./src/input.js?v=371",
    "./src/game.js?v=371",
    "./src/renderer.js?v=371",
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
