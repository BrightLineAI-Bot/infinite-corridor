const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/proving-ground.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/proving-ground-fixtures.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/proving-ground-labs.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/dungeon-variation.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/dungeon-completion.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/enemy-patterns.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/monster-pack.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/monster-render.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/landscape.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/landscape-render.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/underlands.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/pattern-dungeons.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/relay-network.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/glyphs.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/echoes.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/constellation.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/water-traversal.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/boats.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/sea-creatures.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/diving.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/grottoes.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/spell-slots.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/settlements.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/skirmishes.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/travelers.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/questing-beast.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/recitations.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/far-array.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/combat-visuals.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/dungeon-framework.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/elites.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/random.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/types.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/story.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/foundry.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/world.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/deep-dungeons.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/scenes.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/arenas.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/items.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/combat.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/interactions.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/persistence.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/input.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/game.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
    "./src/renderer.js?v=icp_0a9645d3fa934d1ca5fdcddd_635907827d14749b",
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
