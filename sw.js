const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v231`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=231",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=231",
    "./src/proving-ground.js?v=231",
    "./src/proving-ground-fixtures.js?v=231",
    "./src/proving-ground-labs.js?v=231",
    "./src/dungeon-variation.js?v=231",
    "./src/dungeon-completion.js?v=231",
    "./src/enemy-patterns.js?v=231",
    "./src/monster-pack.js?v=231",
    "./src/monster-render.js?v=231",
    "./src/landscape.js?v=231",
    "./src/landscape-render.js?v=231",
    "./src/underlands.js?v=231",
    "./src/pattern-dungeons.js?v=231",
    "./src/relay-network.js?v=231",
    "./src/glyphs.js?v=231",
    "./src/echoes.js?v=231",
    "./src/constellation.js?v=231",
    "./src/water-traversal.js?v=231",
    "./src/open-sea.js?v=231",
    "./src/boats.js?v=231",
    "./src/sea-creatures.js?v=231",
    "./src/diving.js?v=231",
    "./src/grottoes.js?v=231",
    "./src/spell-slots.js?v=231",
    "./src/settlements.js?v=231",
    "./src/skirmishes.js?v=231",
    "./src/travelers.js?v=231",
    "./src/diagnostic-probe.js?v=231",
    "./src/questing-beast.js?v=231",
    "./src/recitations.js?v=231",
    "./src/lore.js?v=231",
    "./src/glimpses.js?v=231",
    "./src/glimpse-render.js?v=231",
    "./src/glimpse-paint.js?v=231",
    "./src/glimpse-scenes.js?v=231",
    "./src/glimpse-horror.js?v=231",
    "./src/glimpse-legend.js?v=231",
    "./src/glimpse-hand.js?v=231",
    "./src/atlas-view.js?v=231",
    "./src/strange.js?v=231",
    "./src/linked-dungeons.js?v=231",
    "./src/digging.js?v=231",
    "./src/tyrant-hunt.js?v=231",
    "./src/elders.js?v=231",
    "./src/far-array.js?v=231",
    "./src/combat-visuals.js?v=231",
    "./src/dungeon-framework.js?v=231",
    "./src/elites.js?v=231",
    "./src/random.js?v=231",
    "./src/types.js?v=231",
    "./src/story.js?v=231",
    "./src/foundry.js?v=231",
    "./src/world.js?v=231",
    "./src/deep-dungeons.js?v=231",
    "./src/scenes.js?v=231",
    "./src/arenas.js?v=231",
    "./src/items.js?v=231",
    "./src/combat.js?v=231",
    "./src/interactions.js?v=231",
    "./src/persistence.js?v=231",
    "./src/input.js?v=231",
    "./src/game.js?v=231",
    "./src/renderer.js?v=231",
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
