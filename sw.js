const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v213`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=213",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=213",
    "./src/proving-ground.js?v=213",
    "./src/proving-ground-fixtures.js?v=213",
    "./src/proving-ground-labs.js?v=213",
    "./src/dungeon-variation.js?v=213",
    "./src/dungeon-completion.js?v=213",
    "./src/enemy-patterns.js?v=213",
    "./src/monster-pack.js?v=213",
    "./src/monster-render.js?v=213",
    "./src/landscape.js?v=213",
    "./src/landscape-render.js?v=213",
    "./src/underlands.js?v=213",
    "./src/pattern-dungeons.js?v=213",
    "./src/relay-network.js?v=213",
    "./src/glyphs.js?v=213",
    "./src/echoes.js?v=213",
    "./src/constellation.js?v=213",
    "./src/water-traversal.js?v=213",
    "./src/open-sea.js?v=213",
    "./src/boats.js?v=213",
    "./src/sea-creatures.js?v=213",
    "./src/diving.js?v=213",
    "./src/grottoes.js?v=213",
    "./src/spell-slots.js?v=213",
    "./src/settlements.js?v=213",
    "./src/skirmishes.js?v=213",
    "./src/travelers.js?v=213",
    "./src/diagnostic-probe.js?v=213",
    "./src/questing-beast.js?v=213",
    "./src/recitations.js?v=213",
    "./src/lore.js?v=213",
    "./src/glimpses.js?v=213",
    "./src/glimpse-render.js?v=213",
    "./src/glimpse-paint.js?v=213",
    "./src/glimpse-scenes.js?v=213",
    "./src/glimpse-horror.js?v=213",
    "./src/atlas-view.js?v=213",
    "./src/elders.js?v=213",
    "./src/far-array.js?v=213",
    "./src/combat-visuals.js?v=213",
    "./src/dungeon-framework.js?v=213",
    "./src/elites.js?v=213",
    "./src/random.js?v=213",
    "./src/types.js?v=213",
    "./src/story.js?v=213",
    "./src/foundry.js?v=213",
    "./src/world.js?v=213",
    "./src/deep-dungeons.js?v=213",
    "./src/scenes.js?v=213",
    "./src/arenas.js?v=213",
    "./src/items.js?v=213",
    "./src/combat.js?v=213",
    "./src/interactions.js?v=213",
    "./src/persistence.js?v=213",
    "./src/input.js?v=213",
    "./src/game.js?v=213",
    "./src/renderer.js?v=213",
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
