const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v251`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=251",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=251",
    "./src/proving-ground.js?v=251",
    "./src/proving-ground-fixtures.js?v=251",
    "./src/proving-ground-labs.js?v=251",
    "./src/dungeon-variation.js?v=251",
    "./src/dungeon-completion.js?v=251",
    "./src/enemy-patterns.js?v=251",
    "./src/monster-pack.js?v=251",
    "./src/monster-render.js?v=251",
    "./src/astral-worm.js?v=251",
    "./src/astral-worm-render.js?v=251",
    "./src/astral-worm-retreat.js?v=251",
    "./src/astral-worm-mount.js?v=251",
    "./src/astral-encounters.js?v=251",
    "./src/astral-world-retreat.js?v=251",
    "./src/landscape.js?v=251",
    "./src/landscape-render.js?v=251",
    "./src/underlands.js?v=251",
    "./src/pattern-dungeons.js?v=251",
    "./src/relay-network.js?v=251",
    "./src/glyphs.js?v=251",
    "./src/echoes.js?v=251",
    "./src/constellation.js?v=251",
    "./src/water-traversal.js?v=251",
    "./src/open-sea.js?v=251",
    "./src/boats.js?v=251",
    "./src/sea-creatures.js?v=251",
    "./src/diving.js?v=251",
    "./src/grottoes.js?v=251",
    "./src/spell-slots.js?v=251",
    "./src/settlements.js?v=251",
    "./src/skirmishes.js?v=251",
    "./src/travelers.js?v=251",
    "./src/diagnostic-probe.js?v=251",
    "./src/questing-beast.js?v=251",
    "./src/recitations.js?v=251",
    "./src/lore.js?v=251",
    "./src/glimpses.js?v=251",
    "./src/glimpse-render.js?v=251",
    "./src/glimpse-paint.js?v=251",
    "./src/glimpse-scenes.js?v=251",
    "./src/glimpse-horror.js?v=251",
    "./src/glimpse-legend.js?v=251",
    "./src/glimpse-hand.js?v=251",
    "./src/atlas-view.js?v=251",
    "./src/strange.js?v=251",
    "./src/linked-dungeons.js?v=251",
    "./src/digging.js?v=251",
    "./src/tyrant-hunt.js?v=251",
    "./src/world-beasts.js?v=251",
    "./src/elders.js?v=251",
    "./src/far-array.js?v=251",
    "./src/combat-visuals.js?v=251",
    "./src/dungeon-framework.js?v=251",
    "./src/elites.js?v=251",
    "./src/random.js?v=251",
    "./src/types.js?v=251",
    "./src/story.js?v=251",
    "./src/foundry.js?v=251",
    "./src/world.js?v=251",
    "./src/deep-dungeons.js?v=251",
    "./src/scenes.js?v=251",
    "./src/arenas.js?v=251",
    "./src/items.js?v=251",
    "./src/combat.js?v=251",
    "./src/interactions.js?v=251",
    "./src/persistence.js?v=251",
    "./src/input.js?v=251",
    "./src/game.js?v=251",
    "./src/renderer.js?v=251",
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
