const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v130`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=130",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=130",
    "./src/proving-ground.js?v=130",
    "./src/proving-ground-fixtures.js?v=130",
    "./src/proving-ground-labs.js?v=130",
    "./src/dungeon-variation.js?v=130",
    "./src/dungeon-completion.js?v=130",
    "./src/enemy-patterns.js?v=130",
    "./src/monster-pack.js?v=130",
    "./src/monster-render.js?v=130",
    "./src/landscape.js?v=130",
    "./src/landscape-render.js?v=130",
    "./src/underlands.js?v=130",
    "./src/relay-network.js?v=130",
    "./src/glyphs.js?v=130",
    "./src/echoes.js?v=130",
    "./src/constellation.js?v=130",
    "./src/water-traversal.js?v=130",
    "./src/boats.js?v=130",
    "./src/sea-creatures.js?v=130",
    "./src/diving.js?v=130",
    "./src/grottoes.js?v=130",
    "./src/spell-slots.js?v=130",
    "./src/settlements.js?v=130",
    "./src/skirmishes.js?v=130",
    "./src/travelers.js?v=130",
    "./src/questing-beast.js?v=130",
    "./src/recitations.js?v=130",
    "./src/combat-visuals.js?v=130",
    "./src/dungeon-framework.js?v=130",
    "./src/elites.js?v=130",
    "./src/random.js?v=130",
    "./src/types.js?v=130",
    "./src/story.js?v=130",
    "./src/foundry.js?v=130",
    "./src/world.js?v=130",
    "./src/deep-dungeons.js?v=130",
    "./src/scenes.js?v=130",
    "./src/arenas.js?v=130",
    "./src/items.js?v=130",
    "./src/combat.js?v=130",
    "./src/interactions.js?v=130",
    "./src/persistence.js?v=130",
    "./src/input.js?v=130",
    "./src/game.js?v=130",
    "./src/renderer.js?v=130",
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
