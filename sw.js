const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v132`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=132",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=132",
    "./src/proving-ground.js?v=132",
    "./src/proving-ground-fixtures.js?v=132",
    "./src/proving-ground-labs.js?v=132",
    "./src/dungeon-variation.js?v=132",
    "./src/dungeon-completion.js?v=132",
    "./src/enemy-patterns.js?v=132",
    "./src/monster-pack.js?v=132",
    "./src/monster-render.js?v=132",
    "./src/landscape.js?v=132",
    "./src/landscape-render.js?v=132",
    "./src/underlands.js?v=132",
    "./src/relay-network.js?v=132",
    "./src/glyphs.js?v=132",
    "./src/echoes.js?v=132",
    "./src/constellation.js?v=132",
    "./src/water-traversal.js?v=132",
    "./src/boats.js?v=132",
    "./src/sea-creatures.js?v=132",
    "./src/diving.js?v=132",
    "./src/grottoes.js?v=132",
    "./src/spell-slots.js?v=132",
    "./src/settlements.js?v=132",
    "./src/skirmishes.js?v=132",
    "./src/travelers.js?v=132",
    "./src/questing-beast.js?v=132",
    "./src/recitations.js?v=132",
    "./src/combat-visuals.js?v=132",
    "./src/dungeon-framework.js?v=132",
    "./src/elites.js?v=132",
    "./src/random.js?v=132",
    "./src/types.js?v=132",
    "./src/story.js?v=132",
    "./src/foundry.js?v=132",
    "./src/world.js?v=132",
    "./src/deep-dungeons.js?v=132",
    "./src/scenes.js?v=132",
    "./src/arenas.js?v=132",
    "./src/items.js?v=132",
    "./src/combat.js?v=132",
    "./src/interactions.js?v=132",
    "./src/persistence.js?v=132",
    "./src/input.js?v=132",
    "./src/game.js?v=132",
    "./src/renderer.js?v=132",
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
