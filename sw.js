const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v203`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=203",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=203",
    "./src/proving-ground.js?v=203",
    "./src/proving-ground-fixtures.js?v=203",
    "./src/proving-ground-labs.js?v=203",
    "./src/dungeon-variation.js?v=203",
    "./src/dungeon-completion.js?v=203",
    "./src/enemy-patterns.js?v=203",
    "./src/monster-pack.js?v=203",
    "./src/monster-render.js?v=203",
    "./src/landscape.js?v=203",
    "./src/landscape-render.js?v=203",
    "./src/underlands.js?v=203",
    "./src/pattern-dungeons.js?v=203",
    "./src/relay-network.js?v=203",
    "./src/glyphs.js?v=203",
    "./src/echoes.js?v=203",
    "./src/constellation.js?v=203",
    "./src/water-traversal.js?v=203",
    "./src/open-sea.js?v=203",
    "./src/boats.js?v=203",
    "./src/sea-creatures.js?v=203",
    "./src/diving.js?v=203",
    "./src/grottoes.js?v=203",
    "./src/spell-slots.js?v=203",
    "./src/settlements.js?v=203",
    "./src/skirmishes.js?v=203",
    "./src/travelers.js?v=203",
    "./src/diagnostic-probe.js?v=203",
    "./src/questing-beast.js?v=203",
    "./src/recitations.js?v=203",
    "./src/lore.js?v=203",
    "./src/glimpses.js?v=203",
    "./src/glimpse-render.js?v=203",
    "./src/glimpse-paint.js?v=203",
    "./src/glimpse-scenes.js?v=203",
    "./src/glimpse-horror.js?v=203",
    "./src/elders.js?v=203",
    "./src/far-array.js?v=203",
    "./src/combat-visuals.js?v=203",
    "./src/dungeon-framework.js?v=203",
    "./src/elites.js?v=203",
    "./src/random.js?v=203",
    "./src/types.js?v=203",
    "./src/story.js?v=203",
    "./src/foundry.js?v=203",
    "./src/world.js?v=203",
    "./src/deep-dungeons.js?v=203",
    "./src/scenes.js?v=203",
    "./src/arenas.js?v=203",
    "./src/items.js?v=203",
    "./src/combat.js?v=203",
    "./src/interactions.js?v=203",
    "./src/persistence.js?v=203",
    "./src/input.js?v=203",
    "./src/game.js?v=203",
    "./src/renderer.js?v=203",
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
