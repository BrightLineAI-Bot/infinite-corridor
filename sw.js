const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/proving-ground.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/proving-ground-fixtures.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/proving-ground-labs.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/dungeon-variation.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/dungeon-completion.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/enemy-patterns.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/monster-pack.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/monster-render.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/landscape.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/landscape-render.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/underlands.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/pattern-dungeons.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/relay-network.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/glyphs.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/echoes.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/constellation.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/water-traversal.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/open-sea.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/boats.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/sea-creatures.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/diving.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/grottoes.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/spell-slots.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/settlements.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/skirmishes.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/travelers.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/diagnostic-probe.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/questing-beast.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/recitations.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/far-array.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/combat-visuals.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/dungeon-framework.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/elites.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/random.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/types.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/story.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/foundry.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/world.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/deep-dungeons.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/scenes.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/arenas.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/items.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/combat.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/interactions.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/persistence.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/input.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/game.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
    "./src/renderer.js?v=icp_8df748cdb8aa48bbbd16b142_d1d456e64ebada9e",
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
