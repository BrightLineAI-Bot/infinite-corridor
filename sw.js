const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r205-e14f762ffe4d`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r205-e14f762ffe4d",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r205-e14f762ffe4d",
    "./src/proving-ground.js?v=r205-e14f762ffe4d",
    "./src/proving-ground-fixtures.js?v=r205-e14f762ffe4d",
    "./src/proving-ground-labs.js?v=r205-e14f762ffe4d",
    "./src/dungeon-variation.js?v=r205-e14f762ffe4d",
    "./src/dungeon-completion.js?v=r205-e14f762ffe4d",
    "./src/enemy-patterns.js?v=r205-e14f762ffe4d",
    "./src/monster-pack.js?v=r205-e14f762ffe4d",
    "./src/monster-render.js?v=r205-e14f762ffe4d",
    "./src/landscape.js?v=r205-e14f762ffe4d",
    "./src/landscape-render.js?v=r205-e14f762ffe4d",
    "./src/underlands.js?v=r205-e14f762ffe4d",
    "./src/pattern-dungeons.js?v=r205-e14f762ffe4d",
    "./src/relay-network.js?v=r205-e14f762ffe4d",
    "./src/glyphs.js?v=r205-e14f762ffe4d",
    "./src/echoes.js?v=r205-e14f762ffe4d",
    "./src/constellation.js?v=r205-e14f762ffe4d",
    "./src/water-traversal.js?v=r205-e14f762ffe4d",
    "./src/open-sea.js?v=r205-e14f762ffe4d",
    "./src/boats.js?v=r205-e14f762ffe4d",
    "./src/sea-creatures.js?v=r205-e14f762ffe4d",
    "./src/diving.js?v=r205-e14f762ffe4d",
    "./src/grottoes.js?v=r205-e14f762ffe4d",
    "./src/spell-slots.js?v=r205-e14f762ffe4d",
    "./src/settlements.js?v=r205-e14f762ffe4d",
    "./src/skirmishes.js?v=r205-e14f762ffe4d",
    "./src/travelers.js?v=r205-e14f762ffe4d",
    "./src/diagnostic-probe.js?v=r205-e14f762ffe4d",
    "./src/questing-beast.js?v=r205-e14f762ffe4d",
    "./src/recitations.js?v=r205-e14f762ffe4d",
    "./src/lore.js?v=r205-e14f762ffe4d",
    "./src/glimpses.js?v=r205-e14f762ffe4d",
    "./src/glimpse-render.js?v=r205-e14f762ffe4d",
    "./src/glimpse-paint.js?v=r205-e14f762ffe4d",
    "./src/glimpse-scenes.js?v=r205-e14f762ffe4d",
    "./src/glimpse-horror.js?v=r205-e14f762ffe4d",
    "./src/atlas-view.js?v=r205-e14f762ffe4d",
    "./src/elders.js?v=r205-e14f762ffe4d",
    "./src/far-array.js?v=r205-e14f762ffe4d",
    "./src/combat-visuals.js?v=r205-e14f762ffe4d",
    "./src/dungeon-framework.js?v=r205-e14f762ffe4d",
    "./src/elites.js?v=r205-e14f762ffe4d",
    "./src/random.js?v=r205-e14f762ffe4d",
    "./src/types.js?v=r205-e14f762ffe4d",
    "./src/story.js?v=r205-e14f762ffe4d",
    "./src/foundry.js?v=r205-e14f762ffe4d",
    "./src/world.js?v=r205-e14f762ffe4d",
    "./src/deep-dungeons.js?v=r205-e14f762ffe4d",
    "./src/scenes.js?v=r205-e14f762ffe4d",
    "./src/arenas.js?v=r205-e14f762ffe4d",
    "./src/items.js?v=r205-e14f762ffe4d",
    "./src/combat.js?v=r205-e14f762ffe4d",
    "./src/interactions.js?v=r205-e14f762ffe4d",
    "./src/persistence.js?v=r205-e14f762ffe4d",
    "./src/input.js?v=r205-e14f762ffe4d",
    "./src/game.js?v=r205-e14f762ffe4d",
    "./src/renderer.js?v=r205-e14f762ffe4d",
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
