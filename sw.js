const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_47119428934e4c208050cff7_c61e8e8644cadbaf`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/proving-ground.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/proving-ground-fixtures.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/proving-ground-labs.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/dungeon-variation.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/dungeon-completion.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/enemy-patterns.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/monster-pack.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/monster-render.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/landscape.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/landscape-render.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/underlands.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/relay-network.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/glyphs.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/echoes.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/constellation.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/water-traversal.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/combat-visuals.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/dungeon-framework.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/elites.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/random.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/types.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/story.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/foundry.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/world.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/deep-dungeons.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/scenes.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/arenas.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/items.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/combat.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/interactions.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/persistence.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/input.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/game.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
    "./src/renderer.js?v=icp_47119428934e4c208050cff7_c61e8e8644cadbaf",
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
