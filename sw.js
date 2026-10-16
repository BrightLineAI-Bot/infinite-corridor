const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/proving-ground.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/proving-ground-fixtures.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/proving-ground-labs.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/dungeon-variation.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/dungeon-completion.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/enemy-patterns.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/monster-pack.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/monster-render.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/landscape.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/landscape-render.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/underlands.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/relay-network.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/glyphs.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/echoes.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/constellation.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/water-traversal.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/boats.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/sea-creatures.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/diving.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/grottoes.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/spell-slots.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/settlements.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/skirmishes.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/travelers.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/questing-beast.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/recitations.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/combat-visuals.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/dungeon-framework.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/elites.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/random.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/types.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/story.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/foundry.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/world.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/deep-dungeons.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/scenes.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/arenas.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/items.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/combat.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/interactions.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/persistence.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/input.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/game.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
    "./src/renderer.js?v=icp_0921363f3c5446a2918f2473_e0c6a52dfaf3f55f",
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
