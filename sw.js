const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v223`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=223",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=223",
    "./src/proving-ground.js?v=223",
    "./src/proving-ground-fixtures.js?v=223",
    "./src/proving-ground-labs.js?v=223",
    "./src/dungeon-variation.js?v=223",
    "./src/dungeon-completion.js?v=223",
    "./src/enemy-patterns.js?v=223",
    "./src/monster-pack.js?v=223",
    "./src/monster-render.js?v=223",
    "./src/landscape.js?v=223",
    "./src/landscape-render.js?v=223",
    "./src/underlands.js?v=223",
    "./src/pattern-dungeons.js?v=223",
    "./src/relay-network.js?v=223",
    "./src/glyphs.js?v=223",
    "./src/echoes.js?v=223",
    "./src/constellation.js?v=223",
    "./src/water-traversal.js?v=223",
    "./src/open-sea.js?v=223",
    "./src/boats.js?v=223",
    "./src/sea-creatures.js?v=223",
    "./src/diving.js?v=223",
    "./src/grottoes.js?v=223",
    "./src/spell-slots.js?v=223",
    "./src/settlements.js?v=223",
    "./src/skirmishes.js?v=223",
    "./src/travelers.js?v=223",
    "./src/diagnostic-probe.js?v=223",
    "./src/questing-beast.js?v=223",
    "./src/recitations.js?v=223",
    "./src/lore.js?v=223",
    "./src/glimpses.js?v=223",
    "./src/glimpse-render.js?v=223",
    "./src/glimpse-paint.js?v=223",
    "./src/glimpse-scenes.js?v=223",
    "./src/glimpse-horror.js?v=223",
    "./src/glimpse-legend.js?v=223",
    "./src/glimpse-hand.js?v=223",
    "./src/atlas-view.js?v=223",
    "./src/strange.js?v=223",
    "./src/linked-dungeons.js?v=223",
    "./src/elders.js?v=223",
    "./src/far-array.js?v=223",
    "./src/combat-visuals.js?v=223",
    "./src/dungeon-framework.js?v=223",
    "./src/elites.js?v=223",
    "./src/random.js?v=223",
    "./src/types.js?v=223",
    "./src/story.js?v=223",
    "./src/foundry.js?v=223",
    "./src/world.js?v=223",
    "./src/deep-dungeons.js?v=223",
    "./src/scenes.js?v=223",
    "./src/arenas.js?v=223",
    "./src/items.js?v=223",
    "./src/combat.js?v=223",
    "./src/interactions.js?v=223",
    "./src/persistence.js?v=223",
    "./src/input.js?v=223",
    "./src/game.js?v=223",
    "./src/renderer.js?v=223",
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
