const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_9665052a29b745e2b0286653_647b4703d70cfc12`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/proving-ground.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/proving-ground-fixtures.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/proving-ground-labs.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/dungeon-variation.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/dungeon-completion.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/enemy-patterns.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/monster-pack.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/monster-render.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/landscape.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/landscape-render.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/underlands.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/relay-network.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/glyphs.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/echoes.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/constellation.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/water-traversal.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/boats.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/sea-creatures.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/diving.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/combat-visuals.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/dungeon-framework.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/elites.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/random.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/types.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/story.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/foundry.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/world.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/deep-dungeons.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/scenes.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/arenas.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/items.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/combat.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/interactions.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/persistence.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/input.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/game.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
    "./src/renderer.js?v=icp_9665052a29b745e2b0286653_647b4703d70cfc12",
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
