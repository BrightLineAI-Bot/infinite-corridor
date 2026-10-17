const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v165`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=165",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=165",
    "./src/proving-ground.js?v=165",
    "./src/proving-ground-fixtures.js?v=165",
    "./src/proving-ground-labs.js?v=165",
    "./src/dungeon-variation.js?v=165",
    "./src/dungeon-completion.js?v=165",
    "./src/enemy-patterns.js?v=165",
    "./src/monster-pack.js?v=165",
    "./src/monster-render.js?v=165",
    "./src/landscape.js?v=165",
    "./src/landscape-render.js?v=165",
    "./src/underlands.js?v=165",
    "./src/pattern-dungeons.js?v=165",
    "./src/relay-network.js?v=165",
    "./src/glyphs.js?v=165",
    "./src/echoes.js?v=165",
    "./src/constellation.js?v=165",
    "./src/water-traversal.js?v=165",
    "./src/open-sea.js?v=165",
    "./src/boats.js?v=165",
    "./src/sea-creatures.js?v=165",
    "./src/diving.js?v=165",
    "./src/grottoes.js?v=165",
    "./src/spell-slots.js?v=165",
    "./src/settlements.js?v=165",
    "./src/skirmishes.js?v=165",
    "./src/travelers.js?v=165",
    "./src/diagnostic-probe.js?v=165",
    "./src/questing-beast.js?v=165",
    "./src/recitations.js?v=165",
    "./src/far-array.js?v=165",
    "./src/combat-visuals.js?v=165",
    "./src/dungeon-framework.js?v=165",
    "./src/elites.js?v=165",
    "./src/random.js?v=165",
    "./src/types.js?v=165",
    "./src/story.js?v=165",
    "./src/foundry.js?v=165",
    "./src/world.js?v=165",
    "./src/deep-dungeons.js?v=165",
    "./src/scenes.js?v=165",
    "./src/arenas.js?v=165",
    "./src/items.js?v=165",
    "./src/combat.js?v=165",
    "./src/interactions.js?v=165",
    "./src/persistence.js?v=165",
    "./src/input.js?v=165",
    "./src/game.js?v=165",
    "./src/renderer.js?v=165",
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
