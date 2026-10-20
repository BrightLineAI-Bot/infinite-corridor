const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r249-4a43f3ccc5cd`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r249-4a43f3ccc5cd",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r249-4a43f3ccc5cd",
    "./src/proving-ground.js?v=r249-4a43f3ccc5cd",
    "./src/proving-ground-fixtures.js?v=r249-4a43f3ccc5cd",
    "./src/proving-ground-labs.js?v=r249-4a43f3ccc5cd",
    "./src/dungeon-variation.js?v=r249-4a43f3ccc5cd",
    "./src/dungeon-completion.js?v=r249-4a43f3ccc5cd",
    "./src/enemy-patterns.js?v=r249-4a43f3ccc5cd",
    "./src/monster-pack.js?v=r249-4a43f3ccc5cd",
    "./src/monster-render.js?v=r249-4a43f3ccc5cd",
    "./src/landscape.js?v=r249-4a43f3ccc5cd",
    "./src/landscape-render.js?v=r249-4a43f3ccc5cd",
    "./src/underlands.js?v=r249-4a43f3ccc5cd",
    "./src/pattern-dungeons.js?v=r249-4a43f3ccc5cd",
    "./src/relay-network.js?v=r249-4a43f3ccc5cd",
    "./src/glyphs.js?v=r249-4a43f3ccc5cd",
    "./src/echoes.js?v=r249-4a43f3ccc5cd",
    "./src/constellation.js?v=r249-4a43f3ccc5cd",
    "./src/water-traversal.js?v=r249-4a43f3ccc5cd",
    "./src/open-sea.js?v=r249-4a43f3ccc5cd",
    "./src/boats.js?v=r249-4a43f3ccc5cd",
    "./src/sea-creatures.js?v=r249-4a43f3ccc5cd",
    "./src/diving.js?v=r249-4a43f3ccc5cd",
    "./src/grottoes.js?v=r249-4a43f3ccc5cd",
    "./src/spell-slots.js?v=r249-4a43f3ccc5cd",
    "./src/settlements.js?v=r249-4a43f3ccc5cd",
    "./src/skirmishes.js?v=r249-4a43f3ccc5cd",
    "./src/travelers.js?v=r249-4a43f3ccc5cd",
    "./src/diagnostic-probe.js?v=r249-4a43f3ccc5cd",
    "./src/questing-beast.js?v=r249-4a43f3ccc5cd",
    "./src/recitations.js?v=r249-4a43f3ccc5cd",
    "./src/lore.js?v=r249-4a43f3ccc5cd",
    "./src/glimpses.js?v=r249-4a43f3ccc5cd",
    "./src/glimpse-render.js?v=r249-4a43f3ccc5cd",
    "./src/glimpse-paint.js?v=r249-4a43f3ccc5cd",
    "./src/glimpse-scenes.js?v=r249-4a43f3ccc5cd",
    "./src/glimpse-horror.js?v=r249-4a43f3ccc5cd",
    "./src/glimpse-legend.js?v=r249-4a43f3ccc5cd",
    "./src/glimpse-hand.js?v=r249-4a43f3ccc5cd",
    "./src/atlas-view.js?v=r249-4a43f3ccc5cd",
    "./src/strange.js?v=r249-4a43f3ccc5cd",
    "./src/linked-dungeons.js?v=r249-4a43f3ccc5cd",
    "./src/digging.js?v=r249-4a43f3ccc5cd",
    "./src/tyrant-hunt.js?v=r249-4a43f3ccc5cd",
    "./src/world-beasts.js?v=r249-4a43f3ccc5cd",
    "./src/elders.js?v=r249-4a43f3ccc5cd",
    "./src/far-array.js?v=r249-4a43f3ccc5cd",
    "./src/combat-visuals.js?v=r249-4a43f3ccc5cd",
    "./src/dungeon-framework.js?v=r249-4a43f3ccc5cd",
    "./src/elites.js?v=r249-4a43f3ccc5cd",
    "./src/random.js?v=r249-4a43f3ccc5cd",
    "./src/types.js?v=r249-4a43f3ccc5cd",
    "./src/story.js?v=r249-4a43f3ccc5cd",
    "./src/foundry.js?v=r249-4a43f3ccc5cd",
    "./src/world.js?v=r249-4a43f3ccc5cd",
    "./src/deep-dungeons.js?v=r249-4a43f3ccc5cd",
    "./src/scenes.js?v=r249-4a43f3ccc5cd",
    "./src/arenas.js?v=r249-4a43f3ccc5cd",
    "./src/items.js?v=r249-4a43f3ccc5cd",
    "./src/combat.js?v=r249-4a43f3ccc5cd",
    "./src/interactions.js?v=r249-4a43f3ccc5cd",
    "./src/persistence.js?v=r249-4a43f3ccc5cd",
    "./src/input.js?v=r249-4a43f3ccc5cd",
    "./src/game.js?v=r249-4a43f3ccc5cd",
    "./src/renderer.js?v=r249-4a43f3ccc5cd",
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
