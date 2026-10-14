const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_43831da1c3364044bd6556e3_30c250040b3673c3`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/proving-ground.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/proving-ground-fixtures.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/proving-ground-labs.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/dungeon-variation.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/dungeon-completion.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/enemy-patterns.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/monster-pack.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/monster-render.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/landscape.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/landscape-render.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/underlands.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/relay-network.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/combat-visuals.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/dungeon-framework.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/elites.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/random.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/types.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/story.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/foundry.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/world.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/deep-dungeons.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/scenes.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/arenas.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/items.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/combat.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/interactions.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/persistence.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/input.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/game.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
    "./src/renderer.js?v=icp_43831da1c3364044bd6556e3_30c250040b3673c3",
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
