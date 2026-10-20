const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v239`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=239",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=239",
    "./src/proving-ground.js?v=239",
    "./src/proving-ground-fixtures.js?v=239",
    "./src/proving-ground-labs.js?v=239",
    "./src/dungeon-variation.js?v=239",
    "./src/dungeon-completion.js?v=239",
    "./src/enemy-patterns.js?v=239",
    "./src/monster-pack.js?v=239",
    "./src/monster-render.js?v=239",
    "./src/landscape.js?v=239",
    "./src/landscape-render.js?v=239",
    "./src/underlands.js?v=239",
    "./src/pattern-dungeons.js?v=239",
    "./src/relay-network.js?v=239",
    "./src/glyphs.js?v=239",
    "./src/echoes.js?v=239",
    "./src/constellation.js?v=239",
    "./src/water-traversal.js?v=239",
    "./src/open-sea.js?v=239",
    "./src/boats.js?v=239",
    "./src/sea-creatures.js?v=239",
    "./src/diving.js?v=239",
    "./src/grottoes.js?v=239",
    "./src/spell-slots.js?v=239",
    "./src/settlements.js?v=239",
    "./src/skirmishes.js?v=239",
    "./src/travelers.js?v=239",
    "./src/diagnostic-probe.js?v=239",
    "./src/questing-beast.js?v=239",
    "./src/recitations.js?v=239",
    "./src/lore.js?v=239",
    "./src/glimpses.js?v=239",
    "./src/glimpse-render.js?v=239",
    "./src/glimpse-paint.js?v=239",
    "./src/glimpse-scenes.js?v=239",
    "./src/glimpse-horror.js?v=239",
    "./src/glimpse-legend.js?v=239",
    "./src/glimpse-hand.js?v=239",
    "./src/atlas-view.js?v=239",
    "./src/strange.js?v=239",
    "./src/linked-dungeons.js?v=239",
    "./src/digging.js?v=239",
    "./src/tyrant-hunt.js?v=239",
    "./src/world-beasts.js?v=239",
    "./src/elders.js?v=239",
    "./src/far-array.js?v=239",
    "./src/combat-visuals.js?v=239",
    "./src/dungeon-framework.js?v=239",
    "./src/elites.js?v=239",
    "./src/random.js?v=239",
    "./src/types.js?v=239",
    "./src/story.js?v=239",
    "./src/foundry.js?v=239",
    "./src/world.js?v=239",
    "./src/deep-dungeons.js?v=239",
    "./src/scenes.js?v=239",
    "./src/arenas.js?v=239",
    "./src/items.js?v=239",
    "./src/combat.js?v=239",
    "./src/interactions.js?v=239",
    "./src/persistence.js?v=239",
    "./src/input.js?v=239",
    "./src/game.js?v=239",
    "./src/renderer.js?v=239",
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
