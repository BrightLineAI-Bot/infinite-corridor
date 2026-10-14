const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_8ae1da129bee497d8b428f33_ffde5723a9be8583`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/proving-ground.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/proving-ground-fixtures.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/proving-ground-labs.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/dungeon-variation.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/dungeon-completion.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/enemy-patterns.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/monster-pack.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/monster-render.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/landscape.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/landscape-render.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/underlands.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/relay-network.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/glyphs.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/echoes.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/constellation.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/combat-visuals.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/dungeon-framework.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/elites.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/random.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/types.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/story.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/foundry.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/world.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/deep-dungeons.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/scenes.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/arenas.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/items.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/combat.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/interactions.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/persistence.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/input.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/game.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
    "./src/renderer.js?v=icp_8ae1da129bee497d8b428f33_ffde5723a9be8583",
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
