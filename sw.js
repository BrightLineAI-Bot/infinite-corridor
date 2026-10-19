const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v217`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=217",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=217",
    "./src/proving-ground.js?v=217",
    "./src/proving-ground-fixtures.js?v=217",
    "./src/proving-ground-labs.js?v=217",
    "./src/dungeon-variation.js?v=217",
    "./src/dungeon-completion.js?v=217",
    "./src/enemy-patterns.js?v=217",
    "./src/monster-pack.js?v=217",
    "./src/monster-render.js?v=217",
    "./src/landscape.js?v=217",
    "./src/landscape-render.js?v=217",
    "./src/underlands.js?v=217",
    "./src/pattern-dungeons.js?v=217",
    "./src/relay-network.js?v=217",
    "./src/glyphs.js?v=217",
    "./src/echoes.js?v=217",
    "./src/constellation.js?v=217",
    "./src/water-traversal.js?v=217",
    "./src/open-sea.js?v=217",
    "./src/boats.js?v=217",
    "./src/sea-creatures.js?v=217",
    "./src/diving.js?v=217",
    "./src/grottoes.js?v=217",
    "./src/spell-slots.js?v=217",
    "./src/settlements.js?v=217",
    "./src/skirmishes.js?v=217",
    "./src/travelers.js?v=217",
    "./src/diagnostic-probe.js?v=217",
    "./src/questing-beast.js?v=217",
    "./src/recitations.js?v=217",
    "./src/lore.js?v=217",
    "./src/glimpses.js?v=217",
    "./src/glimpse-render.js?v=217",
    "./src/glimpse-paint.js?v=217",
    "./src/glimpse-scenes.js?v=217",
    "./src/glimpse-horror.js?v=217",
    "./src/atlas-view.js?v=217",
    "./src/strange.js?v=217",
    "./src/linked-dungeons.js?v=217",
    "./src/elders.js?v=217",
    "./src/far-array.js?v=217",
    "./src/combat-visuals.js?v=217",
    "./src/dungeon-framework.js?v=217",
    "./src/elites.js?v=217",
    "./src/random.js?v=217",
    "./src/types.js?v=217",
    "./src/story.js?v=217",
    "./src/foundry.js?v=217",
    "./src/world.js?v=217",
    "./src/deep-dungeons.js?v=217",
    "./src/scenes.js?v=217",
    "./src/arenas.js?v=217",
    "./src/items.js?v=217",
    "./src/combat.js?v=217",
    "./src/interactions.js?v=217",
    "./src/persistence.js?v=217",
    "./src/input.js?v=217",
    "./src/game.js?v=217",
    "./src/renderer.js?v=217",
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
