const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v261`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=261",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=261",
    "./src/proving-ground.js?v=261",
    "./src/proving-ground-fixtures.js?v=261",
    "./src/proving-ground-labs.js?v=261",
    "./src/dungeon-variation.js?v=261",
    "./src/dungeon-completion.js?v=261",
    "./src/enemy-patterns.js?v=261",
    "./src/monster-pack.js?v=261",
    "./src/monster-render.js?v=261",
    "./src/astral-worm.js?v=261",
    "./src/astral-worm-render.js?v=261",
    "./src/astral-worm-retreat.js?v=261",
    "./src/astral-worm-mount.js?v=261",
    "./src/lightning-giant-render.js?v=261",
    "./src/astral-encounters.js?v=261",
    "./src/astral-world-retreat.js?v=261",
    "./src/landscape.js?v=261",
    "./src/landscape-render.js?v=261",
    "./src/underlands.js?v=261",
    "./src/pattern-dungeons.js?v=261",
    "./src/relay-network.js?v=261",
    "./src/glyphs.js?v=261",
    "./src/echoes.js?v=261",
    "./src/constellation.js?v=261",
    "./src/water-traversal.js?v=261",
    "./src/open-sea.js?v=261",
    "./src/boats.js?v=261",
    "./src/sea-creatures.js?v=261",
    "./src/diving.js?v=261",
    "./src/grottoes.js?v=261",
    "./src/spell-slots.js?v=261",
    "./src/settlements.js?v=261",
    "./src/skirmishes.js?v=261",
    "./src/travelers.js?v=261",
    "./src/diagnostic-probe.js?v=261",
    "./src/questing-beast.js?v=261",
    "./src/recitations.js?v=261",
    "./src/lore.js?v=261",
    "./src/glimpses.js?v=261",
    "./src/glimpse-render.js?v=261",
    "./src/glimpse-paint.js?v=261",
    "./src/glimpse-scenes.js?v=261",
    "./src/glimpse-horror.js?v=261",
    "./src/glimpse-legend.js?v=261",
    "./src/glimpse-hand.js?v=261",
    "./src/atlas-view.js?v=261",
    "./src/strange.js?v=261",
    "./src/linked-dungeons.js?v=261",
    "./src/digging.js?v=261",
    "./src/tyrant-hunt.js?v=261",
    "./src/world-beasts.js?v=261",
    "./src/elders.js?v=261",
    "./src/far-array.js?v=261",
    "./src/combat-visuals.js?v=261",
    "./src/dungeon-framework.js?v=261",
    "./src/elites.js?v=261",
    "./src/random.js?v=261",
    "./src/types.js?v=261",
    "./src/story.js?v=261",
    "./src/foundry.js?v=261",
    "./src/world.js?v=261",
    "./src/deep-dungeons.js?v=261",
    "./src/scenes.js?v=261",
    "./src/arenas.js?v=261",
    "./src/items.js?v=261",
    "./src/combat.js?v=261",
    "./src/interactions.js?v=261",
    "./src/persistence.js?v=261",
    "./src/input.js?v=261",
    "./src/game.js?v=261",
    "./src/renderer.js?v=261",
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
