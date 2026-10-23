const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v347`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=347",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=347",
    "./src/proving-ground.js?v=347",
    "./src/proving-ground-fixtures.js?v=347",
    "./src/proving-ground-labs.js?v=347",
    "./src/dungeon-variation.js?v=347",
    "./src/dungeon-completion.js?v=347",
    "./src/enemy-patterns.js?v=347",
    "./src/monster-pack.js?v=347",
    "./src/monster-render.js?v=347",
    "./src/astral-worm.js?v=347",
    "./src/astral-worm-render.js?v=347",
    "./src/astral-worm-retreat.js?v=347",
    "./src/astral-worm-mount.js?v=347",
    "./src/lightning-giant-render.js?v=347",
    "./src/astral-encounters.js?v=347",
    "./src/astral-world-retreat.js?v=347",
    "./src/landscape.js?v=347",
    "./src/landscape-render.js?v=347",
    "./src/underlands.js?v=347",
    "./src/pattern-dungeons.js?v=347",
    "./src/relay-network.js?v=347",
    "./src/glyphs.js?v=347",
    "./src/echoes.js?v=347",
    "./src/constellation.js?v=347",
    "./src/water-traversal.js?v=347",
    "./src/open-sea.js?v=347",
    "./src/boats.js?v=347",
    "./src/sea-creatures.js?v=347",
    "./src/diving.js?v=347",
    "./src/grottoes.js?v=347",
    "./src/spell-slots.js?v=347",
    "./src/settlements.js?v=347",
    "./src/skirmishes.js?v=347",
    "./src/travelers.js?v=347",
    "./src/diagnostic-probe.js?v=347",
    "./src/questing-beast.js?v=347",
    "./src/recitations.js?v=347",
    "./src/lore.js?v=347",
    "./src/glimpses.js?v=347",
    "./src/glimpse-render.js?v=347",
    "./src/glimpse-paint.js?v=347",
    "./src/glimpse-scenes.js?v=347",
    "./src/glimpse-horror.js?v=347",
    "./src/glimpse-legend.js?v=347",
    "./src/glimpse-hand.js?v=347",
    "./src/atlas-view.js?v=347",
    "./src/strange.js?v=347",
    "./src/linked-dungeons.js?v=347",
    "./src/digging.js?v=347",
    "./src/building.js?v=347",
    "./src/refuge-lands.js?v=347",
    "./src/revenant-horde.js?v=347",
    "./src/stages.js?v=347",
    "./src/watcher.js?v=347",
    "./src/vehicle-gates.js?v=347",
    "./src/dungeon-ladder.js?v=347",
    "./src/potions.js?v=347",
    "./src/tyrant-hunt.js?v=347",
    "./src/world-beasts.js?v=347",
    "./src/elders.js?v=347",
    "./src/far-array.js?v=347",
    "./src/combat-visuals.js?v=347",
    "./src/dungeon-framework.js?v=347",
    "./src/elites.js?v=347",
    "./src/random.js?v=347",
    "./src/types.js?v=347",
    "./src/story.js?v=347",
    "./src/foundry.js?v=347",
    "./src/world.js?v=347",
    "./src/deep-dungeons.js?v=347",
    "./src/scenes.js?v=347",
    "./src/arenas.js?v=347",
    "./src/items.js?v=347",
    "./src/combat.js?v=347",
    "./src/interactions.js?v=347",
    "./src/persistence.js?v=347",
    "./src/input.js?v=347",
    "./src/game.js?v=347",
    "./src/renderer.js?v=347",
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
