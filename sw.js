const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v247`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=247",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=247",
    "./src/proving-ground.js?v=247",
    "./src/proving-ground-fixtures.js?v=247",
    "./src/proving-ground-labs.js?v=247",
    "./src/dungeon-variation.js?v=247",
    "./src/dungeon-completion.js?v=247",
    "./src/enemy-patterns.js?v=247",
    "./src/monster-pack.js?v=247",
    "./src/monster-render.js?v=247",
    "./src/landscape.js?v=247",
    "./src/landscape-render.js?v=247",
    "./src/underlands.js?v=247",
    "./src/pattern-dungeons.js?v=247",
    "./src/relay-network.js?v=247",
    "./src/glyphs.js?v=247",
    "./src/echoes.js?v=247",
    "./src/constellation.js?v=247",
    "./src/water-traversal.js?v=247",
    "./src/open-sea.js?v=247",
    "./src/boats.js?v=247",
    "./src/sea-creatures.js?v=247",
    "./src/diving.js?v=247",
    "./src/grottoes.js?v=247",
    "./src/spell-slots.js?v=247",
    "./src/settlements.js?v=247",
    "./src/skirmishes.js?v=247",
    "./src/travelers.js?v=247",
    "./src/diagnostic-probe.js?v=247",
    "./src/questing-beast.js?v=247",
    "./src/recitations.js?v=247",
    "./src/lore.js?v=247",
    "./src/glimpses.js?v=247",
    "./src/glimpse-render.js?v=247",
    "./src/glimpse-paint.js?v=247",
    "./src/glimpse-scenes.js?v=247",
    "./src/glimpse-horror.js?v=247",
    "./src/glimpse-legend.js?v=247",
    "./src/glimpse-hand.js?v=247",
    "./src/atlas-view.js?v=247",
    "./src/strange.js?v=247",
    "./src/linked-dungeons.js?v=247",
    "./src/digging.js?v=247",
    "./src/tyrant-hunt.js?v=247",
    "./src/world-beasts.js?v=247",
    "./src/elders.js?v=247",
    "./src/far-array.js?v=247",
    "./src/combat-visuals.js?v=247",
    "./src/dungeon-framework.js?v=247",
    "./src/elites.js?v=247",
    "./src/random.js?v=247",
    "./src/types.js?v=247",
    "./src/story.js?v=247",
    "./src/foundry.js?v=247",
    "./src/world.js?v=247",
    "./src/deep-dungeons.js?v=247",
    "./src/scenes.js?v=247",
    "./src/arenas.js?v=247",
    "./src/items.js?v=247",
    "./src/combat.js?v=247",
    "./src/interactions.js?v=247",
    "./src/persistence.js?v=247",
    "./src/input.js?v=247",
    "./src/game.js?v=247",
    "./src/renderer.js?v=247",
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
