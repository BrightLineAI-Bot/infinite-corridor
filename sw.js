const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v156`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=156",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=156",
    "./src/proving-ground.js?v=156",
    "./src/proving-ground-fixtures.js?v=156",
    "./src/proving-ground-labs.js?v=156",
    "./src/dungeon-variation.js?v=156",
    "./src/dungeon-completion.js?v=156",
    "./src/enemy-patterns.js?v=156",
    "./src/monster-pack.js?v=156",
    "./src/monster-render.js?v=156",
    "./src/landscape.js?v=156",
    "./src/landscape-render.js?v=156",
    "./src/underlands.js?v=156",
    "./src/pattern-dungeons.js?v=156",
    "./src/relay-network.js?v=156",
    "./src/glyphs.js?v=156",
    "./src/echoes.js?v=156",
    "./src/constellation.js?v=156",
    "./src/water-traversal.js?v=156",
    "./src/open-sea.js?v=156",
    "./src/boats.js?v=156",
    "./src/sea-creatures.js?v=156",
    "./src/diving.js?v=156",
    "./src/grottoes.js?v=156",
    "./src/spell-slots.js?v=156",
    "./src/settlements.js?v=156",
    "./src/skirmishes.js?v=156",
    "./src/travelers.js?v=156",
    "./src/questing-beast.js?v=156",
    "./src/recitations.js?v=156",
    "./src/far-array.js?v=156",
    "./src/combat-visuals.js?v=156",
    "./src/dungeon-framework.js?v=156",
    "./src/elites.js?v=156",
    "./src/random.js?v=156",
    "./src/types.js?v=156",
    "./src/story.js?v=156",
    "./src/foundry.js?v=156",
    "./src/world.js?v=156",
    "./src/deep-dungeons.js?v=156",
    "./src/scenes.js?v=156",
    "./src/arenas.js?v=156",
    "./src/items.js?v=156",
    "./src/combat.js?v=156",
    "./src/interactions.js?v=156",
    "./src/persistence.js?v=156",
    "./src/input.js?v=156",
    "./src/game.js?v=156",
    "./src/renderer.js?v=156",
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
