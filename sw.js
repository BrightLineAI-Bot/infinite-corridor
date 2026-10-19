const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v209`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=209",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=209",
    "./src/proving-ground.js?v=209",
    "./src/proving-ground-fixtures.js?v=209",
    "./src/proving-ground-labs.js?v=209",
    "./src/dungeon-variation.js?v=209",
    "./src/dungeon-completion.js?v=209",
    "./src/enemy-patterns.js?v=209",
    "./src/monster-pack.js?v=209",
    "./src/monster-render.js?v=209",
    "./src/landscape.js?v=209",
    "./src/landscape-render.js?v=209",
    "./src/underlands.js?v=209",
    "./src/pattern-dungeons.js?v=209",
    "./src/relay-network.js?v=209",
    "./src/glyphs.js?v=209",
    "./src/echoes.js?v=209",
    "./src/constellation.js?v=209",
    "./src/water-traversal.js?v=209",
    "./src/open-sea.js?v=209",
    "./src/boats.js?v=209",
    "./src/sea-creatures.js?v=209",
    "./src/diving.js?v=209",
    "./src/grottoes.js?v=209",
    "./src/spell-slots.js?v=209",
    "./src/settlements.js?v=209",
    "./src/skirmishes.js?v=209",
    "./src/travelers.js?v=209",
    "./src/diagnostic-probe.js?v=209",
    "./src/questing-beast.js?v=209",
    "./src/recitations.js?v=209",
    "./src/lore.js?v=209",
    "./src/glimpses.js?v=209",
    "./src/glimpse-render.js?v=209",
    "./src/glimpse-paint.js?v=209",
    "./src/glimpse-scenes.js?v=209",
    "./src/glimpse-horror.js?v=209",
    "./src/atlas-view.js?v=209",
    "./src/elders.js?v=209",
    "./src/far-array.js?v=209",
    "./src/combat-visuals.js?v=209",
    "./src/dungeon-framework.js?v=209",
    "./src/elites.js?v=209",
    "./src/random.js?v=209",
    "./src/types.js?v=209",
    "./src/story.js?v=209",
    "./src/foundry.js?v=209",
    "./src/world.js?v=209",
    "./src/deep-dungeons.js?v=209",
    "./src/scenes.js?v=209",
    "./src/arenas.js?v=209",
    "./src/items.js?v=209",
    "./src/combat.js?v=209",
    "./src/interactions.js?v=209",
    "./src/persistence.js?v=209",
    "./src/input.js?v=209",
    "./src/game.js?v=209",
    "./src/renderer.js?v=209",
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
