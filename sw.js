const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v197`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=197",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=197",
    "./src/proving-ground.js?v=197",
    "./src/proving-ground-fixtures.js?v=197",
    "./src/proving-ground-labs.js?v=197",
    "./src/dungeon-variation.js?v=197",
    "./src/dungeon-completion.js?v=197",
    "./src/enemy-patterns.js?v=197",
    "./src/monster-pack.js?v=197",
    "./src/monster-render.js?v=197",
    "./src/landscape.js?v=197",
    "./src/landscape-render.js?v=197",
    "./src/underlands.js?v=197",
    "./src/pattern-dungeons.js?v=197",
    "./src/relay-network.js?v=197",
    "./src/glyphs.js?v=197",
    "./src/echoes.js?v=197",
    "./src/constellation.js?v=197",
    "./src/water-traversal.js?v=197",
    "./src/open-sea.js?v=197",
    "./src/boats.js?v=197",
    "./src/sea-creatures.js?v=197",
    "./src/diving.js?v=197",
    "./src/grottoes.js?v=197",
    "./src/spell-slots.js?v=197",
    "./src/settlements.js?v=197",
    "./src/skirmishes.js?v=197",
    "./src/travelers.js?v=197",
    "./src/diagnostic-probe.js?v=197",
    "./src/questing-beast.js?v=197",
    "./src/recitations.js?v=197",
    "./src/lore.js?v=197",
    "./src/glimpses.js?v=197",
    "./src/glimpse-render.js?v=197",
    "./src/elders.js?v=197",
    "./src/far-array.js?v=197",
    "./src/combat-visuals.js?v=197",
    "./src/dungeon-framework.js?v=197",
    "./src/elites.js?v=197",
    "./src/random.js?v=197",
    "./src/types.js?v=197",
    "./src/story.js?v=197",
    "./src/foundry.js?v=197",
    "./src/world.js?v=197",
    "./src/deep-dungeons.js?v=197",
    "./src/scenes.js?v=197",
    "./src/arenas.js?v=197",
    "./src/items.js?v=197",
    "./src/combat.js?v=197",
    "./src/interactions.js?v=197",
    "./src/persistence.js?v=197",
    "./src/input.js?v=197",
    "./src/game.js?v=197",
    "./src/renderer.js?v=197",
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
