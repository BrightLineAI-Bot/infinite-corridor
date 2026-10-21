const CACHE_PREFIX = "infinite-corridor-",
  CACHE = `${CACHE_PREFIX}r257-204a3837382b`,
  ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=r257-204a3837382b",
    "./assets/bestiary-atlas-v1.png",
    "./assets/elite-bestiary-atlas-v1-wide.png",
    "./assets/story-scenes-v1.png",
    "./manifest.webmanifest",
    "./icon.svg",
    "./src/main.js?v=r257-204a3837382b",
    "./src/proving-ground.js?v=r257-204a3837382b",
    "./src/proving-ground-fixtures.js?v=r257-204a3837382b",
    "./src/proving-ground-labs.js?v=r257-204a3837382b",
    "./src/dungeon-variation.js?v=r257-204a3837382b",
    "./src/dungeon-completion.js?v=r257-204a3837382b",
    "./src/enemy-patterns.js?v=r257-204a3837382b",
    "./src/monster-pack.js?v=r257-204a3837382b",
    "./src/monster-render.js?v=r257-204a3837382b",
    "./src/astral-worm.js?v=r257-204a3837382b",
    "./src/astral-worm-render.js?v=r257-204a3837382b",
    "./src/astral-worm-retreat.js?v=r257-204a3837382b",
    "./src/astral-worm-mount.js?v=r257-204a3837382b",
    "./src/lightning-giant-render.js?v=r257-204a3837382b",
    "./src/astral-encounters.js?v=r257-204a3837382b",
    "./src/astral-world-retreat.js?v=r257-204a3837382b",
    "./src/landscape.js?v=r257-204a3837382b",
    "./src/landscape-render.js?v=r257-204a3837382b",
    "./src/underlands.js?v=r257-204a3837382b",
    "./src/pattern-dungeons.js?v=r257-204a3837382b",
    "./src/relay-network.js?v=r257-204a3837382b",
    "./src/glyphs.js?v=r257-204a3837382b",
    "./src/echoes.js?v=r257-204a3837382b",
    "./src/constellation.js?v=r257-204a3837382b",
    "./src/water-traversal.js?v=r257-204a3837382b",
    "./src/open-sea.js?v=r257-204a3837382b",
    "./src/boats.js?v=r257-204a3837382b",
    "./src/sea-creatures.js?v=r257-204a3837382b",
    "./src/diving.js?v=r257-204a3837382b",
    "./src/grottoes.js?v=r257-204a3837382b",
    "./src/spell-slots.js?v=r257-204a3837382b",
    "./src/settlements.js?v=r257-204a3837382b",
    "./src/skirmishes.js?v=r257-204a3837382b",
    "./src/travelers.js?v=r257-204a3837382b",
    "./src/diagnostic-probe.js?v=r257-204a3837382b",
    "./src/questing-beast.js?v=r257-204a3837382b",
    "./src/recitations.js?v=r257-204a3837382b",
    "./src/lore.js?v=r257-204a3837382b",
    "./src/glimpses.js?v=r257-204a3837382b",
    "./src/glimpse-render.js?v=r257-204a3837382b",
    "./src/glimpse-paint.js?v=r257-204a3837382b",
    "./src/glimpse-scenes.js?v=r257-204a3837382b",
    "./src/glimpse-horror.js?v=r257-204a3837382b",
    "./src/glimpse-legend.js?v=r257-204a3837382b",
    "./src/glimpse-hand.js?v=r257-204a3837382b",
    "./src/atlas-view.js?v=r257-204a3837382b",
    "./src/strange.js?v=r257-204a3837382b",
    "./src/linked-dungeons.js?v=r257-204a3837382b",
    "./src/digging.js?v=r257-204a3837382b",
    "./src/tyrant-hunt.js?v=r257-204a3837382b",
    "./src/world-beasts.js?v=r257-204a3837382b",
    "./src/elders.js?v=r257-204a3837382b",
    "./src/far-array.js?v=r257-204a3837382b",
    "./src/combat-visuals.js?v=r257-204a3837382b",
    "./src/dungeon-framework.js?v=r257-204a3837382b",
    "./src/elites.js?v=r257-204a3837382b",
    "./src/random.js?v=r257-204a3837382b",
    "./src/types.js?v=r257-204a3837382b",
    "./src/story.js?v=r257-204a3837382b",
    "./src/foundry.js?v=r257-204a3837382b",
    "./src/world.js?v=r257-204a3837382b",
    "./src/deep-dungeons.js?v=r257-204a3837382b",
    "./src/scenes.js?v=r257-204a3837382b",
    "./src/arenas.js?v=r257-204a3837382b",
    "./src/items.js?v=r257-204a3837382b",
    "./src/combat.js?v=r257-204a3837382b",
    "./src/interactions.js?v=r257-204a3837382b",
    "./src/persistence.js?v=r257-204a3837382b",
    "./src/input.js?v=r257-204a3837382b",
    "./src/game.js?v=r257-204a3837382b",
    "./src/renderer.js?v=r257-204a3837382b",
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
