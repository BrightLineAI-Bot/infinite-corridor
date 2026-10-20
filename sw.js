const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v235`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=235",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=235",
    "./src/proving-ground.js?v=235",
    "./src/proving-ground-fixtures.js?v=235",
    "./src/proving-ground-labs.js?v=235",
    "./src/dungeon-variation.js?v=235",
    "./src/dungeon-completion.js?v=235",
    "./src/enemy-patterns.js?v=235",
    "./src/monster-pack.js?v=235",
    "./src/monster-render.js?v=235",
    "./src/landscape.js?v=235",
    "./src/landscape-render.js?v=235",
    "./src/underlands.js?v=235",
    "./src/pattern-dungeons.js?v=235",
    "./src/relay-network.js?v=235",
    "./src/glyphs.js?v=235",
    "./src/echoes.js?v=235",
    "./src/constellation.js?v=235",
    "./src/water-traversal.js?v=235",
    "./src/open-sea.js?v=235",
    "./src/boats.js?v=235",
    "./src/sea-creatures.js?v=235",
    "./src/diving.js?v=235",
    "./src/grottoes.js?v=235",
    "./src/spell-slots.js?v=235",
    "./src/settlements.js?v=235",
    "./src/skirmishes.js?v=235",
    "./src/travelers.js?v=235",
    "./src/diagnostic-probe.js?v=235",
    "./src/questing-beast.js?v=235",
    "./src/recitations.js?v=235",
    "./src/lore.js?v=235",
    "./src/glimpses.js?v=235",
    "./src/glimpse-render.js?v=235",
    "./src/glimpse-paint.js?v=235",
    "./src/glimpse-scenes.js?v=235",
    "./src/glimpse-horror.js?v=235",
    "./src/glimpse-legend.js?v=235",
    "./src/glimpse-hand.js?v=235",
    "./src/atlas-view.js?v=235",
    "./src/strange.js?v=235",
    "./src/linked-dungeons.js?v=235",
    "./src/digging.js?v=235",
    "./src/tyrant-hunt.js?v=235",
    "./src/world-beasts.js?v=235",
    "./src/elders.js?v=235",
    "./src/far-array.js?v=235",
    "./src/combat-visuals.js?v=235",
    "./src/dungeon-framework.js?v=235",
    "./src/elites.js?v=235",
    "./src/random.js?v=235",
    "./src/types.js?v=235",
    "./src/story.js?v=235",
    "./src/foundry.js?v=235",
    "./src/world.js?v=235",
    "./src/deep-dungeons.js?v=235",
    "./src/scenes.js?v=235",
    "./src/arenas.js?v=235",
    "./src/items.js?v=235",
    "./src/combat.js?v=235",
    "./src/interactions.js?v=235",
    "./src/persistence.js?v=235",
    "./src/input.js?v=235",
    "./src/game.js?v=235",
    "./src/renderer.js?v=235",
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
