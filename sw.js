const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v99`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=99",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=99",
    "./src/proving-ground.js?v=99",
    "./src/proving-ground-fixtures.js?v=99",
    "./src/proving-ground-labs.js?v=99",
    "./src/dungeon-variation.js?v=99",
    "./src/dungeon-completion.js?v=99",
    "./src/enemy-patterns.js?v=99",
    "./src/monster-pack.js?v=99",
    "./src/monster-render.js?v=99",
    "./src/landscape.js?v=99",
    "./src/landscape-render.js?v=99",
    "./src/underlands.js?v=99",
    "./src/relay-network.js?v=99",
    "./src/glyphs.js?v=99",
    "./src/echoes.js?v=99",
    "./src/combat-visuals.js?v=99",
    "./src/dungeon-framework.js?v=99",
    "./src/elites.js?v=99",
    "./src/random.js?v=99",
    "./src/types.js?v=99",
    "./src/story.js?v=99",
    "./src/foundry.js?v=99",
    "./src/world.js?v=99",
    "./src/deep-dungeons.js?v=99",
    "./src/scenes.js?v=99",
    "./src/arenas.js?v=99",
    "./src/items.js?v=99",
    "./src/combat.js?v=99",
    "./src/interactions.js?v=99",
    "./src/persistence.js?v=99",
    "./src/input.js?v=99",
    "./src/game.js?v=99",
    "./src/renderer.js?v=99",
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
