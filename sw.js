const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v263`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=263",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=263",
    "./src/proving-ground.js?v=263",
    "./src/proving-ground-fixtures.js?v=263",
    "./src/proving-ground-labs.js?v=263",
    "./src/dungeon-variation.js?v=263",
    "./src/dungeon-completion.js?v=263",
    "./src/enemy-patterns.js?v=263",
    "./src/monster-pack.js?v=263",
    "./src/monster-render.js?v=263",
    "./src/astral-worm.js?v=263",
    "./src/astral-worm-render.js?v=263",
    "./src/astral-worm-retreat.js?v=263",
    "./src/astral-worm-mount.js?v=263",
    "./src/lightning-giant-render.js?v=263",
    "./src/astral-encounters.js?v=263",
    "./src/astral-world-retreat.js?v=263",
    "./src/landscape.js?v=263",
    "./src/landscape-render.js?v=263",
    "./src/underlands.js?v=263",
    "./src/pattern-dungeons.js?v=263",
    "./src/relay-network.js?v=263",
    "./src/glyphs.js?v=263",
    "./src/echoes.js?v=263",
    "./src/constellation.js?v=263",
    "./src/water-traversal.js?v=263",
    "./src/open-sea.js?v=263",
    "./src/boats.js?v=263",
    "./src/sea-creatures.js?v=263",
    "./src/diving.js?v=263",
    "./src/grottoes.js?v=263",
    "./src/spell-slots.js?v=263",
    "./src/settlements.js?v=263",
    "./src/skirmishes.js?v=263",
    "./src/travelers.js?v=263",
    "./src/diagnostic-probe.js?v=263",
    "./src/questing-beast.js?v=263",
    "./src/recitations.js?v=263",
    "./src/lore.js?v=263",
    "./src/glimpses.js?v=263",
    "./src/glimpse-render.js?v=263",
    "./src/glimpse-paint.js?v=263",
    "./src/glimpse-scenes.js?v=263",
    "./src/glimpse-horror.js?v=263",
    "./src/glimpse-legend.js?v=263",
    "./src/glimpse-hand.js?v=263",
    "./src/atlas-view.js?v=263",
    "./src/strange.js?v=263",
    "./src/linked-dungeons.js?v=263",
    "./src/digging.js?v=263",
    "./src/tyrant-hunt.js?v=263",
    "./src/world-beasts.js?v=263",
    "./src/elders.js?v=263",
    "./src/far-array.js?v=263",
    "./src/combat-visuals.js?v=263",
    "./src/dungeon-framework.js?v=263",
    "./src/elites.js?v=263",
    "./src/random.js?v=263",
    "./src/types.js?v=263",
    "./src/story.js?v=263",
    "./src/foundry.js?v=263",
    "./src/world.js?v=263",
    "./src/deep-dungeons.js?v=263",
    "./src/scenes.js?v=263",
    "./src/arenas.js?v=263",
    "./src/items.js?v=263",
    "./src/combat.js?v=263",
    "./src/interactions.js?v=263",
    "./src/persistence.js?v=263",
    "./src/input.js?v=263",
    "./src/game.js?v=263",
    "./src/renderer.js?v=263",
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
