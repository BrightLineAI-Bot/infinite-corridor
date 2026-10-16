const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/proving-ground.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/proving-ground-fixtures.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/proving-ground-labs.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/dungeon-variation.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/dungeon-completion.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/enemy-patterns.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/monster-pack.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/monster-render.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/landscape.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/landscape-render.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/underlands.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/relay-network.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/glyphs.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/echoes.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/constellation.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/water-traversal.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/boats.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/sea-creatures.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/diving.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/grottoes.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/spell-slots.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/settlements.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/skirmishes.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/travelers.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/questing-beast.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/recitations.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/combat-visuals.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/dungeon-framework.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/elites.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/random.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/types.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/story.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/foundry.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/world.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/deep-dungeons.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/scenes.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/arenas.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/items.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/combat.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/interactions.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/persistence.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/input.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/game.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
    "./src/renderer.js?v=icp_4f5a763ef11d445ab8f79a2a_2d66b7853d855fb9",
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
