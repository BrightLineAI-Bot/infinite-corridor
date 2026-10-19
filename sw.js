const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r187-ed31db743b84`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r187-ed31db743b84",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r187-ed31db743b84",
    "./src/proving-ground.js?v=r187-ed31db743b84",
    "./src/proving-ground-fixtures.js?v=r187-ed31db743b84",
    "./src/proving-ground-labs.js?v=r187-ed31db743b84",
    "./src/dungeon-variation.js?v=r187-ed31db743b84",
    "./src/dungeon-completion.js?v=r187-ed31db743b84",
    "./src/enemy-patterns.js?v=r187-ed31db743b84",
    "./src/monster-pack.js?v=r187-ed31db743b84",
    "./src/monster-render.js?v=r187-ed31db743b84",
    "./src/landscape.js?v=r187-ed31db743b84",
    "./src/landscape-render.js?v=r187-ed31db743b84",
    "./src/underlands.js?v=r187-ed31db743b84",
    "./src/pattern-dungeons.js?v=r187-ed31db743b84",
    "./src/relay-network.js?v=r187-ed31db743b84",
    "./src/glyphs.js?v=r187-ed31db743b84",
    "./src/echoes.js?v=r187-ed31db743b84",
    "./src/constellation.js?v=r187-ed31db743b84",
    "./src/water-traversal.js?v=r187-ed31db743b84",
    "./src/open-sea.js?v=r187-ed31db743b84",
    "./src/boats.js?v=r187-ed31db743b84",
    "./src/sea-creatures.js?v=r187-ed31db743b84",
    "./src/diving.js?v=r187-ed31db743b84",
    "./src/grottoes.js?v=r187-ed31db743b84",
    "./src/spell-slots.js?v=r187-ed31db743b84",
    "./src/settlements.js?v=r187-ed31db743b84",
    "./src/skirmishes.js?v=r187-ed31db743b84",
    "./src/travelers.js?v=r187-ed31db743b84",
    "./src/diagnostic-probe.js?v=r187-ed31db743b84",
    "./src/questing-beast.js?v=r187-ed31db743b84",
    "./src/recitations.js?v=r187-ed31db743b84",
    "./src/far-array.js?v=r187-ed31db743b84",
    "./src/combat-visuals.js?v=r187-ed31db743b84",
    "./src/dungeon-framework.js?v=r187-ed31db743b84",
    "./src/elites.js?v=r187-ed31db743b84",
    "./src/random.js?v=r187-ed31db743b84",
    "./src/types.js?v=r187-ed31db743b84",
    "./src/story.js?v=r187-ed31db743b84",
    "./src/foundry.js?v=r187-ed31db743b84",
    "./src/world.js?v=r187-ed31db743b84",
    "./src/deep-dungeons.js?v=r187-ed31db743b84",
    "./src/scenes.js?v=r187-ed31db743b84",
    "./src/arenas.js?v=r187-ed31db743b84",
    "./src/items.js?v=r187-ed31db743b84",
    "./src/combat.js?v=r187-ed31db743b84",
    "./src/interactions.js?v=r187-ed31db743b84",
    "./src/persistence.js?v=r187-ed31db743b84",
    "./src/input.js?v=r187-ed31db743b84",
    "./src/game.js?v=r187-ed31db743b84",
    "./src/renderer.js?v=r187-ed31db743b84",
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
