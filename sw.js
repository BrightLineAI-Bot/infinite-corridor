const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v177`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=177",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=177",
    "./src/proving-ground.js?v=177",
    "./src/proving-ground-fixtures.js?v=177",
    "./src/proving-ground-labs.js?v=177",
    "./src/dungeon-variation.js?v=177",
    "./src/dungeon-completion.js?v=177",
    "./src/enemy-patterns.js?v=177",
    "./src/monster-pack.js?v=177",
    "./src/monster-render.js?v=177",
    "./src/landscape.js?v=177",
    "./src/landscape-render.js?v=177",
    "./src/underlands.js?v=177",
    "./src/pattern-dungeons.js?v=177",
    "./src/relay-network.js?v=177",
    "./src/glyphs.js?v=177",
    "./src/echoes.js?v=177",
    "./src/constellation.js?v=177",
    "./src/water-traversal.js?v=177",
    "./src/open-sea.js?v=177",
    "./src/boats.js?v=177",
    "./src/sea-creatures.js?v=177",
    "./src/diving.js?v=177",
    "./src/grottoes.js?v=177",
    "./src/spell-slots.js?v=177",
    "./src/settlements.js?v=177",
    "./src/skirmishes.js?v=177",
    "./src/travelers.js?v=177",
    "./src/diagnostic-probe.js?v=177",
    "./src/questing-beast.js?v=177",
    "./src/recitations.js?v=177",
    "./src/far-array.js?v=177",
    "./src/combat-visuals.js?v=177",
    "./src/dungeon-framework.js?v=177",
    "./src/elites.js?v=177",
    "./src/random.js?v=177",
    "./src/types.js?v=177",
    "./src/story.js?v=177",
    "./src/foundry.js?v=177",
    "./src/world.js?v=177",
    "./src/deep-dungeons.js?v=177",
    "./src/scenes.js?v=177",
    "./src/arenas.js?v=177",
    "./src/items.js?v=177",
    "./src/combat.js?v=177",
    "./src/interactions.js?v=177",
    "./src/persistence.js?v=177",
    "./src/input.js?v=177",
    "./src/game.js?v=177",
    "./src/renderer.js?v=177",
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
