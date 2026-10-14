const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_a18f802afc054be48f46d2a2_21c5a25d47de672d`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/proving-ground.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/proving-ground-fixtures.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/proving-ground-labs.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/dungeon-variation.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/dungeon-completion.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/enemy-patterns.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/monster-pack.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/monster-render.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/landscape.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/landscape-render.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/underlands.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/relay-network.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/glyphs.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/echoes.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/combat-visuals.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/dungeon-framework.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/elites.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/random.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/types.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/story.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/foundry.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/world.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/deep-dungeons.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/scenes.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/arenas.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/items.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/combat.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/interactions.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/persistence.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/input.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/game.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
    "./src/renderer.js?v=icp_a18f802afc054be48f46d2a2_21c5a25d47de672d",
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
