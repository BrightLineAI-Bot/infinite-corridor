const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/proving-ground.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/proving-ground-fixtures.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/proving-ground-labs.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/dungeon-variation.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/dungeon-completion.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/enemy-patterns.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/monster-pack.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/monster-render.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/landscape.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/landscape-render.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/combat-visuals.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/dungeon-framework.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/elites.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/random.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/types.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/story.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/foundry.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/world.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/deep-dungeons.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/scenes.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/arenas.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/items.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/combat.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/interactions.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/persistence.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/input.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/game.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
    "./src/renderer.js?v=icp_92a01abb26964cd093341bed_0066b5ff71ff3d9c",
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
