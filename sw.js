const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/proving-ground.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/proving-ground-fixtures.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/proving-ground-labs.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/dungeon-variation.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/dungeon-completion.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/enemy-patterns.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/monster-pack.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/monster-render.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/landscape.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/landscape-render.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/underlands.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/pattern-dungeons.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/relay-network.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/glyphs.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/echoes.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/constellation.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/water-traversal.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/open-sea.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/boats.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/sea-creatures.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/diving.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/grottoes.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/spell-slots.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/settlements.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/skirmishes.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/travelers.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/diagnostic-probe.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/questing-beast.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/recitations.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/far-array.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/combat-visuals.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/dungeon-framework.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/elites.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/random.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/types.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/story.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/foundry.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/world.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/deep-dungeons.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/scenes.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/arenas.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/items.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/combat.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/interactions.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/persistence.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/input.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/game.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
    "./src/renderer.js?v=icp_8b8c9160c4e74af2a537d919_cfb0bbaab605f8aa",
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
