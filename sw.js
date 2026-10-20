const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r241-45286473b10a`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r241-45286473b10a",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r241-45286473b10a",
    "./src/proving-ground.js?v=r241-45286473b10a",
    "./src/proving-ground-fixtures.js?v=r241-45286473b10a",
    "./src/proving-ground-labs.js?v=r241-45286473b10a",
    "./src/dungeon-variation.js?v=r241-45286473b10a",
    "./src/dungeon-completion.js?v=r241-45286473b10a",
    "./src/enemy-patterns.js?v=r241-45286473b10a",
    "./src/monster-pack.js?v=r241-45286473b10a",
    "./src/monster-render.js?v=r241-45286473b10a",
    "./src/landscape.js?v=r241-45286473b10a",
    "./src/landscape-render.js?v=r241-45286473b10a",
    "./src/underlands.js?v=r241-45286473b10a",
    "./src/pattern-dungeons.js?v=r241-45286473b10a",
    "./src/relay-network.js?v=r241-45286473b10a",
    "./src/glyphs.js?v=r241-45286473b10a",
    "./src/echoes.js?v=r241-45286473b10a",
    "./src/constellation.js?v=r241-45286473b10a",
    "./src/water-traversal.js?v=r241-45286473b10a",
    "./src/open-sea.js?v=r241-45286473b10a",
    "./src/boats.js?v=r241-45286473b10a",
    "./src/sea-creatures.js?v=r241-45286473b10a",
    "./src/diving.js?v=r241-45286473b10a",
    "./src/grottoes.js?v=r241-45286473b10a",
    "./src/spell-slots.js?v=r241-45286473b10a",
    "./src/settlements.js?v=r241-45286473b10a",
    "./src/skirmishes.js?v=r241-45286473b10a",
    "./src/travelers.js?v=r241-45286473b10a",
    "./src/diagnostic-probe.js?v=r241-45286473b10a",
    "./src/questing-beast.js?v=r241-45286473b10a",
    "./src/recitations.js?v=r241-45286473b10a",
    "./src/lore.js?v=r241-45286473b10a",
    "./src/glimpses.js?v=r241-45286473b10a",
    "./src/glimpse-render.js?v=r241-45286473b10a",
    "./src/glimpse-paint.js?v=r241-45286473b10a",
    "./src/glimpse-scenes.js?v=r241-45286473b10a",
    "./src/glimpse-horror.js?v=r241-45286473b10a",
    "./src/glimpse-legend.js?v=r241-45286473b10a",
    "./src/glimpse-hand.js?v=r241-45286473b10a",
    "./src/atlas-view.js?v=r241-45286473b10a",
    "./src/strange.js?v=r241-45286473b10a",
    "./src/linked-dungeons.js?v=r241-45286473b10a",
    "./src/digging.js?v=r241-45286473b10a",
    "./src/tyrant-hunt.js?v=r241-45286473b10a",
    "./src/world-beasts.js?v=r241-45286473b10a",
    "./src/elders.js?v=r241-45286473b10a",
    "./src/far-array.js?v=r241-45286473b10a",
    "./src/combat-visuals.js?v=r241-45286473b10a",
    "./src/dungeon-framework.js?v=r241-45286473b10a",
    "./src/elites.js?v=r241-45286473b10a",
    "./src/random.js?v=r241-45286473b10a",
    "./src/types.js?v=r241-45286473b10a",
    "./src/story.js?v=r241-45286473b10a",
    "./src/foundry.js?v=r241-45286473b10a",
    "./src/world.js?v=r241-45286473b10a",
    "./src/deep-dungeons.js?v=r241-45286473b10a",
    "./src/scenes.js?v=r241-45286473b10a",
    "./src/arenas.js?v=r241-45286473b10a",
    "./src/items.js?v=r241-45286473b10a",
    "./src/combat.js?v=r241-45286473b10a",
    "./src/interactions.js?v=r241-45286473b10a",
    "./src/persistence.js?v=r241-45286473b10a",
    "./src/input.js?v=r241-45286473b10a",
    "./src/game.js?v=r241-45286473b10a",
    "./src/renderer.js?v=r241-45286473b10a",
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
