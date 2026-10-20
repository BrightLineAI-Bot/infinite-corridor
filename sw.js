const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r243-79e75c3186cb`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r243-79e75c3186cb",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r243-79e75c3186cb",
    "./src/proving-ground.js?v=r243-79e75c3186cb",
    "./src/proving-ground-fixtures.js?v=r243-79e75c3186cb",
    "./src/proving-ground-labs.js?v=r243-79e75c3186cb",
    "./src/dungeon-variation.js?v=r243-79e75c3186cb",
    "./src/dungeon-completion.js?v=r243-79e75c3186cb",
    "./src/enemy-patterns.js?v=r243-79e75c3186cb",
    "./src/monster-pack.js?v=r243-79e75c3186cb",
    "./src/monster-render.js?v=r243-79e75c3186cb",
    "./src/landscape.js?v=r243-79e75c3186cb",
    "./src/landscape-render.js?v=r243-79e75c3186cb",
    "./src/underlands.js?v=r243-79e75c3186cb",
    "./src/pattern-dungeons.js?v=r243-79e75c3186cb",
    "./src/relay-network.js?v=r243-79e75c3186cb",
    "./src/glyphs.js?v=r243-79e75c3186cb",
    "./src/echoes.js?v=r243-79e75c3186cb",
    "./src/constellation.js?v=r243-79e75c3186cb",
    "./src/water-traversal.js?v=r243-79e75c3186cb",
    "./src/open-sea.js?v=r243-79e75c3186cb",
    "./src/boats.js?v=r243-79e75c3186cb",
    "./src/sea-creatures.js?v=r243-79e75c3186cb",
    "./src/diving.js?v=r243-79e75c3186cb",
    "./src/grottoes.js?v=r243-79e75c3186cb",
    "./src/spell-slots.js?v=r243-79e75c3186cb",
    "./src/settlements.js?v=r243-79e75c3186cb",
    "./src/skirmishes.js?v=r243-79e75c3186cb",
    "./src/travelers.js?v=r243-79e75c3186cb",
    "./src/diagnostic-probe.js?v=r243-79e75c3186cb",
    "./src/questing-beast.js?v=r243-79e75c3186cb",
    "./src/recitations.js?v=r243-79e75c3186cb",
    "./src/lore.js?v=r243-79e75c3186cb",
    "./src/glimpses.js?v=r243-79e75c3186cb",
    "./src/glimpse-render.js?v=r243-79e75c3186cb",
    "./src/glimpse-paint.js?v=r243-79e75c3186cb",
    "./src/glimpse-scenes.js?v=r243-79e75c3186cb",
    "./src/glimpse-horror.js?v=r243-79e75c3186cb",
    "./src/glimpse-legend.js?v=r243-79e75c3186cb",
    "./src/glimpse-hand.js?v=r243-79e75c3186cb",
    "./src/atlas-view.js?v=r243-79e75c3186cb",
    "./src/strange.js?v=r243-79e75c3186cb",
    "./src/linked-dungeons.js?v=r243-79e75c3186cb",
    "./src/digging.js?v=r243-79e75c3186cb",
    "./src/tyrant-hunt.js?v=r243-79e75c3186cb",
    "./src/world-beasts.js?v=r243-79e75c3186cb",
    "./src/elders.js?v=r243-79e75c3186cb",
    "./src/far-array.js?v=r243-79e75c3186cb",
    "./src/combat-visuals.js?v=r243-79e75c3186cb",
    "./src/dungeon-framework.js?v=r243-79e75c3186cb",
    "./src/elites.js?v=r243-79e75c3186cb",
    "./src/random.js?v=r243-79e75c3186cb",
    "./src/types.js?v=r243-79e75c3186cb",
    "./src/story.js?v=r243-79e75c3186cb",
    "./src/foundry.js?v=r243-79e75c3186cb",
    "./src/world.js?v=r243-79e75c3186cb",
    "./src/deep-dungeons.js?v=r243-79e75c3186cb",
    "./src/scenes.js?v=r243-79e75c3186cb",
    "./src/arenas.js?v=r243-79e75c3186cb",
    "./src/items.js?v=r243-79e75c3186cb",
    "./src/combat.js?v=r243-79e75c3186cb",
    "./src/interactions.js?v=r243-79e75c3186cb",
    "./src/persistence.js?v=r243-79e75c3186cb",
    "./src/input.js?v=r243-79e75c3186cb",
    "./src/game.js?v=r243-79e75c3186cb",
    "./src/renderer.js?v=r243-79e75c3186cb",
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
