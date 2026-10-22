const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r299-f25a24dc4fb2`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r299-f25a24dc4fb2",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r299-f25a24dc4fb2",
    "./src/proving-ground.js?v=r299-f25a24dc4fb2",
    "./src/proving-ground-fixtures.js?v=r299-f25a24dc4fb2",
    "./src/proving-ground-labs.js?v=r299-f25a24dc4fb2",
    "./src/dungeon-variation.js?v=r299-f25a24dc4fb2",
    "./src/dungeon-completion.js?v=r299-f25a24dc4fb2",
    "./src/enemy-patterns.js?v=r299-f25a24dc4fb2",
    "./src/monster-pack.js?v=r299-f25a24dc4fb2",
    "./src/monster-render.js?v=r299-f25a24dc4fb2",
    "./src/astral-worm.js?v=r299-f25a24dc4fb2",
    "./src/astral-worm-render.js?v=r299-f25a24dc4fb2",
    "./src/astral-worm-retreat.js?v=r299-f25a24dc4fb2",
    "./src/astral-worm-mount.js?v=r299-f25a24dc4fb2",
    "./src/lightning-giant-render.js?v=r299-f25a24dc4fb2",
    "./src/astral-encounters.js?v=r299-f25a24dc4fb2",
    "./src/astral-world-retreat.js?v=r299-f25a24dc4fb2",
    "./src/landscape.js?v=r299-f25a24dc4fb2",
    "./src/landscape-render.js?v=r299-f25a24dc4fb2",
    "./src/underlands.js?v=r299-f25a24dc4fb2",
    "./src/pattern-dungeons.js?v=r299-f25a24dc4fb2",
    "./src/relay-network.js?v=r299-f25a24dc4fb2",
    "./src/glyphs.js?v=r299-f25a24dc4fb2",
    "./src/echoes.js?v=r299-f25a24dc4fb2",
    "./src/constellation.js?v=r299-f25a24dc4fb2",
    "./src/water-traversal.js?v=r299-f25a24dc4fb2",
    "./src/open-sea.js?v=r299-f25a24dc4fb2",
    "./src/boats.js?v=r299-f25a24dc4fb2",
    "./src/sea-creatures.js?v=r299-f25a24dc4fb2",
    "./src/diving.js?v=r299-f25a24dc4fb2",
    "./src/grottoes.js?v=r299-f25a24dc4fb2",
    "./src/spell-slots.js?v=r299-f25a24dc4fb2",
    "./src/settlements.js?v=r299-f25a24dc4fb2",
    "./src/skirmishes.js?v=r299-f25a24dc4fb2",
    "./src/travelers.js?v=r299-f25a24dc4fb2",
    "./src/diagnostic-probe.js?v=r299-f25a24dc4fb2",
    "./src/questing-beast.js?v=r299-f25a24dc4fb2",
    "./src/recitations.js?v=r299-f25a24dc4fb2",
    "./src/lore.js?v=r299-f25a24dc4fb2",
    "./src/glimpses.js?v=r299-f25a24dc4fb2",
    "./src/glimpse-render.js?v=r299-f25a24dc4fb2",
    "./src/glimpse-paint.js?v=r299-f25a24dc4fb2",
    "./src/glimpse-scenes.js?v=r299-f25a24dc4fb2",
    "./src/glimpse-horror.js?v=r299-f25a24dc4fb2",
    "./src/glimpse-legend.js?v=r299-f25a24dc4fb2",
    "./src/glimpse-hand.js?v=r299-f25a24dc4fb2",
    "./src/atlas-view.js?v=r299-f25a24dc4fb2",
    "./src/strange.js?v=r299-f25a24dc4fb2",
    "./src/linked-dungeons.js?v=r299-f25a24dc4fb2",
    "./src/digging.js?v=r299-f25a24dc4fb2",
    "./src/building.js?v=r299-f25a24dc4fb2",
    "./src/refuge-lands.js?v=r299-f25a24dc4fb2",
    "./src/revenant-horde.js?v=r299-f25a24dc4fb2",
    "./src/stages.js?v=r299-f25a24dc4fb2",
    "./src/watcher.js?v=r299-f25a24dc4fb2",
    "./src/tyrant-hunt.js?v=r299-f25a24dc4fb2",
    "./src/world-beasts.js?v=r299-f25a24dc4fb2",
    "./src/elders.js?v=r299-f25a24dc4fb2",
    "./src/far-array.js?v=r299-f25a24dc4fb2",
    "./src/combat-visuals.js?v=r299-f25a24dc4fb2",
    "./src/dungeon-framework.js?v=r299-f25a24dc4fb2",
    "./src/elites.js?v=r299-f25a24dc4fb2",
    "./src/random.js?v=r299-f25a24dc4fb2",
    "./src/types.js?v=r299-f25a24dc4fb2",
    "./src/story.js?v=r299-f25a24dc4fb2",
    "./src/foundry.js?v=r299-f25a24dc4fb2",
    "./src/world.js?v=r299-f25a24dc4fb2",
    "./src/deep-dungeons.js?v=r299-f25a24dc4fb2",
    "./src/scenes.js?v=r299-f25a24dc4fb2",
    "./src/arenas.js?v=r299-f25a24dc4fb2",
    "./src/items.js?v=r299-f25a24dc4fb2",
    "./src/combat.js?v=r299-f25a24dc4fb2",
    "./src/interactions.js?v=r299-f25a24dc4fb2",
    "./src/persistence.js?v=r299-f25a24dc4fb2",
    "./src/input.js?v=r299-f25a24dc4fb2",
    "./src/game.js?v=r299-f25a24dc4fb2",
    "./src/renderer.js?v=r299-f25a24dc4fb2",
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
