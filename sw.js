const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/proving-ground.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/proving-ground-fixtures.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/proving-ground-labs.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/dungeon-variation.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/dungeon-completion.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/enemy-patterns.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/monster-pack.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/monster-render.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/landscape.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/landscape-render.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/underlands.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/relay-network.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/glyphs.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/echoes.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/constellation.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/water-traversal.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/boats.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/sea-creatures.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/diving.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/grottoes.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/spell-slots.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/settlements.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/skirmishes.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/travelers.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/questing-beast.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/recitations.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/combat-visuals.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/dungeon-framework.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/elites.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/random.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/types.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/story.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/foundry.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/world.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/deep-dungeons.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/scenes.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/arenas.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/items.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/combat.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/interactions.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/persistence.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/input.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/game.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
    "./src/renderer.js?v=icp_d7a4fad848df411993c4cada_8dbb68b4d8051bab",
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
