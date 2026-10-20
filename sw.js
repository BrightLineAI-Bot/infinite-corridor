const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v241`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=241",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=241",
    "./src/proving-ground.js?v=241",
    "./src/proving-ground-fixtures.js?v=241",
    "./src/proving-ground-labs.js?v=241",
    "./src/dungeon-variation.js?v=241",
    "./src/dungeon-completion.js?v=241",
    "./src/enemy-patterns.js?v=241",
    "./src/monster-pack.js?v=241",
    "./src/monster-render.js?v=241",
    "./src/landscape.js?v=241",
    "./src/landscape-render.js?v=241",
    "./src/underlands.js?v=241",
    "./src/pattern-dungeons.js?v=241",
    "./src/relay-network.js?v=241",
    "./src/glyphs.js?v=241",
    "./src/echoes.js?v=241",
    "./src/constellation.js?v=241",
    "./src/water-traversal.js?v=241",
    "./src/open-sea.js?v=241",
    "./src/boats.js?v=241",
    "./src/sea-creatures.js?v=241",
    "./src/diving.js?v=241",
    "./src/grottoes.js?v=241",
    "./src/spell-slots.js?v=241",
    "./src/settlements.js?v=241",
    "./src/skirmishes.js?v=241",
    "./src/travelers.js?v=241",
    "./src/diagnostic-probe.js?v=241",
    "./src/questing-beast.js?v=241",
    "./src/recitations.js?v=241",
    "./src/lore.js?v=241",
    "./src/glimpses.js?v=241",
    "./src/glimpse-render.js?v=241",
    "./src/glimpse-paint.js?v=241",
    "./src/glimpse-scenes.js?v=241",
    "./src/glimpse-horror.js?v=241",
    "./src/glimpse-legend.js?v=241",
    "./src/glimpse-hand.js?v=241",
    "./src/atlas-view.js?v=241",
    "./src/strange.js?v=241",
    "./src/linked-dungeons.js?v=241",
    "./src/digging.js?v=241",
    "./src/tyrant-hunt.js?v=241",
    "./src/world-beasts.js?v=241",
    "./src/elders.js?v=241",
    "./src/far-array.js?v=241",
    "./src/combat-visuals.js?v=241",
    "./src/dungeon-framework.js?v=241",
    "./src/elites.js?v=241",
    "./src/random.js?v=241",
    "./src/types.js?v=241",
    "./src/story.js?v=241",
    "./src/foundry.js?v=241",
    "./src/world.js?v=241",
    "./src/deep-dungeons.js?v=241",
    "./src/scenes.js?v=241",
    "./src/arenas.js?v=241",
    "./src/items.js?v=241",
    "./src/combat.js?v=241",
    "./src/interactions.js?v=241",
    "./src/persistence.js?v=241",
    "./src/input.js?v=241",
    "./src/game.js?v=241",
    "./src/renderer.js?v=241",
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
