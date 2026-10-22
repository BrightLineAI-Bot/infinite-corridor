const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r277-ce71a38b8a17`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r277-ce71a38b8a17",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r277-ce71a38b8a17",
    "./src/proving-ground.js?v=r277-ce71a38b8a17",
    "./src/proving-ground-fixtures.js?v=r277-ce71a38b8a17",
    "./src/proving-ground-labs.js?v=r277-ce71a38b8a17",
    "./src/dungeon-variation.js?v=r277-ce71a38b8a17",
    "./src/dungeon-completion.js?v=r277-ce71a38b8a17",
    "./src/enemy-patterns.js?v=r277-ce71a38b8a17",
    "./src/monster-pack.js?v=r277-ce71a38b8a17",
    "./src/monster-render.js?v=r277-ce71a38b8a17",
    "./src/astral-worm.js?v=r277-ce71a38b8a17",
    "./src/astral-worm-render.js?v=r277-ce71a38b8a17",
    "./src/astral-worm-retreat.js?v=r277-ce71a38b8a17",
    "./src/astral-worm-mount.js?v=r277-ce71a38b8a17",
    "./src/lightning-giant-render.js?v=r277-ce71a38b8a17",
    "./src/astral-encounters.js?v=r277-ce71a38b8a17",
    "./src/astral-world-retreat.js?v=r277-ce71a38b8a17",
    "./src/landscape.js?v=r277-ce71a38b8a17",
    "./src/landscape-render.js?v=r277-ce71a38b8a17",
    "./src/underlands.js?v=r277-ce71a38b8a17",
    "./src/pattern-dungeons.js?v=r277-ce71a38b8a17",
    "./src/relay-network.js?v=r277-ce71a38b8a17",
    "./src/glyphs.js?v=r277-ce71a38b8a17",
    "./src/echoes.js?v=r277-ce71a38b8a17",
    "./src/constellation.js?v=r277-ce71a38b8a17",
    "./src/water-traversal.js?v=r277-ce71a38b8a17",
    "./src/open-sea.js?v=r277-ce71a38b8a17",
    "./src/boats.js?v=r277-ce71a38b8a17",
    "./src/sea-creatures.js?v=r277-ce71a38b8a17",
    "./src/diving.js?v=r277-ce71a38b8a17",
    "./src/grottoes.js?v=r277-ce71a38b8a17",
    "./src/spell-slots.js?v=r277-ce71a38b8a17",
    "./src/settlements.js?v=r277-ce71a38b8a17",
    "./src/skirmishes.js?v=r277-ce71a38b8a17",
    "./src/travelers.js?v=r277-ce71a38b8a17",
    "./src/diagnostic-probe.js?v=r277-ce71a38b8a17",
    "./src/questing-beast.js?v=r277-ce71a38b8a17",
    "./src/recitations.js?v=r277-ce71a38b8a17",
    "./src/lore.js?v=r277-ce71a38b8a17",
    "./src/glimpses.js?v=r277-ce71a38b8a17",
    "./src/glimpse-render.js?v=r277-ce71a38b8a17",
    "./src/glimpse-paint.js?v=r277-ce71a38b8a17",
    "./src/glimpse-scenes.js?v=r277-ce71a38b8a17",
    "./src/glimpse-horror.js?v=r277-ce71a38b8a17",
    "./src/glimpse-legend.js?v=r277-ce71a38b8a17",
    "./src/glimpse-hand.js?v=r277-ce71a38b8a17",
    "./src/atlas-view.js?v=r277-ce71a38b8a17",
    "./src/strange.js?v=r277-ce71a38b8a17",
    "./src/linked-dungeons.js?v=r277-ce71a38b8a17",
    "./src/digging.js?v=r277-ce71a38b8a17",
    "./src/building.js?v=r277-ce71a38b8a17",
    "./src/refuge-lands.js?v=r277-ce71a38b8a17",
    "./src/revenant-horde.js?v=r277-ce71a38b8a17",
    "./src/stages.js?v=r277-ce71a38b8a17",
    "./src/tyrant-hunt.js?v=r277-ce71a38b8a17",
    "./src/world-beasts.js?v=r277-ce71a38b8a17",
    "./src/elders.js?v=r277-ce71a38b8a17",
    "./src/far-array.js?v=r277-ce71a38b8a17",
    "./src/combat-visuals.js?v=r277-ce71a38b8a17",
    "./src/dungeon-framework.js?v=r277-ce71a38b8a17",
    "./src/elites.js?v=r277-ce71a38b8a17",
    "./src/random.js?v=r277-ce71a38b8a17",
    "./src/types.js?v=r277-ce71a38b8a17",
    "./src/story.js?v=r277-ce71a38b8a17",
    "./src/foundry.js?v=r277-ce71a38b8a17",
    "./src/world.js?v=r277-ce71a38b8a17",
    "./src/deep-dungeons.js?v=r277-ce71a38b8a17",
    "./src/scenes.js?v=r277-ce71a38b8a17",
    "./src/arenas.js?v=r277-ce71a38b8a17",
    "./src/items.js?v=r277-ce71a38b8a17",
    "./src/combat.js?v=r277-ce71a38b8a17",
    "./src/interactions.js?v=r277-ce71a38b8a17",
    "./src/persistence.js?v=r277-ce71a38b8a17",
    "./src/input.js?v=r277-ce71a38b8a17",
    "./src/game.js?v=r277-ce71a38b8a17",
    "./src/renderer.js?v=r277-ce71a38b8a17",
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
