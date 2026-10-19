const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v193`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=193",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=193",
    "./src/proving-ground.js?v=193",
    "./src/proving-ground-fixtures.js?v=193",
    "./src/proving-ground-labs.js?v=193",
    "./src/dungeon-variation.js?v=193",
    "./src/dungeon-completion.js?v=193",
    "./src/enemy-patterns.js?v=193",
    "./src/monster-pack.js?v=193",
    "./src/monster-render.js?v=193",
    "./src/landscape.js?v=193",
    "./src/landscape-render.js?v=193",
    "./src/underlands.js?v=193",
    "./src/pattern-dungeons.js?v=193",
    "./src/relay-network.js?v=193",
    "./src/glyphs.js?v=193",
    "./src/echoes.js?v=193",
    "./src/constellation.js?v=193",
    "./src/water-traversal.js?v=193",
    "./src/open-sea.js?v=193",
    "./src/boats.js?v=193",
    "./src/sea-creatures.js?v=193",
    "./src/diving.js?v=193",
    "./src/grottoes.js?v=193",
    "./src/spell-slots.js?v=193",
    "./src/settlements.js?v=193",
    "./src/skirmishes.js?v=193",
    "./src/travelers.js?v=193",
    "./src/diagnostic-probe.js?v=193",
    "./src/questing-beast.js?v=193",
    "./src/recitations.js?v=193",
    "./src/lore.js?v=193",
    "./src/glimpses.js?v=193",
    "./src/glimpse-render.js?v=193",
    "./src/far-array.js?v=193",
    "./src/combat-visuals.js?v=193",
    "./src/dungeon-framework.js?v=193",
    "./src/elites.js?v=193",
    "./src/random.js?v=193",
    "./src/types.js?v=193",
    "./src/story.js?v=193",
    "./src/foundry.js?v=193",
    "./src/world.js?v=193",
    "./src/deep-dungeons.js?v=193",
    "./src/scenes.js?v=193",
    "./src/arenas.js?v=193",
    "./src/items.js?v=193",
    "./src/combat.js?v=193",
    "./src/interactions.js?v=193",
    "./src/persistence.js?v=193",
    "./src/input.js?v=193",
    "./src/game.js?v=193",
    "./src/renderer.js?v=193",
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
