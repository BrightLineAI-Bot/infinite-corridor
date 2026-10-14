const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v98`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=98",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=98",
    "./src/proving-ground.js?v=98",
    "./src/proving-ground-fixtures.js?v=98",
    "./src/proving-ground-labs.js?v=98",
    "./src/dungeon-variation.js?v=98",
    "./src/dungeon-completion.js?v=98",
    "./src/enemy-patterns.js?v=98",
    "./src/monster-pack.js?v=98",
    "./src/monster-render.js?v=98",
    "./src/landscape.js?v=98",
    "./src/landscape-render.js?v=98",
    "./src/underlands.js?v=98",
    "./src/relay-network.js?v=98",
    "./src/glyphs.js?v=98",
    "./src/combat-visuals.js?v=98",
    "./src/dungeon-framework.js?v=98",
    "./src/elites.js?v=98",
    "./src/random.js?v=98",
    "./src/types.js?v=98",
    "./src/story.js?v=98",
    "./src/foundry.js?v=98",
    "./src/world.js?v=98",
    "./src/deep-dungeons.js?v=98",
    "./src/scenes.js?v=98",
    "./src/arenas.js?v=98",
    "./src/items.js?v=98",
    "./src/combat.js?v=98",
    "./src/interactions.js?v=98",
    "./src/persistence.js?v=98",
    "./src/input.js?v=98",
    "./src/game.js?v=98",
    "./src/renderer.js?v=98",
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
