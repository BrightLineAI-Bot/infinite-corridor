const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/proving-ground.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/proving-ground-fixtures.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/proving-ground-labs.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/dungeon-variation.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/dungeon-completion.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/enemy-patterns.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/monster-pack.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/monster-render.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/landscape.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/landscape-render.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/underlands.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/relay-network.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/glyphs.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/echoes.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/constellation.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/combat-visuals.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/dungeon-framework.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/elites.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/random.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/types.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/story.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/foundry.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/world.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/deep-dungeons.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/scenes.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/arenas.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/items.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/combat.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/interactions.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/persistence.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/input.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/game.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
    "./src/renderer.js?v=icp_8140e9d8175a4d99b73a6c5a_2f558fed10229e4c",
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
