const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/proving-ground.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/proving-ground-fixtures.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/proving-ground-labs.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/dungeon-variation.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/dungeon-completion.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/enemy-patterns.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/monster-pack.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/monster-render.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/combat-visuals.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/dungeon-framework.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/elites.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/random.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/types.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/story.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/foundry.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/world.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/deep-dungeons.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/scenes.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/arenas.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/items.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/combat.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/interactions.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/persistence.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/input.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/game.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
    "./src/renderer.js?v=icp_0b5e99718bf84b26a83a5c3c_32fab184d7f06abb",
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
