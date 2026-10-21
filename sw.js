const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}v259`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=259",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=259",
    "./src/proving-ground.js?v=259",
    "./src/proving-ground-fixtures.js?v=259",
    "./src/proving-ground-labs.js?v=259",
    "./src/dungeon-variation.js?v=259",
    "./src/dungeon-completion.js?v=259",
    "./src/enemy-patterns.js?v=259",
    "./src/monster-pack.js?v=259",
    "./src/monster-render.js?v=259",
    "./src/astral-worm.js?v=259",
    "./src/astral-worm-render.js?v=259",
    "./src/astral-worm-retreat.js?v=259",
    "./src/astral-worm-mount.js?v=259",
    "./src/lightning-giant-render.js?v=259",
    "./src/astral-encounters.js?v=259",
    "./src/astral-world-retreat.js?v=259",
    "./src/landscape.js?v=259",
    "./src/landscape-render.js?v=259",
    "./src/underlands.js?v=259",
    "./src/pattern-dungeons.js?v=259",
    "./src/relay-network.js?v=259",
    "./src/glyphs.js?v=259",
    "./src/echoes.js?v=259",
    "./src/constellation.js?v=259",
    "./src/water-traversal.js?v=259",
    "./src/open-sea.js?v=259",
    "./src/boats.js?v=259",
    "./src/sea-creatures.js?v=259",
    "./src/diving.js?v=259",
    "./src/grottoes.js?v=259",
    "./src/spell-slots.js?v=259",
    "./src/settlements.js?v=259",
    "./src/skirmishes.js?v=259",
    "./src/travelers.js?v=259",
    "./src/diagnostic-probe.js?v=259",
    "./src/questing-beast.js?v=259",
    "./src/recitations.js?v=259",
    "./src/lore.js?v=259",
    "./src/glimpses.js?v=259",
    "./src/glimpse-render.js?v=259",
    "./src/glimpse-paint.js?v=259",
    "./src/glimpse-scenes.js?v=259",
    "./src/glimpse-horror.js?v=259",
    "./src/glimpse-legend.js?v=259",
    "./src/glimpse-hand.js?v=259",
    "./src/atlas-view.js?v=259",
    "./src/strange.js?v=259",
    "./src/linked-dungeons.js?v=259",
    "./src/digging.js?v=259",
    "./src/tyrant-hunt.js?v=259",
    "./src/world-beasts.js?v=259",
    "./src/elders.js?v=259",
    "./src/far-array.js?v=259",
    "./src/combat-visuals.js?v=259",
    "./src/dungeon-framework.js?v=259",
    "./src/elites.js?v=259",
    "./src/random.js?v=259",
    "./src/types.js?v=259",
    "./src/story.js?v=259",
    "./src/foundry.js?v=259",
    "./src/world.js?v=259",
    "./src/deep-dungeons.js?v=259",
    "./src/scenes.js?v=259",
    "./src/arenas.js?v=259",
    "./src/items.js?v=259",
    "./src/combat.js?v=259",
    "./src/interactions.js?v=259",
    "./src/persistence.js?v=259",
    "./src/input.js?v=259",
    "./src/game.js?v=259",
    "./src/renderer.js?v=259",
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
