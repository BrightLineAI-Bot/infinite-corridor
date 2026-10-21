const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r267-345b89326368`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r267-345b89326368",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r267-345b89326368",
    "./src/proving-ground.js?v=r267-345b89326368",
    "./src/proving-ground-fixtures.js?v=r267-345b89326368",
    "./src/proving-ground-labs.js?v=r267-345b89326368",
    "./src/dungeon-variation.js?v=r267-345b89326368",
    "./src/dungeon-completion.js?v=r267-345b89326368",
    "./src/enemy-patterns.js?v=r267-345b89326368",
    "./src/monster-pack.js?v=r267-345b89326368",
    "./src/monster-render.js?v=r267-345b89326368",
    "./src/astral-worm.js?v=r267-345b89326368",
    "./src/astral-worm-render.js?v=r267-345b89326368",
    "./src/astral-worm-retreat.js?v=r267-345b89326368",
    "./src/astral-worm-mount.js?v=r267-345b89326368",
    "./src/lightning-giant-render.js?v=r267-345b89326368",
    "./src/astral-encounters.js?v=r267-345b89326368",
    "./src/astral-world-retreat.js?v=r267-345b89326368",
    "./src/landscape.js?v=r267-345b89326368",
    "./src/landscape-render.js?v=r267-345b89326368",
    "./src/underlands.js?v=r267-345b89326368",
    "./src/pattern-dungeons.js?v=r267-345b89326368",
    "./src/relay-network.js?v=r267-345b89326368",
    "./src/glyphs.js?v=r267-345b89326368",
    "./src/echoes.js?v=r267-345b89326368",
    "./src/constellation.js?v=r267-345b89326368",
    "./src/water-traversal.js?v=r267-345b89326368",
    "./src/open-sea.js?v=r267-345b89326368",
    "./src/boats.js?v=r267-345b89326368",
    "./src/sea-creatures.js?v=r267-345b89326368",
    "./src/diving.js?v=r267-345b89326368",
    "./src/grottoes.js?v=r267-345b89326368",
    "./src/spell-slots.js?v=r267-345b89326368",
    "./src/settlements.js?v=r267-345b89326368",
    "./src/skirmishes.js?v=r267-345b89326368",
    "./src/travelers.js?v=r267-345b89326368",
    "./src/diagnostic-probe.js?v=r267-345b89326368",
    "./src/questing-beast.js?v=r267-345b89326368",
    "./src/recitations.js?v=r267-345b89326368",
    "./src/lore.js?v=r267-345b89326368",
    "./src/glimpses.js?v=r267-345b89326368",
    "./src/glimpse-render.js?v=r267-345b89326368",
    "./src/glimpse-paint.js?v=r267-345b89326368",
    "./src/glimpse-scenes.js?v=r267-345b89326368",
    "./src/glimpse-horror.js?v=r267-345b89326368",
    "./src/glimpse-legend.js?v=r267-345b89326368",
    "./src/glimpse-hand.js?v=r267-345b89326368",
    "./src/atlas-view.js?v=r267-345b89326368",
    "./src/strange.js?v=r267-345b89326368",
    "./src/linked-dungeons.js?v=r267-345b89326368",
    "./src/digging.js?v=r267-345b89326368",
    "./src/building.js?v=r267-345b89326368",
    "./src/refuge-lands.js?v=r267-345b89326368",
    "./src/tyrant-hunt.js?v=r267-345b89326368",
    "./src/world-beasts.js?v=r267-345b89326368",
    "./src/elders.js?v=r267-345b89326368",
    "./src/far-array.js?v=r267-345b89326368",
    "./src/combat-visuals.js?v=r267-345b89326368",
    "./src/dungeon-framework.js?v=r267-345b89326368",
    "./src/elites.js?v=r267-345b89326368",
    "./src/random.js?v=r267-345b89326368",
    "./src/types.js?v=r267-345b89326368",
    "./src/story.js?v=r267-345b89326368",
    "./src/foundry.js?v=r267-345b89326368",
    "./src/world.js?v=r267-345b89326368",
    "./src/deep-dungeons.js?v=r267-345b89326368",
    "./src/scenes.js?v=r267-345b89326368",
    "./src/arenas.js?v=r267-345b89326368",
    "./src/items.js?v=r267-345b89326368",
    "./src/combat.js?v=r267-345b89326368",
    "./src/interactions.js?v=r267-345b89326368",
    "./src/persistence.js?v=r267-345b89326368",
    "./src/input.js?v=r267-345b89326368",
    "./src/game.js?v=r267-345b89326368",
    "./src/renderer.js?v=r267-345b89326368",
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
