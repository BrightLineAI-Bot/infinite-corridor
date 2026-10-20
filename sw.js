const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v245`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=245",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=245",
    "./src/proving-ground.js?v=245",
    "./src/proving-ground-fixtures.js?v=245",
    "./src/proving-ground-labs.js?v=245",
    "./src/dungeon-variation.js?v=245",
    "./src/dungeon-completion.js?v=245",
    "./src/enemy-patterns.js?v=245",
    "./src/monster-pack.js?v=245",
    "./src/monster-render.js?v=245",
    "./src/landscape.js?v=245",
    "./src/landscape-render.js?v=245",
    "./src/underlands.js?v=245",
    "./src/pattern-dungeons.js?v=245",
    "./src/relay-network.js?v=245",
    "./src/glyphs.js?v=245",
    "./src/echoes.js?v=245",
    "./src/constellation.js?v=245",
    "./src/water-traversal.js?v=245",
    "./src/open-sea.js?v=245",
    "./src/boats.js?v=245",
    "./src/sea-creatures.js?v=245",
    "./src/diving.js?v=245",
    "./src/grottoes.js?v=245",
    "./src/spell-slots.js?v=245",
    "./src/settlements.js?v=245",
    "./src/skirmishes.js?v=245",
    "./src/travelers.js?v=245",
    "./src/diagnostic-probe.js?v=245",
    "./src/questing-beast.js?v=245",
    "./src/recitations.js?v=245",
    "./src/lore.js?v=245",
    "./src/glimpses.js?v=245",
    "./src/glimpse-render.js?v=245",
    "./src/glimpse-paint.js?v=245",
    "./src/glimpse-scenes.js?v=245",
    "./src/glimpse-horror.js?v=245",
    "./src/glimpse-legend.js?v=245",
    "./src/glimpse-hand.js?v=245",
    "./src/atlas-view.js?v=245",
    "./src/strange.js?v=245",
    "./src/linked-dungeons.js?v=245",
    "./src/digging.js?v=245",
    "./src/tyrant-hunt.js?v=245",
    "./src/world-beasts.js?v=245",
    "./src/elders.js?v=245",
    "./src/far-array.js?v=245",
    "./src/combat-visuals.js?v=245",
    "./src/dungeon-framework.js?v=245",
    "./src/elites.js?v=245",
    "./src/random.js?v=245",
    "./src/types.js?v=245",
    "./src/story.js?v=245",
    "./src/foundry.js?v=245",
    "./src/world.js?v=245",
    "./src/deep-dungeons.js?v=245",
    "./src/scenes.js?v=245",
    "./src/arenas.js?v=245",
    "./src/items.js?v=245",
    "./src/combat.js?v=245",
    "./src/interactions.js?v=245",
    "./src/persistence.js?v=245",
    "./src/input.js?v=245",
    "./src/game.js?v=245",
    "./src/renderer.js?v=245",
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
