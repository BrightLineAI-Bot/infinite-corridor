const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r347-6aae356afb82`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r347-6aae356afb82",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r347-6aae356afb82",
    "./src/proving-ground.js?v=r347-6aae356afb82",
    "./src/proving-ground-fixtures.js?v=r347-6aae356afb82",
    "./src/proving-ground-labs.js?v=r347-6aae356afb82",
    "./src/dungeon-variation.js?v=r347-6aae356afb82",
    "./src/dungeon-completion.js?v=r347-6aae356afb82",
    "./src/enemy-patterns.js?v=r347-6aae356afb82",
    "./src/monster-pack.js?v=r347-6aae356afb82",
    "./src/monster-render.js?v=r347-6aae356afb82",
    "./src/astral-worm.js?v=r347-6aae356afb82",
    "./src/astral-worm-render.js?v=r347-6aae356afb82",
    "./src/astral-worm-retreat.js?v=r347-6aae356afb82",
    "./src/astral-worm-mount.js?v=r347-6aae356afb82",
    "./src/lightning-giant-render.js?v=r347-6aae356afb82",
    "./src/astral-encounters.js?v=r347-6aae356afb82",
    "./src/astral-world-retreat.js?v=r347-6aae356afb82",
    "./src/landscape.js?v=r347-6aae356afb82",
    "./src/landscape-render.js?v=r347-6aae356afb82",
    "./src/underlands.js?v=r347-6aae356afb82",
    "./src/pattern-dungeons.js?v=r347-6aae356afb82",
    "./src/relay-network.js?v=r347-6aae356afb82",
    "./src/glyphs.js?v=r347-6aae356afb82",
    "./src/echoes.js?v=r347-6aae356afb82",
    "./src/constellation.js?v=r347-6aae356afb82",
    "./src/water-traversal.js?v=r347-6aae356afb82",
    "./src/open-sea.js?v=r347-6aae356afb82",
    "./src/boats.js?v=r347-6aae356afb82",
    "./src/sea-creatures.js?v=r347-6aae356afb82",
    "./src/diving.js?v=r347-6aae356afb82",
    "./src/grottoes.js?v=r347-6aae356afb82",
    "./src/spell-slots.js?v=r347-6aae356afb82",
    "./src/settlements.js?v=r347-6aae356afb82",
    "./src/skirmishes.js?v=r347-6aae356afb82",
    "./src/travelers.js?v=r347-6aae356afb82",
    "./src/diagnostic-probe.js?v=r347-6aae356afb82",
    "./src/questing-beast.js?v=r347-6aae356afb82",
    "./src/recitations.js?v=r347-6aae356afb82",
    "./src/lore.js?v=r347-6aae356afb82",
    "./src/glimpses.js?v=r347-6aae356afb82",
    "./src/glimpse-render.js?v=r347-6aae356afb82",
    "./src/glimpse-paint.js?v=r347-6aae356afb82",
    "./src/glimpse-scenes.js?v=r347-6aae356afb82",
    "./src/glimpse-horror.js?v=r347-6aae356afb82",
    "./src/glimpse-legend.js?v=r347-6aae356afb82",
    "./src/glimpse-hand.js?v=r347-6aae356afb82",
    "./src/atlas-view.js?v=r347-6aae356afb82",
    "./src/strange.js?v=r347-6aae356afb82",
    "./src/linked-dungeons.js?v=r347-6aae356afb82",
    "./src/digging.js?v=r347-6aae356afb82",
    "./src/building.js?v=r347-6aae356afb82",
    "./src/refuge-lands.js?v=r347-6aae356afb82",
    "./src/revenant-horde.js?v=r347-6aae356afb82",
    "./src/stages.js?v=r347-6aae356afb82",
    "./src/watcher.js?v=r347-6aae356afb82",
    "./src/vehicle-gates.js?v=r347-6aae356afb82",
    "./src/dungeon-ladder.js?v=r347-6aae356afb82",
    "./src/potions.js?v=r347-6aae356afb82",
    "./src/tyrant-hunt.js?v=r347-6aae356afb82",
    "./src/world-beasts.js?v=r347-6aae356afb82",
    "./src/elders.js?v=r347-6aae356afb82",
    "./src/far-array.js?v=r347-6aae356afb82",
    "./src/combat-visuals.js?v=r347-6aae356afb82",
    "./src/dungeon-framework.js?v=r347-6aae356afb82",
    "./src/elites.js?v=r347-6aae356afb82",
    "./src/random.js?v=r347-6aae356afb82",
    "./src/types.js?v=r347-6aae356afb82",
    "./src/story.js?v=r347-6aae356afb82",
    "./src/foundry.js?v=r347-6aae356afb82",
    "./src/world.js?v=r347-6aae356afb82",
    "./src/deep-dungeons.js?v=r347-6aae356afb82",
    "./src/scenes.js?v=r347-6aae356afb82",
    "./src/arenas.js?v=r347-6aae356afb82",
    "./src/items.js?v=r347-6aae356afb82",
    "./src/combat.js?v=r347-6aae356afb82",
    "./src/interactions.js?v=r347-6aae356afb82",
    "./src/persistence.js?v=r347-6aae356afb82",
    "./src/input.js?v=r347-6aae356afb82",
    "./src/game.js?v=r347-6aae356afb82",
    "./src/renderer.js?v=r347-6aae356afb82",
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
