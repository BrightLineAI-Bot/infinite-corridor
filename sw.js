const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v243`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=243",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=243",
    "./src/proving-ground.js?v=243",
    "./src/proving-ground-fixtures.js?v=243",
    "./src/proving-ground-labs.js?v=243",
    "./src/dungeon-variation.js?v=243",
    "./src/dungeon-completion.js?v=243",
    "./src/enemy-patterns.js?v=243",
    "./src/monster-pack.js?v=243",
    "./src/monster-render.js?v=243",
    "./src/landscape.js?v=243",
    "./src/landscape-render.js?v=243",
    "./src/underlands.js?v=243",
    "./src/pattern-dungeons.js?v=243",
    "./src/relay-network.js?v=243",
    "./src/glyphs.js?v=243",
    "./src/echoes.js?v=243",
    "./src/constellation.js?v=243",
    "./src/water-traversal.js?v=243",
    "./src/open-sea.js?v=243",
    "./src/boats.js?v=243",
    "./src/sea-creatures.js?v=243",
    "./src/diving.js?v=243",
    "./src/grottoes.js?v=243",
    "./src/spell-slots.js?v=243",
    "./src/settlements.js?v=243",
    "./src/skirmishes.js?v=243",
    "./src/travelers.js?v=243",
    "./src/diagnostic-probe.js?v=243",
    "./src/questing-beast.js?v=243",
    "./src/recitations.js?v=243",
    "./src/lore.js?v=243",
    "./src/glimpses.js?v=243",
    "./src/glimpse-render.js?v=243",
    "./src/glimpse-paint.js?v=243",
    "./src/glimpse-scenes.js?v=243",
    "./src/glimpse-horror.js?v=243",
    "./src/glimpse-legend.js?v=243",
    "./src/glimpse-hand.js?v=243",
    "./src/atlas-view.js?v=243",
    "./src/strange.js?v=243",
    "./src/linked-dungeons.js?v=243",
    "./src/digging.js?v=243",
    "./src/tyrant-hunt.js?v=243",
    "./src/world-beasts.js?v=243",
    "./src/elders.js?v=243",
    "./src/far-array.js?v=243",
    "./src/combat-visuals.js?v=243",
    "./src/dungeon-framework.js?v=243",
    "./src/elites.js?v=243",
    "./src/random.js?v=243",
    "./src/types.js?v=243",
    "./src/story.js?v=243",
    "./src/foundry.js?v=243",
    "./src/world.js?v=243",
    "./src/deep-dungeons.js?v=243",
    "./src/scenes.js?v=243",
    "./src/arenas.js?v=243",
    "./src/items.js?v=243",
    "./src/combat.js?v=243",
    "./src/interactions.js?v=243",
    "./src/persistence.js?v=243",
    "./src/input.js?v=243",
    "./src/game.js?v=243",
    "./src/renderer.js?v=243",
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
