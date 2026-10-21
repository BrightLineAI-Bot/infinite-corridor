const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v265`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=265",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=265",
    "./src/proving-ground.js?v=265",
    "./src/proving-ground-fixtures.js?v=265",
    "./src/proving-ground-labs.js?v=265",
    "./src/dungeon-variation.js?v=265",
    "./src/dungeon-completion.js?v=265",
    "./src/enemy-patterns.js?v=265",
    "./src/monster-pack.js?v=265",
    "./src/monster-render.js?v=265",
    "./src/astral-worm.js?v=265",
    "./src/astral-worm-render.js?v=265",
    "./src/astral-worm-retreat.js?v=265",
    "./src/astral-worm-mount.js?v=265",
    "./src/lightning-giant-render.js?v=265",
    "./src/astral-encounters.js?v=265",
    "./src/astral-world-retreat.js?v=265",
    "./src/landscape.js?v=265",
    "./src/landscape-render.js?v=265",
    "./src/underlands.js?v=265",
    "./src/pattern-dungeons.js?v=265",
    "./src/relay-network.js?v=265",
    "./src/glyphs.js?v=265",
    "./src/echoes.js?v=265",
    "./src/constellation.js?v=265",
    "./src/water-traversal.js?v=265",
    "./src/open-sea.js?v=265",
    "./src/boats.js?v=265",
    "./src/sea-creatures.js?v=265",
    "./src/diving.js?v=265",
    "./src/grottoes.js?v=265",
    "./src/spell-slots.js?v=265",
    "./src/settlements.js?v=265",
    "./src/skirmishes.js?v=265",
    "./src/travelers.js?v=265",
    "./src/diagnostic-probe.js?v=265",
    "./src/questing-beast.js?v=265",
    "./src/recitations.js?v=265",
    "./src/lore.js?v=265",
    "./src/glimpses.js?v=265",
    "./src/glimpse-render.js?v=265",
    "./src/glimpse-paint.js?v=265",
    "./src/glimpse-scenes.js?v=265",
    "./src/glimpse-horror.js?v=265",
    "./src/glimpse-legend.js?v=265",
    "./src/glimpse-hand.js?v=265",
    "./src/atlas-view.js?v=265",
    "./src/strange.js?v=265",
    "./src/linked-dungeons.js?v=265",
    "./src/digging.js?v=265",
    "./src/building.js?v=265",
    "./src/refuge-lands.js?v=265",
    "./src/tyrant-hunt.js?v=265",
    "./src/world-beasts.js?v=265",
    "./src/elders.js?v=265",
    "./src/far-array.js?v=265",
    "./src/combat-visuals.js?v=265",
    "./src/dungeon-framework.js?v=265",
    "./src/elites.js?v=265",
    "./src/random.js?v=265",
    "./src/types.js?v=265",
    "./src/story.js?v=265",
    "./src/foundry.js?v=265",
    "./src/world.js?v=265",
    "./src/deep-dungeons.js?v=265",
    "./src/scenes.js?v=265",
    "./src/arenas.js?v=265",
    "./src/items.js?v=265",
    "./src/combat.js?v=265",
    "./src/interactions.js?v=265",
    "./src/persistence.js?v=265",
    "./src/input.js?v=265",
    "./src/game.js?v=265",
    "./src/renderer.js?v=265",
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
