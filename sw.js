const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v97`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=97",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=97",
    "./src/proving-ground.js?v=97",
    "./src/proving-ground-fixtures.js?v=97",
    "./src/proving-ground-labs.js?v=97",
    "./src/dungeon-variation.js?v=97",
    "./src/dungeon-completion.js?v=97",
    "./src/enemy-patterns.js?v=97",
    "./src/monster-pack.js?v=97",
    "./src/monster-render.js?v=97",
    "./src/landscape.js?v=97",
    "./src/landscape-render.js?v=97",
    "./src/underlands.js?v=97",
    "./src/relay-network.js?v=97",
    "./src/combat-visuals.js?v=97",
    "./src/dungeon-framework.js?v=97",
    "./src/elites.js?v=97",
    "./src/random.js?v=97",
    "./src/types.js?v=97",
    "./src/story.js?v=97",
    "./src/foundry.js?v=97",
    "./src/world.js?v=97",
    "./src/deep-dungeons.js?v=97",
    "./src/scenes.js?v=97",
    "./src/arenas.js?v=97",
    "./src/items.js?v=97",
    "./src/combat.js?v=97",
    "./src/interactions.js?v=97",
    "./src/persistence.js?v=97",
    "./src/input.js?v=97",
    "./src/game.js?v=97",
    "./src/renderer.js?v=97",
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
