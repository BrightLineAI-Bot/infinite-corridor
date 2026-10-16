const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v147`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=147",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=147",
    "./src/proving-ground.js?v=147",
    "./src/proving-ground-fixtures.js?v=147",
    "./src/proving-ground-labs.js?v=147",
    "./src/dungeon-variation.js?v=147",
    "./src/dungeon-completion.js?v=147",
    "./src/enemy-patterns.js?v=147",
    "./src/monster-pack.js?v=147",
    "./src/monster-render.js?v=147",
    "./src/landscape.js?v=147",
    "./src/landscape-render.js?v=147",
    "./src/underlands.js?v=147",
    "./src/pattern-dungeons.js?v=147",
    "./src/relay-network.js?v=147",
    "./src/glyphs.js?v=147",
    "./src/echoes.js?v=147",
    "./src/constellation.js?v=147",
    "./src/water-traversal.js?v=147",
    "./src/boats.js?v=147",
    "./src/sea-creatures.js?v=147",
    "./src/diving.js?v=147",
    "./src/grottoes.js?v=147",
    "./src/spell-slots.js?v=147",
    "./src/settlements.js?v=147",
    "./src/skirmishes.js?v=147",
    "./src/travelers.js?v=147",
    "./src/questing-beast.js?v=147",
    "./src/recitations.js?v=147",
    "./src/far-array.js?v=147",
    "./src/combat-visuals.js?v=147",
    "./src/dungeon-framework.js?v=147",
    "./src/elites.js?v=147",
    "./src/random.js?v=147",
    "./src/types.js?v=147",
    "./src/story.js?v=147",
    "./src/foundry.js?v=147",
    "./src/world.js?v=147",
    "./src/deep-dungeons.js?v=147",
    "./src/scenes.js?v=147",
    "./src/arenas.js?v=147",
    "./src/items.js?v=147",
    "./src/combat.js?v=147",
    "./src/interactions.js?v=147",
    "./src/persistence.js?v=147",
    "./src/input.js?v=147",
    "./src/game.js?v=147",
    "./src/renderer.js?v=147",
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
