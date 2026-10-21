const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r259-a490b918fa7e`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r259-a490b918fa7e",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r259-a490b918fa7e",
    "./src/proving-ground.js?v=r259-a490b918fa7e",
    "./src/proving-ground-fixtures.js?v=r259-a490b918fa7e",
    "./src/proving-ground-labs.js?v=r259-a490b918fa7e",
    "./src/dungeon-variation.js?v=r259-a490b918fa7e",
    "./src/dungeon-completion.js?v=r259-a490b918fa7e",
    "./src/enemy-patterns.js?v=r259-a490b918fa7e",
    "./src/monster-pack.js?v=r259-a490b918fa7e",
    "./src/monster-render.js?v=r259-a490b918fa7e",
    "./src/astral-worm.js?v=r259-a490b918fa7e",
    "./src/astral-worm-render.js?v=r259-a490b918fa7e",
    "./src/astral-worm-retreat.js?v=r259-a490b918fa7e",
    "./src/astral-worm-mount.js?v=r259-a490b918fa7e",
    "./src/lightning-giant-render.js?v=r259-a490b918fa7e",
    "./src/astral-encounters.js?v=r259-a490b918fa7e",
    "./src/astral-world-retreat.js?v=r259-a490b918fa7e",
    "./src/landscape.js?v=r259-a490b918fa7e",
    "./src/landscape-render.js?v=r259-a490b918fa7e",
    "./src/underlands.js?v=r259-a490b918fa7e",
    "./src/pattern-dungeons.js?v=r259-a490b918fa7e",
    "./src/relay-network.js?v=r259-a490b918fa7e",
    "./src/glyphs.js?v=r259-a490b918fa7e",
    "./src/echoes.js?v=r259-a490b918fa7e",
    "./src/constellation.js?v=r259-a490b918fa7e",
    "./src/water-traversal.js?v=r259-a490b918fa7e",
    "./src/open-sea.js?v=r259-a490b918fa7e",
    "./src/boats.js?v=r259-a490b918fa7e",
    "./src/sea-creatures.js?v=r259-a490b918fa7e",
    "./src/diving.js?v=r259-a490b918fa7e",
    "./src/grottoes.js?v=r259-a490b918fa7e",
    "./src/spell-slots.js?v=r259-a490b918fa7e",
    "./src/settlements.js?v=r259-a490b918fa7e",
    "./src/skirmishes.js?v=r259-a490b918fa7e",
    "./src/travelers.js?v=r259-a490b918fa7e",
    "./src/diagnostic-probe.js?v=r259-a490b918fa7e",
    "./src/questing-beast.js?v=r259-a490b918fa7e",
    "./src/recitations.js?v=r259-a490b918fa7e",
    "./src/lore.js?v=r259-a490b918fa7e",
    "./src/glimpses.js?v=r259-a490b918fa7e",
    "./src/glimpse-render.js?v=r259-a490b918fa7e",
    "./src/glimpse-paint.js?v=r259-a490b918fa7e",
    "./src/glimpse-scenes.js?v=r259-a490b918fa7e",
    "./src/glimpse-horror.js?v=r259-a490b918fa7e",
    "./src/glimpse-legend.js?v=r259-a490b918fa7e",
    "./src/glimpse-hand.js?v=r259-a490b918fa7e",
    "./src/atlas-view.js?v=r259-a490b918fa7e",
    "./src/strange.js?v=r259-a490b918fa7e",
    "./src/linked-dungeons.js?v=r259-a490b918fa7e",
    "./src/digging.js?v=r259-a490b918fa7e",
    "./src/tyrant-hunt.js?v=r259-a490b918fa7e",
    "./src/world-beasts.js?v=r259-a490b918fa7e",
    "./src/elders.js?v=r259-a490b918fa7e",
    "./src/far-array.js?v=r259-a490b918fa7e",
    "./src/combat-visuals.js?v=r259-a490b918fa7e",
    "./src/dungeon-framework.js?v=r259-a490b918fa7e",
    "./src/elites.js?v=r259-a490b918fa7e",
    "./src/random.js?v=r259-a490b918fa7e",
    "./src/types.js?v=r259-a490b918fa7e",
    "./src/story.js?v=r259-a490b918fa7e",
    "./src/foundry.js?v=r259-a490b918fa7e",
    "./src/world.js?v=r259-a490b918fa7e",
    "./src/deep-dungeons.js?v=r259-a490b918fa7e",
    "./src/scenes.js?v=r259-a490b918fa7e",
    "./src/arenas.js?v=r259-a490b918fa7e",
    "./src/items.js?v=r259-a490b918fa7e",
    "./src/combat.js?v=r259-a490b918fa7e",
    "./src/interactions.js?v=r259-a490b918fa7e",
    "./src/persistence.js?v=r259-a490b918fa7e",
    "./src/input.js?v=r259-a490b918fa7e",
    "./src/game.js?v=r259-a490b918fa7e",
    "./src/renderer.js?v=r259-a490b918fa7e",
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
