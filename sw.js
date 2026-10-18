const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v187`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=187",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=187",
    "./src/proving-ground.js?v=187",
    "./src/proving-ground-fixtures.js?v=187",
    "./src/proving-ground-labs.js?v=187",
    "./src/dungeon-variation.js?v=187",
    "./src/dungeon-completion.js?v=187",
    "./src/enemy-patterns.js?v=187",
    "./src/monster-pack.js?v=187",
    "./src/monster-render.js?v=187",
    "./src/landscape.js?v=187",
    "./src/landscape-render.js?v=187",
    "./src/underlands.js?v=187",
    "./src/pattern-dungeons.js?v=187",
    "./src/relay-network.js?v=187",
    "./src/glyphs.js?v=187",
    "./src/echoes.js?v=187",
    "./src/constellation.js?v=187",
    "./src/water-traversal.js?v=187",
    "./src/open-sea.js?v=187",
    "./src/boats.js?v=187",
    "./src/sea-creatures.js?v=187",
    "./src/diving.js?v=187",
    "./src/grottoes.js?v=187",
    "./src/spell-slots.js?v=187",
    "./src/settlements.js?v=187",
    "./src/skirmishes.js?v=187",
    "./src/travelers.js?v=187",
    "./src/diagnostic-probe.js?v=187",
    "./src/questing-beast.js?v=187",
    "./src/recitations.js?v=187",
    "./src/far-array.js?v=187",
    "./src/combat-visuals.js?v=187",
    "./src/dungeon-framework.js?v=187",
    "./src/elites.js?v=187",
    "./src/random.js?v=187",
    "./src/types.js?v=187",
    "./src/story.js?v=187",
    "./src/foundry.js?v=187",
    "./src/world.js?v=187",
    "./src/deep-dungeons.js?v=187",
    "./src/scenes.js?v=187",
    "./src/arenas.js?v=187",
    "./src/items.js?v=187",
    "./src/combat.js?v=187",
    "./src/interactions.js?v=187",
    "./src/persistence.js?v=187",
    "./src/input.js?v=187",
    "./src/game.js?v=187",
    "./src/renderer.js?v=187",
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
